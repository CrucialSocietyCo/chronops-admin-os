import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    let { data, error } = await client
        .from('system_settings')
        .select('*')
        .single()

    if (error && error.code === 'PGRST116') {
        console.log('No system settings found, creating default...')
        // No settings found, create default
        const { data: newData, error: insertError } = await client
            .from('system_settings')
            .insert({
                app_name: 'ChronOps',
                window_title_format: '[App Name] – [Chatroom Title]',
                show_branding_footer: true,
                timezone: 'UTC',
                time_format: '24-hour',
                date_format: 'YYYY-MM-DD',
                show_seconds: false,
                show_timestamps: true,
                message_retention_policy: 'Forever',
                allow_chat_log_export: false,
                anonymize_exports: true,
                log_ip_enabled: true,
                admin_display_name: 'Admin',
                require_password_for_dashboard: true,
                auto_logout_enabled: true,
                idle_timeout_minutes: 15,
                alert_on_error: true,
                alert_on_disconnect: true,
                alert_on_surge: false,
                sound_on_new_message: false,
                sound_on_mention: true,
                sound_on_warning: true,
                default_event_mode: 'Live Event',
                auto_open_chat: true,
                auto_apply_snapshot: false,
                show_closed_splash: true,
                send_events_joined: false,
                send_events_left: false,
                send_events_message: false,
                send_events_admin: true,
                experimental_features: false,
                show_dev_console: false
            })
            .select()
            .single()

        if (insertError) {
            console.error('Failed to insert default system settings:', insertError)
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to create default system settings',
            })
        }
        data = newData
    } else if (error) {
        console.error('Failed to fetch system settings:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch system settings',
        })
    }

    return data
})
