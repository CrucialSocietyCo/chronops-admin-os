import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    const { data, error } = await client
        .from('rooms')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: true })

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch rooms',
        })
    }

    return data
})
