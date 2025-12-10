import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const urlQuery = getQuery(event) // Renamed to avoid conflict with Supabase query builder
    const since = urlQuery.since ? parseInt(urlQuery.since as string) : 0

    // 1. Get Context (Active Event) - Just for history settings, not filtering
    console.log('[Messages GET] Starting Fetch...')

    // We still check the event to respect "show_chat_history" boolean
    const { data: activeEvent } = await client
        .from('events')
        .select('id, show_chat_history')
        .eq('is_active', true)
        .single()

    console.log('[Messages GET] Active Event Context:', activeEvent ? `ID ${activeEvent.id}` : 'None')

    // 2. Get General Room ID
    const { data: room } = await client.from('rooms').select('id').eq('slug', 'general').single()
    const roomId = room?.id

    let messagesQueryBuilder = client
        .from('messages')
        .select('*') // REMOVED users(name) join to fix PGRST200
        .order('created_at', { ascending: false })
        .limit(100)

    // Filter by Room ID if available (Safety)
    if (roomId) {
        messagesQueryBuilder = messagesQueryBuilder.eq('room_id', roomId)
    }

    if (activeEvent) {
        // Only strictly hide history if the event EXPLICITLY says "Hide History"
        if (!activeEvent.show_chat_history && since === 0) {
            console.warn('[Messages GET] History Hidden by Event Settings')
            return []
        }
    }

    // REMOVED: Filtering by event_id. 
    // This allows messages to persist across different events (Single Chatroom model).

    if (since > 0) {
        const sinceDate = new Date(since).toISOString()
        messagesQueryBuilder = messagesQueryBuilder.gt('created_at', sinceDate)
    }

    const { data: messages, error } = await messagesQueryBuilder

    if (error) {
        console.error('[Messages GET] Supabase Error:', error)
        return []
    }

    console.log(`[Messages GET] Found ${messages?.length || 0} messages.`)

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
