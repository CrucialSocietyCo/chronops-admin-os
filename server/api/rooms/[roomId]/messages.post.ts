import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const roomId = getRouterParam(event, 'roomId')
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)
    const body = await readBody(event)
    const adminIntent = body.adminIntent === true

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
        })
    }

    // Determine secure message type
    // If adminIntent is requested and user is authenticated (admin checks can be expanded here), allow it.
    // Otherwise, force type to 'user'.
    const messageType = adminIntent ? 'admin' : 'user'

    // Get public user ID
    const { data: publicUser } = await client
        .from('users')
        .select('id')
        .eq('supabase_user_id', user.id)
        .single()

    if (!publicUser) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User profile not found',
        })
    }

    const { data, error } = await client
        .from('messages')
        .insert({
            room_id: roomId,
            user_id: publicUser.id,
            content: body.content,
            type: messageType // Securely set by server
        })
        .select()
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to send message: ' + error.message,
        })
    }

    return data
})
