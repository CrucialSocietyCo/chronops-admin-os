import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    let user = await serverSupabaseUser(event)

    // If cookie auth failed, try Bearer token from header
    if (!user) {
        const authHeader = getRequestHeader(event, 'Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const { data, error } = await client.auth.getUser(token) // Verify token manually
            if (data?.user) {
                user = data.user
            }
        }
    }

    try {
        console.log('[Messages POST] Starting request processing...')

        const body = await readBody(event)
        console.log('[Messages POST] Body:', JSON.stringify(body))

        if (!body.content || !body.sender) {
            throw new Error('Missing content or sender in body')
        }

        const senderName = body.sender

        // 0. Enforce Moderation (New Layer)
        await enforceModeration(event, body)

        // 1. Get Context
        const { data: activeEvent, error: eventError } = await client
            .from('events')
            .select('id')
            .eq('is_active', true)
            .single()

        if (eventError) console.error('[Messages POST] Event Error (Non-fatal):', eventError)
        console.log('[Messages POST] Active Event ID:', activeEvent?.id)

        const { data: settings } = await client.from('chat_settings').select('event_mode').single()
        const currentMode = settings?.event_mode || 'Live Event'

        // 2. Room Resolution (Optional)
        let roomId = null
        try {
            const { data: room } = await client
                .from('rooms')
                .select('id')
                .eq('slug', 'general')
                .single()

            if (room) {
                roomId = room.id
            } else {
                console.warn('[Messages POST] General room not found. Proceeding without Room ID.')
            }
        } catch (roomErr) {
            console.warn('[Messages POST] Room lookup failed (non-fatal):', roomErr)
        }
        console.log('[Messages POST] Target Room ID:', roomId)

        // 3. User Resolution
        let userId = null

        if (user) {
            console.log('[Messages POST] Auth User Detected:', user.id)
            const { data: publicUser } = await client.from('users').select('id').eq('supabase_user_id', user.id).single()

            if (publicUser) {
                userId = publicUser.id
            } else {
                console.log('[Messages POST] Auth User not linked. Checking by email...')
                // Fallback: Check if user exists by email but isn't linked yet
                // Use Service Role to avoid RLS issues during linking
                const serviceClient = serverSupabaseServiceRole(event)

                if (serviceClient) {
                    const { data: existingUser } = await serviceClient
                        .from('users')
                        .select('id')
                        .eq('email', user.email)
                        .single()

                    if (existingUser) {
                        console.log('[Messages POST] Linking Auth User to existing profile:', existingUser.id)
                        await serviceClient
                            .from('users')
                            .update({ supabase_user_id: user.id })
                            .eq('id', existingUser.id)

                        userId = existingUser.id
                    }
                }

                // If still no userId, create new profile
                if (!userId) {
                    console.log('[Messages POST] Creating Public Profile for Admin...')
                    const { data: newPub, error: pubError } = await client.from('users').insert({
                        supabase_user_id: user.id,
                        name: 'Admin',
                        email: user.email,
                        is_admin: true
                    }).select().single()

                    if (pubError) console.error('[Messages POST] Public Profile Creation Error:', pubError)
                    userId = newPub?.id
                }
            }
        } else {
            console.log('[Messages POST] Guest User Detected. Resolving Guest Profile...')
            // Use time-based suffix to avoid collisions if multiple guests choose same name
            const timestamp = Date.now().toString().slice(-4)
            const sanitizedName = senderName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'guest'
            const cleanEmail = `guest_${sanitizedName}_${timestamp}@chronops.local`

            // Check if user exists (Reader Client is fine for SELECT if public policy exists)
            const { data: guestUser } = await client.from('users').select('id').eq('email', cleanEmail).single()

            if (guestUser) {
                userId = guestUser.id
            } else {
                // INSERT requires Service Role because Public cannot INSERT into users
                // However, serverSupabaseServiceRole THROWS if the key is missing.
                // We must catch that specific error to allow fallback to Public Insert (if RLS allows it).
                let serviceClient = null
                try {
                    serviceClient = serverSupabaseServiceRole(event)
                } catch (e: any) {
                    console.warn('[Messages POST] Service Role check failed (Key missing?):', e.message)
                }

                if (!serviceClient) {
                    console.warn('[Messages POST] Service Role unavailable. Attempting Public Insert (Requires RLS Policy)...')
                    // Fallback to standard client
                    const { data: newGuest, error: guestError } = await client.from('users').insert({
                        name: senderName,
                        email: cleanEmail,
                        supabase_user_id: null
                    }).select().single()

                    if (guestError) {
                        console.error('[Messages POST] Guest Creation Error (Public):', guestError)
                        // This will flow down to "Failed to resolve User ID"
                    } else {
                        userId = newGuest?.id
                    }
                } else {
                    const { data: newGuest, error: guestError } = await serviceClient.from('users').insert({
                        name: senderName,
                        email: cleanEmail,
                        supabase_user_id: null
                    }).select().single()

                    if (guestError) console.error('[Messages POST] Guest Creation Error (ServiceRole):', guestError)
                    userId = newGuest?.id
                }
            }
        }

        console.log('[Messages POST] Final Resolved User ID:', userId)
        if (!userId) throw new Error('Failed to resolve User ID')

        // 4. Insert Message
        const payload = {
            room_id: roomId, // Can be null now
            user_id: userId,
            content: body.content,
            event_id: activeEvent?.id || null, // Active Event Link
            chat_mode: currentMode,
            history_is_visible: true
        }
        console.log('[Messages POST] Attempting Insert:', JSON.stringify(payload))

        const { data, error } = await client
            .from('messages')
            .insert(payload)
            .select()
            .single()

        if (error) {
            console.error('[Messages POST] INSERT FAILED:', error)
            throw error
        }

        console.log('[Messages POST] Success:', data.id)

        // 5. Update Last Seen (Async - Fire and Forget)
        try {
            const serviceClient = serverSupabaseServiceRole(event)
            if (serviceClient) {
                await serviceClient.from('users')
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq('id', userId)
            }
        } catch (updateErr) {
            console.error('[Messages POST] Failed to update last_seen_at:', updateErr)
        }

        // LOG ANALYTICS EVENT (Fire and Forget)
        try {
            await client.from('app_events').insert({
                event_type: 'message_sent',
                user_id: userId,
                room_id: roomId?.toString(),
                payload: {
                    message_id: data.id,
                    content: body.content,
                    sender: senderName,
                    is_admin: !!user,
                    client_id: getRequestHeader(event, 'x-client-id') || 'unknown' // IMPORTANT: Used for Rate Limiting
                }
            })
        } catch (logErr) {
            console.error('[Messages POST] Failed to log analytics event:', logErr)
        }

        return {
            ...data,
            sender: senderName,
            isAdmin: !!user
        }

    } catch (err: any) {
        console.error('[Messages POST] CRITICAL FAILURE:', err)
        throw createError({
            statusCode: 500,
            statusMessage: err.message || 'Internal Server Error',
            data: { message: err.message, details: err }
        })
    }
})


