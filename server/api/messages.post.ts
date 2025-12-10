import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)
    const body = await readBody(event)
    console.log('[POST /api/messages] Body:', body)

    if (!body.content || !body.sender) {
        return { error: 'Missing content or sender' }
    }

    // 1. Get Context (Active Event & Chat Mode)
    // We fetch this fresh to ensure accuracy and security
    const { data: activeEvent } = await client
        .from('events')
        .select('id')
        .eq('is_active', true)
        .single()

    const { data: settings } = await client
        .from('chat_settings')
        .select('event_mode')
        .single()

    const currentEventId = activeEvent?.id || null
    const currentMode = settings?.event_mode || 'Live Event'

    // 2. Get or Create Default Room
    let { data: room, error: roomError } = await client
        .from('rooms')
        .select('id')
        .eq('slug', 'general')
        .single()

    if (!room) {
        console.log('Creating default room...')
        const { data: newRoom, error: createRoomError } = await client
            .from('rooms')
            .insert({
                name: 'General',
                slug: 'general',
                is_private: false
            })
            .select()
            .single()

        if (createRoomError) {
            console.error('Failed to create room:', createRoomError)
            return { error: createRoomError }
        }
        room = newRoom
    }

    // 2. Resolve User ID
    let userId = null
    let senderName = body.sender

    if (user) {
        // Authenticated Admin
        const { data: publicUser } = await client
            .from('users')
            .select('id')
            .eq('supabase_user_id', user.id)
            .single()

        if (publicUser) {
            userId = publicUser.id
        } else {
            // Create public user for Admin if missing
            const { data: newPublicUser, error: createUserError } = await client
                .from('users')
                .insert({
                    supabase_user_id: user.id,
                    name: 'Admin', // Force Admin name or use metadata
                    email: user.email,
                    is_admin: true
                })
                .select()
                .single()

            if (newPublicUser) userId = newPublicUser.id
        }
    } else {
        // Guest User
        // Use the sender name from the request to find/create a Guest User?
        // UX Issue: If "Guest1" and "Guest2" both chat, we don't want to merge them if possible, 
        // OR we just use a generic "Guest" user for ALL unauthenticated traffic.
        // Given the retro-chat app just sends a string, mapping to a single "Guest" DB user is safest for foreign keys, 
        // but then we lose the display name in the DB relational model.
        // However, we can store the display name in the `content` or assume `messages` table doesn't have `sender_name`.
        // Wait, the `messages` table DOES NOT have sender_name.
        // So if we use a single "Guest" user, all messages will look like they come from "Guest".

        // To support multiple guest names, we'd need to create a new user record for EACH new guest name?
        // That's spammy but accurate to the schema. 
        // Let's find/create a user with email `guest_{sanitized_name}@chronops.local`.

        const sanitizedName = senderName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'guest'
        const guestEmail = `guest_${sanitizedName}@chronops.local`

        const { data: guestUser } = await client
            .from('users')
            .select('id')
            .eq('email', guestEmail)
            .single()

        if (guestUser) {
            userId = guestUser.id
        } else {
            const { data: newGuest, error: createGuestError } = await client
                .from('users')
                .insert({
                    name: senderName,
                    email: guestEmail,
                    supabase_user_id: null // Null for guests
                })
                .select()
                .single()

            if (newGuest) userId = newGuest.id
            else console.error('Failed to create guest:', createGuestError)
        }
    }

    if (!userId) {
        return { error: 'Failed to resolve user ID' }
    }

    // 3. Insert Message
    const { data, error } = await client
        .from('messages')
        .insert({
            room_id: room.id,
            content: body.content,
            event_id: activeEvent?.id || null,
            chat_mode: currentMode,
            history_is_visible: activeEvent ? activeEvent.show_chat_history : true
        })
        .select()
        .single()

    if (error) {
        console.error('Error sending message:', error)
        return { error }
    }

    // Transform for frontend
    return {
        ...data,
        sender: senderName // We resolved this earlier
    }
})
