import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const urlQuery = getQuery(event) // Renamed to avoid conflict with Supabase query builder
    const since = urlQuery.since ? parseInt(urlQuery.since as string) : 0

    // 1. Get Active Event
    const { data: activeEvent } = await client
        .from('events')
        .select('id, show_chat_history')
        .eq('is_active', true)
        .single()

    // Default to handling 'no event' logic (maybe show nothing or general?)
    // For now, if no active event, we might show nothing or general messages (event_id is null)
    // Let's assume if no event, we show General room messages without event_id

    let messagesQueryBuilder = client
        .from('messages')
        .select('*') // REMOVED users(name) join to fix PGRST200
        .order('created_at', { ascending: false })
        .limit(100)

    if (activeEvent) {
        // If history is hidden AND it's a fresh load (since=0), return empty.
        // If since > 0, it means the client is polling for NEW messages (Realtime Context), so let them through.
        if (!activeEvent.show_chat_history && since === 0) {
            return []
        }
        messagesQueryBuilder = messagesQueryBuilder.eq('event_id', activeEvent.id)
    } else {
        // No active event: Show messages with NULL event_id
        messagesQueryBuilder = messagesQueryBuilder.is('event_id', null)
    }

    if (since > 0) {
        const sinceDate = new Date(since).toISOString()
        messagesQueryBuilder = messagesQueryBuilder.gt('created_at', sinceDate)
    }

    const { data: messages, error } = await messagesQueryBuilder

    if (error) {
        console.error('Error fetching messages:', error)
        return []
    }

    // DEBUG LOG
    if (since > 0) {
        console.log(`[Messages API] Polling since ${new Date(since).toISOString()} (Timestamp: ${since}). Found: ${messages?.length || 0}`)
        if (messages && messages.length > 0) {
            console.log(`[Messages API] First found: ${messages[0].created_at}`)
        }
    }

    if (!messages || messages.length === 0) return []

    // 3. User Mapping (Manual Join fallback)
    const userIds = [...new Set(messages.map((m: any) => m.user_id).filter(Boolean))]
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

    // Transform for frontend
    return messages.reverse().map((msg: any) => ({
        id: msg.id,
        sender: userMap[msg.user_id]?.name || 'Unknown', // Use manual map
        isAdmin: userMap[msg.user_id]?.isAdmin === true,
        content: msg.content,
        color: 'white',
        type: 'user',
        created_at: msg.created_at,
        chat_mode: msg.chat_mode
    }))
})
