import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

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
        } else {
            console.log('[Messages POST] Guest User Detected. Resolving Guest Profile...')
            // Use time-based suffix to avoid collisions if multiple guests choose same name
            const timestamp = Date.now().toString().slice(-4)
            const sanitizedName = senderName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'guest'
            const guestEmail = `guest_${sanitizedName}_${timestamp}@chronops.local`

            // We simplify logic: Always create a new "Session User" for this specific chat instance?
            // Actually, let's keep it consistent: name -> email mapping
            // But without the space!
            const cleanEmail = `guest_${sanitizedName}@chronops.local`

            const { data: guestUser } = await client.from('users').select('id').eq('email', cleanEmail).single()
            if (guestUser) {
                userId = guestUser.id
            } else {
                const { data: newGuest, error: guestError } = await client.from('users').insert({
                    name: senderName,
                    email: cleanEmail,
                    supabase_user_id: null
                }).select().single()

                if (guestError) console.error('[Messages POST] Guest Creation Error:', guestError)
                userId = newGuest?.id
            }
        }

        console.log('[Messages POST] Final Resolved User ID:', userId)
        if (!userId) throw new Error('Failed to resolve User ID')

        // 4. Insert Message
        const payload = {
            room_id: roomId, // Can be null now
            user_id: userId,
            content: body.content,
            event_id: activeEvent?.id || null,
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


