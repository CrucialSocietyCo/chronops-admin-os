import { serverSupabaseServiceRole } from '#supabase/server'
import crypto from 'crypto'

// Secret salt for IP hashing - normally from env, fallback for dev
const IP_SALT = process.env.IP_HASH_SALT || 'dev-secret-salt-change-in-prod'

// Rate Limit Config for Analytics Writes
// Avoid spamming the DB with analytics events
const MAX_EVENTS_PER_MINUTE = 20
const RATE_WINDOW_MS = 60000

interface AnalyticsRateLimit {
    count: number
    windowStart: number
}

const writeRateLimits = new Map<string, AnalyticsRateLimit>()

export const logAnalyticsEvent = async (event: any, eventName: string, context: { roomId?: string, clientId?: string, payload?: any }) => {
    try {
        const client = serverSupabaseServiceRole(event)
        if (!client) return

        // 1. IP Hashing & Metadata
        const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
        const ipHash = crypto.createHash('sha256').update(ip + IP_SALT).digest('hex')

        const userAgent = getRequestHeader(event, 'user-agent') || ''
        // Simple fingerprint: hash(UA + IP_SALT) - sufficient to group sessions roughly without storing raw UA
        const uaFingerprint = crypto.createHash('md5').update(userAgent + IP_SALT).digest('hex')

        const clientId = context.clientId || getRequestHeader(event, 'x-client-id') || 'unknown'
        const roomId = context.roomId || 'global'

        // 2. Write Rate Limiting (Per Client ID)
        if (clientId !== 'unknown') {
            const now = Date.now()
            let limit = writeRateLimits.get(clientId)

            if (!limit) {
                limit = { count: 0, windowStart: now }
                writeRateLimits.set(clientId, limit)
            }

            if (now - limit.windowStart > RATE_WINDOW_MS) {
                limit.count = 0
                limit.windowStart = now
            }

            limit.count++
            if (limit.count > MAX_EVENTS_PER_MINUTE) {
                // Drop event silently to protect DB
                return
            }
        }

        // 3. Insert specific payload
        const { error } = await client.from('analytics_events').insert({
            event_name: eventName,
            room_id: roomId,
            client_id: clientId,
            ip_hash: ipHash,
            user_agent_fingerprint: uaFingerprint,
            payload: context.payload || {}
        })

        if (error) {
            console.error('[Analytics] Failed to write event:', error.message)
        }

    } catch (err) {
        console.error('[Analytics] Error logging event:', err)
    }
}
