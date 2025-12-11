import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // Admin Only
    if (!user) throw createError({ statusCode: 401 })

    const { data: viewer } = await client.from('users').select('is_admin').eq('supabase_user_id', user.id).single()
    if (!viewer?.is_admin) throw createError({ statusCode: 403 })

    // Validate body (basic)
    const updates = {
        rate_limit_window_ms: body.rate_limit_window_ms,
        max_messages_per_window: body.max_messages_per_window,
        auto_mute_duration_ms: body.auto_mute_duration_ms,
        max_message_length: body.max_message_length,
        bad_words: body.bad_words,
        updated_at: new Date(),
        updated_by: user.id
    }

    const { data, error } = await client
        .from('moderation_settings')
        .update(updates)
        .eq('id', 1)
        .select()
        .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return data
})
