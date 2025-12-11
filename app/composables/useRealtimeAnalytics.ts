import { ref, computed } from 'vue'

export const useRealtimeAnalytics = () => {
    const supabase = useSupabaseClient()
    const recentEvents = ref<any[]>([])
    const messageBuffer = ref<any[]>([])
    const activityBuffer = ref<any[]>([])

    // Max buffer size for recent events list
    const MAX_RECENT_EVENTS = 25
    // Window in minutes for charts
    const CHART_WINDOW_MINUTES = 15

    const subscribe = () => {
        supabase
            .channel('realtime-app-events')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'app_events' },
                (payload) => {
                    handleNewEvent(payload.new)
                }
            )
            .subscribe()
    }

    const unsubscribe = () => {
        supabase.removeAllChannels()
    }

    const handleNewEvent = (event: any) => {
        // 1. Add to Recent Events List
        recentEvents.value.unshift(event)
        if (recentEvents.value.length > MAX_RECENT_EVENTS) {
            recentEvents.value.pop()
        }

        // 2. Add to specific buffers for charts
        if (event.event_type === 'message_sent') {
            messageBuffer.value.push(event)
        }
        if (['room_joined', 'room_left', 'message_sent'].includes(event.event_type)) {
            activityBuffer.value.push(event)
        }

        pruneBuffers()
    }

    // Remove events older than window
    const pruneBuffers = () => {
        const cutoff = new Date(Date.now() - CHART_WINDOW_MINUTES * 60 * 1000).toISOString()
        messageBuffer.value = messageBuffer.value.filter(e => e.created_at > cutoff)
        activityBuffer.value = activityBuffer.value.filter(e => e.created_at > cutoff)
    }

    // --- Chart Data Computations ---

    const getMessagesPerMinute = () => {
        const labels: string[] = []
        const data: number[] = []

        const now = Date.now()
        // Create 1-minute buckets
        for (let i = CHART_WINDOW_MINUTES - 1; i >= 0; i--) {
            const timeStart = now - (i + 1) * 60 * 1000
            const timeEnd = now - i * 60 * 1000

            // Generate label (HH:MM)
            const date = new Date(timeEnd)
            labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

            // Count messages in this bucket
            const count = messageBuffer.value.filter(e => {
                const t = new Date(e.created_at).getTime()
                return t > timeStart && t <= timeEnd
            }).length

            data.push(count)
        }

        return { labels, data }
    }

    const getActiveUsersOverTime = () => {
        const labels: string[] = []
        const data: number[] = []

        const now = Date.now()
        for (let i = CHART_WINDOW_MINUTES - 1; i >= 0; i--) {
            const timeStart = now - (i + 1) * 60 * 1000
            const timeEnd = now - i * 60 * 1000

            const date = new Date(timeEnd)
            labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

            // Count UNIQUE user_ids in this bucket
            const activeUsers = new Set()
            activityBuffer.value.forEach(e => {
                const t = new Date(e.created_at).getTime()
                if (t > timeStart && t <= timeEnd && e.user_id) {
                    activeUsers.add(e.user_id)
                }
            })

            data.push(activeUsers.size)
        }

        return { labels, data }
    }

    // Initial fetch to populate buffers (optional, but good for UX)
    const fetchRecentHistory = async () => {
        const { data } = await supabase
            .from('app_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (data) {
            // Reverse to process oldest first into buffers? 
            // Actually, for buffers we just filtering by time.
            recentEvents.value = [...data].slice(0, MAX_RECENT_EVENTS)

            const cutoff = new Date(Date.now() - CHART_WINDOW_MINUTES * 60 * 1000).getTime()

            data.forEach(event => {
                const t = new Date(event.created_at).getTime()
                if (t > cutoff) {
                    if (event.event_type === 'message_sent') {
                        messageBuffer.value.push(event)
                    }
                    if (['room_joined', 'room_left', 'message_sent'].includes(event.event_type)) {
                        activityBuffer.value.push(event)
                    }
                }
            })
        }
    }

    return {
        subscribe,
        unsubscribe,
        recentEvents,
        getMessagesPerMinute,
        getActiveUsersOverTime,
        fetchRecentHistory
    }
}
