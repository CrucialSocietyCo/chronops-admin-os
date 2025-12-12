import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const adminClient = serverSupabaseServiceRole(event) // Use Service Role for global context
    const urlQuery = getQuery(event)
    const since = urlQuery.since ? parseInt(urlQuery.since as string) : 0
    const sessionId = getRequestHeader(event, 'x-session-id') // Get caller session ID

    // 1. Get Context (Active Event) - Use Admin Client to bypass RLS on 'events' table
    console.log('[Messages GET] Starting Fetch...')

    // DEBUG LOG
    // Debug Log Removed for Production Safety

    // We still check the event to respect "show_chat_history" boolean
    const { data: activeEvent } = await adminClient
        .from('events')
        .select('id, show_chat_history')
        .eq('is_active', true)
        .single()

    console.log('[Messages GET] Active Event Context:', activeEvent ? `ID ${activeEvent.id}` : 'None')

    // 2. Get General Room ID - (DEPRECATED: We no longer filter by room)
    // const { data: room } = await client.from('rooms').select('id').eq('slug', 'general').single()
    // const roomId = room?.id

    let messagesQueryBuilder = client
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

    // REMOVED: Safety filter by room
    // if (roomId) {
    //     messagesQueryBuilder = messagesQueryBuilder.eq('room_id', roomId)
    // }

    if (activeEvent) {
        // If history is hidden AND it's a fresh load (since=0), return empty (Security Feature)
        if (!activeEvent.show_chat_history && since === 0) {
            console.warn('[Messages GET] History Hidden by Event Settings')
            return []
        }

        // SCOPE TO ACTIVE EVENT
        console.log(`[Messages GET] Filtering by Event ID: ${activeEvent.id}`)
        messagesQueryBuilder = messagesQueryBuilder.eq('event_id', activeEvent.id)
    } else {
        // No active event: Show messages with NULL event_id (or show nothing?)
        // If we want "New Event = New History", then "No Event" should probably show "No Event" messages or nothing.
        console.log('[Messages GET] No Active Event. Filtering by event_id IS NULL')
        messagesQueryBuilder = messagesQueryBuilder.is('event_id', null)
    }

    if (since > 0) {
        const sinceDate = new Date(since).toISOString()
        messagesQueryBuilder = messagesQueryBuilder.gt('created_at', sinceDate)
    }

    const { data: messages, error } = await messagesQueryBuilder

    if (error) {
        // log removed
        console.error('[Messages GET] Supabase Error:', error)
        return []
    }

    // log removed
    if (messages && messages.length > 0) {
        // log first message removed
    }

    console.log(`[Messages GET] Found ${messages?.length || 0} messages.`)

    if (!messages || messages.length === 0) return []

    // 3. User Mapping (Manual Join fallback)
    const userIds = [...new Set(messages.map((m: any) => {
        // Collect normal user_id AND original_user_id from payload if present
        return [m.user_id, m.payload?.original_user_id].filter(Boolean)
    }).flat())]

    let userMap: Record<number, { name: string, isAdmin: boolean }> = {}

    if (userIds.length > 0) {
        const { data: usersData } = await client
            .from('users')
            .select('id, name, is_admin')
            .in('id', userIds)

        if (usersData) {
            usersData.forEach((u: any) => {
                userMap[u.id] = { name: u.name, isAdmin: u.is_admin }
            })
        }
    }

    // 4. Fetch Reactions
    const messageIds = messages.map(m => m.id)
    let reactionsData: any[] = []

    if (messageIds.length > 0) {
        const { data } = await client
            .from('chat_message_reactions')
            .select('message_id, reaction_type, session_id')
            .in('message_id', messageIds)

        if (data) reactionsData = data
    }

    // Transform for frontend
    return messages.reverse().map((msg: any) => {
        let senderName: string
        if (msg.type === 'system' && msg.payload?.original_user_id) {
            const originalUser = userMap[msg.payload.original_user_id]?.name || 'User'
            senderName = `Ai Rewrite for ${originalUser}`
        } else if (msg.type === 'system') {
            senderName = 'System'
        } else {
            senderName = userMap[msg.user_id]?.name || 'Unknown'
        }

        return {
            id: msg.id,
            sender: senderName,
            isAdmin: userMap[msg.user_id]?.isAdmin === true,
            content: msg.content,
            color: 'white',
            type: msg.type || 'user',
            payload: msg.payload,
            created_at: msg.created_at,
            chat_mode: msg.chat_mode,
            reactions: processReactions(msg.id, reactionsData, sessionId)
        }
    })
})

function processReactions(msgId: any, allReactions: any[], mySessionId?: string) {
    const msgReactions = allReactions.filter(r => r.message_id === msgId)
    const counts: Record<string, number> = {}
    const myReactions: string[] = []

    msgReactions.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1
        if (mySessionId && r.session_id === mySessionId) {
            myReactions.push(r.reaction_type)
        }
    })

    return { counts, myReactions }
}
