import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)
    const body = await readBody(event)

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
        })
    }

    // Get public user ID for creator
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
        .from('rooms')
        .insert({
            ...body,
            created_by: publicUser.id
        })
        .select()
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create room',
        })
    }

    return data
})
