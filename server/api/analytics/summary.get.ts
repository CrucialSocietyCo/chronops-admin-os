import { serverSupabaseServiceRole } from '#supabase/server'
import { typingManager } from '../../utils/typing-manager'

export default defineEventHandler(async (event) => {
    const client = serverSupabaseServiceRole(event)
    if (!client) {
        throw createError({ statusCode: 500, message: 'Database Unavailable' })
    }

    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

    // 1. Avg Typers (Last 5 mins)
    // Fetch 'typing_indicator_room_active' events
    const { data: roomEvents } = await client
        .from('analytics_events')
        .select('payload')
        .eq('event_name', 'typing_indicator_room_active')
        .gt('created_at', fiveMinutesAgo)
        .limit(100)

    let avgTypers = 0
    if (roomEvents && roomEvents.length > 0) {
        const total = roomEvents.reduce((acc, row) => acc + (row.payload?.active_typer_count || 0), 0)
        avgTypers = Math.round((total / roomEvents.length) * 10) / 10
    }

    // 2. Spam Events (Last Hour)
    const { count: spamCount } = await client
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'typing_rate_limit_triggered')
        .gt('created_at', oneHourAgo)

    // 3. Avg Visibility Duration (Last Hour)
    const { data: hideEvents } = await client
        .from('analytics_events')
        .select('payload')
        .eq('event_name', 'typing_indicator_hidden')
        .gt('created_at', oneHourAgo)
        .limit(100)

    let avgVisibility = 0
    if (hideEvents && hideEvents.length > 0) {
        const totalMs = hideEvents.reduce((acc, row) => acc + (row.payload?.visible_duration_ms || 0), 0)
        avgVisibility = Math.round(totalMs / hideEvents.length)
    }

    // 4. Current Active Typers Estimate
    // We can't easily peek into TypingManager state from a request if it's running in a different context (e.g. serverless).
    // But assuming long-running server for this "retro" app:
    // Actually, accessing `typingManager` singleton might work if it's the same process. 
    // If not, we rely on the last db 'typing_indicator_room_active' log.
    // We'll try to expose a getter on TypingManager or just use the last DB log.
    // Let's rely on DB for consistency across scaled instances.
    const { data: lastStatus } = await client
        .from('analytics_events')
        .select('payload')
        .eq('event_name', 'typing_indicator_room_active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    const currentTypersEst = lastStatus?.payload?.active_typer_count || 0

    return {
        avg_typers_5m: avgTypers,
        spam_events_1h: spamCount || 0,
        avg_visibility_ms: avgVisibility,
        current_typers_est: currentTypersEst
    }
})
