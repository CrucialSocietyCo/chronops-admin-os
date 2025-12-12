import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    // Fetch recent user joins
    const { data: newUsers } = await client
        .from('users')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    // Fetch recent messages
    const { data: recentMessages } = await client
        .from('messages')
        .select('id, user_id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(10) // fetch a few more to filter dupes if needed

    // Get user names for messages
    const userIds = [...new Set(recentMessages?.map(m => m.user_id) || [])]
    let userMap: Record<number, string> = {}

    if (userIds.length > 0) {
        const { data: users } = await client
            .from('users')
            .select('id, name')
            .in('id', userIds)

        users?.forEach(u => userMap[u.id] = u.name)
    }

    // Synthesize Activity Events
    const userEvents = (newUsers || []).map(u => ({
        type: 'user_join',
        time: u.created_at,
        user: u.name || `User ${u.id}`,
        action: 'joined the platform'
    }))

    const messageEvents = (recentMessages || []).map(m => ({
        type: 'message',
        time: m.created_at,
        user: userMap[m.user_id] || 'Unknown',
        action: `sent: "${m.content.substring(0, 20)}${m.content.length > 20 ? '...' : ''}"`
    }))

    // Admin Logs (Optional expansion point)
    // const adminEvents = ...

    // Combine and Sort
    const allActivity = [...userEvents, ...messageEvents]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10) // Top 10

    return allActivity
})
