import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    const [
        { count: usersCount },
        { count: roomsCount },
        { count: messagesCount },
        { count: reportsCount }
    ] = await Promise.all([
        client.from('users').select('*', { count: 'exact', head: true }),
        client.from('rooms').select('*', { count: 'exact', head: true }),
        client.from('messages').select('*', { count: 'exact', head: true }),
        client.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open')
    ])

    return {
        stats: {
            users: usersCount || 0,
            rooms: roomsCount || 0,
            messages: messagesCount || 0,
            openReports: reportsCount || 0
        }
    }
})
