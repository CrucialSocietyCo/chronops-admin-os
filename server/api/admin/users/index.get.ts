import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    const { data, error } = await client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch users',
        })
    }

    return data
})
