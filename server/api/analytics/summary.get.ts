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

    // 5. Advanced Metrics: Typing Pulse & Engagement
    // Pulse = Active Typers * Avg Burst Duration (from bursts in last 5m)
    // We need burst ended events to get duration
    const { data: burstEvents } = await client
        .from('analytics_events')
        .select('payload')
        .eq('event_name', 'typing_burst_ended')
        .gt('created_at', fiveMinutesAgo)
        .limit(100)

    let avgBurstDuration = 0
    if (burstEvents && burstEvents.length > 0) {
        const total = burstEvents.reduce((acc, row) => acc + (row.payload?.burst_duration_ms || 0), 0)
        avgBurstDuration = Math.round(total / burstEvents.length)
    }

    // Pulse Score (0-100)
    // Formula: (Avg Typers * 10) + (Avg Burst Secs * 5). Cap at 100.
    const pulseScore = Math.min(100, Math.round((avgTypers * 10) + ((avgBurstDuration / 1000) * 5)))

    // Engagement Ratio
    // We need total active socket connections to calculate ratio properly.
    // For now, we'll use a rough estimate if we don't have a reliable "total active users" count in this specific endpoint yet.
    // Ideally, we'd fetch current presence count.
    // Fallback: If currentTypersEst > 0, we imply activity. 
    // Let's assume a baseline "connected" of at least the typers * 3 for a healthy room.
    // Real impl would require fetching Supabase Presence or a "user_heartbeat" table.
    // We will just return the raw typers count as part of the "Engagement" metric context for now.

    // Spam Index (Low/Med/High)
    // Low: < 5 limits/hr. Med: 5-20. High: > 20.
    let spamIndex = 'Low'
    const spamCountVal = spamCount || 0
    if (spamCountVal > 20) spamIndex = 'High'
    else if (spamCountVal > 5) spamIndex = 'Medium'

    return {
        avg_typers_5m: avgTypers,
        spam_events_1h: spamCountVal,
        avg_visibility_ms: avgVisibility,
        current_typers_est: currentTypersEst,

        // Advanced
        typing_pulse_score: pulseScore,
        avg_burst_duration_ms: avgBurstDuration,
        spam_index: spamIndex
    }
})
