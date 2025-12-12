import { serverSupabaseServiceRole } from '#supabase/server'

// Configuration
const TYPING_TIMEOUT_MS = 3000 // Users are "typing" for 3s after last event
const MAX_RATE_LIMIT = 30 // Max 30 requests per minute
const MUTE_DURATION_MS = 60000 // 60s mute if abused
const RATE_WINDOW_MS = 60000 // 1 minute window

interface TypingUser {
    userId: string
    expiresAt: number
}

interface RateLimit {
    count: number
    windowStart: number
    mutedUntil: number
}

class TypingManager {
    private activeTypers: Map<string, number> = new Map() // userId -> expiresAt
    private rateLimits: Map<string, RateLimit> = new Map() // ip -> limit info
    private broadcastTimer: NodeJS.Timeout | null = null

    // Singleton instance methods wrapper
    public async handleTyping(event: any, ip: string, userId: string, action: 'start' | 'stop') {
        const now = Date.now()

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
            return { allowed: false, reason: 'rate_limited', mutedUntil: limit.mutedUntil }
        }

        // 2. Update State
        const wasActive = this.activeTypers.size > 0

        if (action === 'stop') {
            this.activeTypers.delete(userId)
        } else {
            this.activeTypers.set(userId, now + TYPING_TIMEOUT_MS)
        }

        // 3. Clean Expired
        this.cleanUp()

        const isActive = this.activeTypers.size > 0

        // 4. Broadcast if State Changed (Active <-> Inactive)
        // We only care if we transition from 0 -> >0 or >0 -> 0 to save bandwidth
        // OR if we strictly want "someone is typing" to stay alive, we might need 
        // to occasionally re-broadcast if the clients purely rely on a timeout.
        // However, the prompt implies the client UI handles the "fade away" logic 
        // based on "active typer count > 0". The server is the authority.
        // Let's broadcast on ANY 0<->1 transition.

        if (wasActive !== isActive) {
            await this.broadcastState(event, isActive)
        }

        return { allowed: true, isActive }
    }

    private cleanUp() {
        const now = Date.now()
        for (const [userId, expiresAt] of this.activeTypers.entries()) {
            if (expiresAt < now) {
                this.activeTypers.delete(userId)
            }
        }
    }

    private async broadcastState(event: any, isActive: boolean) {
        try {
            const client = serverSupabaseServiceRole(event)
            if (!client) return

            await client.channel('room:general').send({
                type: 'broadcast',
                event: 'typing_update',
                payload: { isActive }
            })
        } catch (err) {
            console.error('[TypingManager] Broadcast failed', err)
        }
    }
}

// Export Singleton
export const typingManager = new TypingManager()
