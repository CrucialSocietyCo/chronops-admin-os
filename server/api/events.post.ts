import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    if (!body.name || !body.window_title) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Event name and Window Title are required'
        })
    }

    const { data, error } = await client
        .from('events')
        .insert({
            name: body.name,
            window_title: body.window_title,
            show_ads: body.show_ads ?? body.show_sponsored ?? true,
            status: 'scheduled',
            show_chat_history: true,
            is_active: false
        })
        .select()
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }

    return data
})
