import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const roomId = getRouterParam(event, 'roomId')
    const client = await serverSupabaseClient(event)

    // Get room ID from slug if needed, but assuming ID for now based on route
    // If route is /api/rooms/:slug/messages, we need to lookup room first
    // Let's assume the frontend passes the ID for now, or we lookup by ID

    const { data, error } = await client
        .from('messages')
        .select('*, user:users(name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch messages',
        })
    }

    return data.reverse() // Return oldest first
})
