import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { handleIncomingMessage, buildFingerprint, InMemoryMuteRepo, InMemoryBanRepo } from '../../utils/southmain-mod'
import { getReactionCounts, VALID_REACTIONS } from '../../utils/reactions'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { messageId, reactionType, sessionId: bodySessionId } = body

    if (!messageId || !reactionType) {
        throw createError({ statusCode: 400, message: "Missing messageId or reactionType" })
    }

    if (!VALID_REACTIONS.includes(reactionType)) {
        throw createError({ statusCode: 400, message: "Invalid reaction type" })
    }

    // 1. Resolve Identity (Session + Fingerprint)
    // We rely on headers just like messages.post.ts
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const { fingerprintKey, ipHash } = buildFingerprint(ip, userAgent)
    const sessionId = getRequestHeader(event, 'x-session-id') || bodySessionId || 'unknown_session'

    // 2. Moderation Check (Mute/Ban)
    // Check Bans
    const activeBans = await InMemoryBanRepo.findActiveByFingerprintOrIp(fingerprintKey, ipHash)
    if (activeBans.length > 0) {
        throw createError({ statusCode: 403, message: "You are banned." })
    }
    // Check Mutes
    const activeMutes = await InMemoryMuteRepo.findActiveBySessionOrFingerprint(sessionId, fingerprintKey)
    if (activeMutes.length > 0) {
        throw createError({ statusCode: 429, message: "You are muted." })
    }

    // 3. Perform Add (Upsert)
    // Use Service Role to write to 'chat_message_reactions'
    const serviceClient = serverSupabaseServiceRole(event)
    if (!serviceClient) throw createError({ statusCode: 500, message: "Supabase Service Role missing" })

    const { error } = await serviceClient
        .from('chat_message_reactions')
        .insert({
            message_id: messageId,
            session_id: sessionId,
            reaction_type: reactionType
        })
        .select() // selecting ensures we wait for write
        .single() // expect one

    // Ignore duplicate error (already reacted), just proceed to return counts
    if (error && error.code !== '23505') { // 23505 is unique_violation
        throw createError({ statusCode: 500, message: error.message })
    }

    // 4. Get New Counts
    const counts = await getReactionCounts(serviceClient, messageId)

    // 5. Broadcast Realtime Event
    // We use the 'room:global' channel standard
    const client = await serverSupabaseClient(event)
    const channel = client.channel('room:global')

    await channel.send({
        type: 'broadcast',
        event: 'reaction_update',
        payload: {
            messageId,
            reactionType, // the one that changed
            counts
        }
    })

    // 6. Analytics Event
    try {
        await serviceClient.from('app_events').insert({
            event_type: 'reaction_added',
            user_id: null, // Anonymous session
            payload: {
                message_id: messageId,
                reaction_type: reactionType,
                session_id_hash: sessionId, // hashing unnecessary if session_id is already essentially random/anon, but good practice usually
                fingerprint_key: fingerprintKey
            }
        })
    } catch (e) {
        console.error('[Reaction Add] Analytics failed', e)
    }

    return { success: true, counts }
})
