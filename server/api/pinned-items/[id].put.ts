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

    const body = await readBody(event)

    // Exclude ID from update payload
    const { id: _, created_at, updated_at, ...updates } = body

    const { data, error } = await client
        .from('pinned_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    return { item: data }
})
