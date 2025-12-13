import { serverSupabaseServiceRole } from '#supabase/server'
import { logAnalyticsEvent } from './analytics-logger'

// Configuration
const TYPING_TIMEOUT_MS = 3000 // Users are "typing" for 3s after last event
const MAX_RATE_LIMIT = 30 // Max 30 requests per minute
const MUTE_DURATION_MS = 60000 // 60s mute if abused
const RATE_WINDOW_MS = 60000 // 1 minute window

interface RateLimit {
    count: number
    windowStart: number
    mutedUntil: number
}

interface ActiveTyper {
    expiresAt: number
    displayName: string
}

class TypingManager {
    private activeTypers: Map<string, ActiveTyper> = new Map() // userId -> { expiresAt, displayName }
    private rateLimits: Map<string, RateLimit> = new Map() // ip -> limit info

    // Analytics State
    private indicatorShownAt: number | null = null
    private maxTypersSession: number = 0
    private roomActiveInterval: NodeJS.Timeout | null = null

    // Singleton instance methods wrapper
    public async handleTyping(event: any, ip: string, userId: string, displayName: string, action: 'start' | 'stop') {
        const now = Date.now()
        const clientId = userId

        // 1. Rate Limiting
        let limit = this.rateLimits.get(ip)
        if (!limit) {
            limit = { count: 0, windowStart: now, mutedUntil: 0 }
            this.rateLimits.set(ip, limit)
        }

        // Check Mute
        if (limit.mutedUntil > now) {
            return { allowed: false, reason: 'muted' }
        }

        // Window Reset
        if (now - limit.windowStart > RATE_WINDOW_MS) {
            limit.count = 0
            limit.windowStart = now
        }

        // Increment & Check Limit
        limit.count++
        if (limit.count > MAX_RATE_LIMIT) {
            limit.mutedUntil = now + MUTE_DURATION_MS

            await logAnalyticsEvent(event, 'typing_rate_limit_triggered', {
                clientId,
                payload: { limit: MAX_RATE_LIMIT, occurrences: limit.count }
            })
            await logAnalyticsEvent(event, 'typing_auto_muted', {
                clientId,
                payload: { mute_duration_seconds: MUTE_DURATION_MS / 1000, reason: 'typing_spam' }
            })

            return { allowed: false, reason: 'rate_limited', mutedUntil: limit.mutedUntil }
        }

        // 2. Update State
        const prevCount = this.activeTypers.size
        const prevKeys = this.getBroadcastKeys()

        if (action === 'stop') {
            this.activeTypers.delete(userId)
        } else {
            this.activeTypers.set(userId, { expiresAt: now + TYPING_TIMEOUT_MS, displayName })
        }

        // 3. Clean Expired
        this.cleanUp()

        const currentCount = this.activeTypers.size
        const currentKeys = this.getBroadcastKeys()

        // 4. Analytics: Transitions
        if (prevCount === 0 && currentCount > 0) {
            this.indicatorShownAt = now
            this.maxTypersSession = currentCount
            this.startRoomActiveLogging(event)

            logAnalyticsEvent(event, 'typing_indicator_shown', {
                clientId,
                payload: { active_typer_count_at_show: currentCount }
            })
        } else if (prevCount > 0 && currentCount === 0) {
            const duration = this.indicatorShownAt ? now - this.indicatorShownAt : 0
            this.stopRoomActiveLogging()

            logAnalyticsEvent(event, 'typing_indicator_hidden', {
                clientId,
                payload: {
                    visible_duration_ms: duration,
                    max_active_typers_during_visibility: this.maxTypersSession
                }
            })

            this.indicatorShownAt = null
            this.maxTypersSession = 0
        } else if (currentCount > 0) {
            if (currentCount > this.maxTypersSession) {
                this.maxTypersSession = currentCount
            }
        }

        // 5. Broadcast if Set Changed
        if (prevKeys !== currentKeys) {
            await this.broadcastState(event)
        }

        return { allowed: true, isActive: currentCount > 0 }
    }

    private cleanUp() {
        const now = Date.now()
        for (const [userId, data] of this.activeTypers.entries()) {
            if (data.expiresAt < now) {
                this.activeTypers.delete(userId)
            }
        }
    }

    // New helper to get stable list key
    private getBroadcastKeys(): string {
        return Array.from(this.activeTypers.keys()).sort().join(',')
    }

    private startRoomActiveLogging(event: any) {
        if (this.roomActiveInterval) clearInterval(this.roomActiveInterval)

        this.roomActiveInterval = setInterval(() => {
            if (this.activeTypers.size > 0) {
                logAnalyticsEvent(event, 'typing_indicator_room_active', {
                    payload: { active_typer_count: this.activeTypers.size }
                })
            } else {
                this.stopRoomActiveLogging()
            }
        }, 10000)
    }

    private stopRoomActiveLogging() {
        if (this.roomActiveInterval) {
            clearInterval(this.roomActiveInterval)
            this.roomActiveInterval = null
        }
    }

    private async broadcastState(event: any) {
        try {
            const client = serverSupabaseServiceRole(event)
            if (!client) return

            // Extract names for the frontend
            const activeTypersList = Array.from(this.activeTypers.entries()).map(([id, data]) => ({
                id,
                name: data.displayName
            }))

            await client.channel('room:general').send({
                type: 'broadcast',
                event: 'typing_update',
                payload: { activeTypers: activeTypersList }
            })
        } catch (err) {
            console.error('[TypingManager] Broadcast failed', err)
        }
    }
}

// Export Singleton
export const typingManager = new TypingManager()
