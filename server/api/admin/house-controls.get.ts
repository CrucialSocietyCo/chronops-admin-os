import { serverSupabaseClient } from '#supabase/server'
import { normalizeAestheticSettings } from '../../utils/aesthetics'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    let { data, error } = await client
        .from('chat_settings')
        .select('*')
        .single()

    if (error && error.code === 'PGRST116') {
        console.log('No settings found, creating default...')
        // No settings found, create default
        const { data: newData, error: insertError } = await client
            .from('chat_settings')
            .insert({
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
            })
            .select()
            .single()

        if (insertError) {
            console.error('Failed to insert default settings:', insertError)
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to create default settings',
            })
        }
        data = newData
    } else if (error) {
        console.error('Failed to fetch settings:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch settings',
        })
    }

    return normalizeAestheticSettings(data)
})
