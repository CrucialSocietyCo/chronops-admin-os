import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    // Admin Check
    let isAdmin = false
    if (user) {
        const { data } = await client.from('users').select('is_admin').eq('supabase_user_id', user.id).single()
        isAdmin = !!data?.is_admin
    }

    const query = client.from('pinned_items').select('*').order('order_index', { ascending: true })

    // If not admin, only show active and valid time range
    if (!isAdmin) {
        const now = new Date().toISOString()
        query
            .eq('is_active', true)
            .or(`start_time.is.null,start_time.lte.${now}`)
            .or(`end_time.is.null,end_time.gte.${now}`)
    }

    const { data, error } = await query

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    return { items: data }
})
