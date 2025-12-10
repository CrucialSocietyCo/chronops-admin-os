import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const id = event.context.params?.id

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID required' })
    }

    // 1. Fetch messages for the event
    const { data: messages, error } = await client
        .from('messages')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: true })

    if (error) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }

    // 2. Fetch users to map names manually (avoiding complex joins for now)
    const userIds = [...new Set(messages.map(m => m.user_id))]
    let usersMap = {}

    if (userIds.length > 0) {
        const { data: users } = await client
            .from('users')
            .select('id, name')
            .in('id', userIds)

        if (users) {
            users.reduce((acc, user) => {
                acc[user.id] = user.name
                return acc
            }, usersMap)
        }
    }

    // 3. Transform for Export
    const exportData = messages.map(msg => ({
        timestamp: msg.created_at,
        sender: usersMap[msg.user_id] || 'Unknown',
        mode: msg.chat_mode,
        content: msg.content
    }))

    return exportData
})
