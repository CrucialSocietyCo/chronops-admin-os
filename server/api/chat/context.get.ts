import { serverSupabaseClient } from '#supabase/server'
import { applyScheduledEventMode } from '../../utils/scheduling'
import { withPublicAestheticAliases } from '../../utils/aesthetics'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    let settings = await applyScheduledEventMode(event)

    // 1. Get Active Event
    const { data: activeEvent } = await client
        .from('events')
        .select('*')
        .eq('is_active', true)
        .single()

    // 2. Get Chat Settings (for Mode)
    if (!settings) {
        const { data } = await client
            .from('chat_settings')
            .select('*') // Select all to get color_theme
            .single()
        settings = data
    }

    const normalizedSettings = settings ? withPublicAestheticAliases(settings) : null

    return {
        event_id: activeEvent?.id || null,
        event_name: activeEvent?.name || 'General',
        window_title: activeEvent?.window_title || 'Arts and Entertainment', // Dynamic Title
        show_sponsored: activeEvent ? activeEvent.show_sponsored : true,
        show_history: activeEvent ? activeEvent.show_chat_history : true,
        chat_mode: normalizedSettings?.event_mode || 'Live Event',
        is_chat_enabled: normalizedSettings?.is_chat_enabled ?? true,
        window_border_style: normalizedSettings?.window_border_style || 'system95',
        border_style: normalizedSettings?.border_style || 'system95',
        color_theme: normalizedSettings?.color_theme || 'teal_base',
        admin_badge_style: normalizedSettings?.admin_badge_style || 'star_icon',
        admin_badge: normalizedSettings?.admin_badge || 'star_icon'
    }
})
