import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)

    // Admin Only
    if (!user) throw createError({ statusCode: 401 })

    const { data: viewer } = await client.from('users').select('is_admin').eq('supabase_user_id', user.id).single()
    if (!viewer?.is_admin) throw createError({ statusCode: 403 })

    const { data: settings, error } = await client
        .from('moderation_settings')
        .select('*')
        .eq('id', 1)
        .single()

    // If table missing or row missing, return defaults
    if (error || !settings) {
        console.warn('Failed to fetch moderation settings (using defaults):', error?.message)
        return {
            rate_limit_window_ms: 10000,
            max_messages_per_window: 5,
            auto_mute_duration_ms: 300000,
            bad_words: ['badword1', 'spam', 'crypto', 'nft'],
            max_message_length: 500
        }
    }

    return settings
})
