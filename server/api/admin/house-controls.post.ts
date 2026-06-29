import { serverSupabaseClient } from '#supabase/server'
import { normalizeAdminBadge, normalizeBorderStyle, normalizeColorTheme } from '../../utils/aesthetics'

const defaultChatSettings = {
    is_chat_enabled: true,
    maintenance_mode: false,
    is_scheduling_enabled: false,
    window_title: 'Retro Chat',
    max_message_length: 500,
    max_messages_per_minute: 30,
    event_mode: 'Live Event',
    slow_mode_interval: 0,
    burst_protection_enabled: false,
    max_burst_messages: 5,
    auto_mute_enabled: false,
    auto_mute_violations: 3,
    allow_links: false,
    allow_pixel_reactions: true,
    profanity_filter_enabled: true,
    admin_highlight_enabled: false,
    crowd_surge_detection_enabled: false,
    surge_threshold: 100,
    spam_burst_auto_mute: false,
    inactivity_cleanup_enabled: false,
    inactivity_cleanup_hours: 24,
    window_border_style: 'system95',
    color_theme: 'teal_base',
    scanline_intensity: 0,
    admin_badge_style: 'star_icon',
    scheduled_system_messages_enabled: false,
    auto_mode_transition_enabled: false
}

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // Remove ID from body to avoid updating it if it's not meant to be changed or if it's missing
    const { id, ...updates } = body
    const normalizedUpdates = { ...updates }
    if ('window_border_style' in normalizedUpdates) {
        normalizedUpdates.window_border_style = normalizeBorderStyle(normalizedUpdates.window_border_style)
    }
    if ('color_theme' in normalizedUpdates) {
        normalizedUpdates.color_theme = normalizeColorTheme(normalizedUpdates.color_theme)
    }
    if ('admin_badge_style' in normalizedUpdates) {
        normalizedUpdates.admin_badge_style = normalizeAdminBadge(normalizedUpdates.admin_badge_style)
    }

    // The singleton settings row may not exist yet; maybeSingle intentionally handles
    // the valid "0 rows" case without PostgREST PGRST116.
    const { data: existing, error: existingError } = await client
        .from('chat_settings')
        .select('id')
        .limit(1)
        .maybeSingle()

    if (existingError) {
        console.error('Error finding existing chat settings:', existingError)
        throw createError({
            statusCode: 500,
            statusMessage: existingError.message || 'Failed to find chat settings',
        })
    }

    let query = client.from('chat_settings')

    try {
        if (existing) {
            // Update existing
            const { data, error } = await query
                .update(normalizedUpdates)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Error updating settings:', error)
                throw error
            }
            return data
        } else {
            // Insert a default row plus the requested updates when settings have not
            // been created yet, so saves create the missing singleton instead of crashing.
            const { data, error } = await query
                .insert({ ...defaultChatSettings, ...normalizedUpdates })
                .select()
                .single()

            if (error) {
                console.error('Error inserting settings:', error)
                throw error
            }
            return data
        }
    } catch (e: any) {
        console.error('Failed to save chat settings:', e)
        throw createError({
            statusCode: 500,
            statusMessage: e.message || 'Failed to save settings',
        })
    }
})
