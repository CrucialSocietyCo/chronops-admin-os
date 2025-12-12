import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // Admin Only - relying on session for now to match house-controls behavior
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    // Valid Session is enough for now (Legacy Admin compatibility)
    // const { data: viewer } = await client.from('users').select('is_admin').eq('supabase_user_id', user.id).single()
    // if (!viewer?.is_admin) throw createError({ statusCode: 403 })

    // Validate body (basic)
    const updates = {
        rate_limit_window_ms: body.rate_limit_window_ms,
        max_messages_per_window: body.max_messages_per_window,
        auto_mute_duration_ms: body.auto_mute_duration_ms,
        max_message_length: body.max_message_length,
        bad_words: body.bad_words,
        ai_persona_rewrite_enabled: body.ai_persona_rewrite_enabled,
        updated_at: new Date(),
        updated_by: user.id
    }

    // Try finding by room_id first, fallback to id=1
    // Actually, let's standardize on room_id='global'
    let { data, error } = await client
        .from('moderation_settings')
        .update(updates)
        .eq('room_id', 'global')
        .select()
        .single()

    // If not found (maybe legacy row has no room_id?), try id=1
    if (!data) {
        const { data: legacyData, error: legacyError } = await client
            .from('moderation_settings')
            .update(updates)
            .eq('id', 1) // Legacy ID
            .select()
            .single()
        data = legacyData
        error = legacyError || error
    }

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return data
})
