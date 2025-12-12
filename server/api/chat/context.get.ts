import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    // 1. Get Active Event
    const { data: activeEvent } = await client
        .from('events')
        .select('*')
        .eq('is_active', true)
        .single()

    // 2. Get Chat Settings (for Mode)
    const { data: settings } = await client
        .from('chat_settings')
        .select('*') // Select all to get color_theme
        .single()

    return {
        event_id: activeEvent?.id || null,
        event_name: activeEvent?.name || 'General',
        window_title: activeEvent?.window_title || 'Arts and Entertainment', // Dynamic Title
        show_sponsored: activeEvent ? activeEvent.show_sponsored : true,
        show_history: activeEvent ? activeEvent.show_chat_history : true,
        chat_mode: settings?.event_mode || 'Live Event',
        is_chat_enabled: settings?.is_chat_enabled ?? true,
        color_theme: settings?.color_theme || 'Teal Base',
        admin_badge_style: settings?.admin_badge_style || 'Star Icon'
    }
})
