import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Admin Check
    const { data: userData } = await client.from('users').select('is_admin').eq('supabase_user_id', user.id).single()
    if (!userData?.is_admin) {
        throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const { error } = await client.from('pinned_items').delete().eq('id', id)

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true }
})
