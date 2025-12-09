import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    const { data, error } = await client
        .from('chat_settings')
        .select('*')
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch chat settings',
        })
    }

    return data
})
