import { serverSupabaseServiceRole } from '#supabase/server'
import { MODERATION_CONFIG } from '../../app/config/moderation'

export const enforceModeration = async (event: any, body: any) => {
    const serviceClient = serverSupabaseServiceRole(event)

    // 1. Resolve Identity
    const clientId = getRequestHeader(event, 'x-client-id') || 'unknown_client'
    const ipAddress = getRequestHeader(event, 'x-forwarded-for') ||
        getRequestHeader(event, 'x-real-ip') ||
        event.node.req.socket.remoteAddress || 'unknown_ip'

    const userAgent = getRequestHeader(event, 'user-agent')

    // Upsert Session (Fire & Forget mostly, but we await to ensure DB is alive)
    // Using simple logic: insert or update last_seen
    // We can't do true upsert easily without unique constraint on client_id which we might have
    // Actually, migration added index. Let's assume duplications are fine or handle gracefully.
    // For MVP, just insert logic or ignore.
    await serviceClient.from('client_sessions').insert({
        client_id: clientId,
        ip_address: ipAddress,
        user_agent: userAgent,
        last_seen_at: new Date()
    }).select().single() // Use RPC or upsert if schema allows unique client_id?
    // Schema defines PK UUID, client_id is just index. Duplicate rows ok for history.

    // 2. Check Active Bans
    // Ban Logic: (client_id match OR ip_address match) AND (expires_at > now OR null)
    const { data: bans, error: banError } = await serviceClient
        .from('bans')
        .select('*')
        .or(`client_id.eq.${clientId},ip_address.eq.${ipAddress}`)
        .or('expires_at.is.null,expires_at.gt.now()')
        .limit(1)

    if (bans && bans.length > 0) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Banned',
            data: {
                code: 'BANNED',
                message: bans[0].reason || 'You are banned from this chat.',
                expires_at: bans[0].expires_at
            }
        })
    }

    // 3. Content Checks
    const content = body.content || ''

    // 3a. Length
    if (content.length > MODERATION_CONFIG.MAX_MESSAGE_LENGTH) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Message Too Long',
            data: { code: 'MESSAGE_TOO_LONG', message: `Max length is ${MODERATION_CONFIG.MAX_MESSAGE_LENGTH} characters.` }
        })
    }

    // 3b. Bad Words
    const lowerContent = content.toLowerCase()
    const foundBadWord = MODERATION_CONFIG.BAD_WORDS.find((word: string) => lowerContent.includes(word.toLowerCase()))

    if (foundBadWord) {
        // Flag or Reject? User asked to Reject for MVP.
        throw createError({
            statusCode: 400, // Or 422
            statusMessage: 'Content Blocked',
            data: { code: 'CONTENT_BLOCKED', message: 'Message violates community guidelines.' }
        })
    }

    // 4. Rate Limiting (Database Count Strategy)
    // Count messages from this client_id in last WINDOW
    const windowStart = new Date(Date.now() - MODERATION_CONFIG.RATE_LIMIT_WINDOW_MS).toISOString()

    // Use app_events because messages table might not capture failed attempts, 
    // BUT we want to limit SUCCESSFUL messages. 
    // Let's count 'messages' table insertions where user_id matches? 
    // Wait, messages table uses user_id (UUID), but we are rate limiting by client_id (Header).
    // The messages table DOES NOT store client_id currently.
    // OPTION A: Add client_id to messages table.
    // OPTION B: Rate limit based on IP (if consistent).
    // OPTION C: Rate limit based on user_id (if logged in logic maps consistently).
    // User requested ANONYMOUS identity. 
    // BEST PATH: Track rate limit attempts in a transient way or assume `app_events` logs `message_sent`?
    // Let's rely on `app_events` which DOES log `message_sent`. But we need to verify `app_events` has `client_id`?
    // The current `app_events` schema has `user_id` (fk) but not `client_id`.

    // CRITICAL: We need `client_id` in `app_events` or `messages` to rate limit effectively by `client_id`.
    // I will add `client_id` to `app_events` payload or column.

    // For now, let's assume we can Rate Limit by IP using query on `client_sessions` + `app_events` join? Too complex.
    // Simple fix: Add `client_id` to `app_events` via migration?
    // User said: "Reuse existing schema where possible".
    // I can store `client_id` in the `payload` JSONB of `app_events`.

    const { count, error: countError } = await serviceClient
        .from('app_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'message_sent')
        .contains('payload', { client_id: clientId }) // JSONB filter
        .gt('created_at', windowStart)

    if (count !== null && count >= MODERATION_CONFIG.MAX_MESSAGES_PER_WINDOW) {
        // AUTO MUTE
        const expiresAt = new Date(Date.now() + MODERATION_CONFIG.AUTO_MUTE_DURATION_MS)

        await serviceClient.from('bans').insert({
            client_id: clientId,
            ip_address: ipAddress,
            reason: 'Auto-mute: Rate limit exceeded',
            expires_at: expiresAt,
            scope: 'client'
        })

        throw createError({
            statusCode: 429,
            statusMessage: 'Rate Limited',
            data: {
                code: 'RATE_LIMITED',
                message: 'You are sending messages too fast. Temporary mute applied.',
                expires_at: expiresAt
            }
        })
    }
}
