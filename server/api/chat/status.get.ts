import { serverSupabaseClient } from '#supabase/server'
import { applyScheduledEventMode } from '../../utils/scheduling'
import { withPublicAestheticAliases } from '../../utils/aesthetics'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const scheduledSettings = await applyScheduledEventMode(event)

    if (scheduledSettings) {
        return withPublicAestheticAliases(scheduledSettings)
    }

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

    return withPublicAestheticAliases(data)
})
