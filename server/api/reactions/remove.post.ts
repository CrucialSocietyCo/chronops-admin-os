import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { buildFingerprint, InMemoryMuteRepo, InMemoryBanRepo } from '../../utils/southmain-mod'
import { getReactionCounts, VALID_REACTIONS } from '../../utils/reactions'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { messageId, reactionType, sessionId: bodySessionId } = body

    if (!messageId || !reactionType) {
        throw createError({ statusCode: 400, message: "Missing messageId or reactionType" })
    }

    // 1. Resolve Identity
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const { fingerprintKey, ipHash } = buildFingerprint(ip, userAgent)
    const sessionId = getRequestHeader(event, 'x-session-id') || bodySessionId || 'unknown_session'

    // 2. Moderation Check (Even for removing? Prompt says prevent further calls. So yes.)
    const activeBans = await InMemoryBanRepo.findActiveByFingerprintOrIp(fingerprintKey, ipHash)
    if (activeBans.length > 0) throw createError({ statusCode: 403, message: "You are banned." })

    const activeMutes = await InMemoryMuteRepo.findActiveBySessionOrFingerprint(sessionId, fingerprintKey)
    if (activeMutes.length > 0) throw createError({ statusCode: 429, message: "You are muted." })

    // 3. Perform Remove
    const serviceClient = serverSupabaseServiceRole(event)
    if (!serviceClient) throw createError({ statusCode: 500, message: "Supabase Service Role missing" })

    const { error } = await serviceClient
        .from('chat_message_reactions')
        .delete()
        .match({
            message_id: messageId,
            session_id: sessionId,
            reaction_type: reactionType
        })

    if (error) throw createError({ statusCode: 500, message: error.message })

    // 4. Get New Counts
    const counts = await getReactionCounts(serviceClient, messageId)

    // 5. Broadcast Realtime Event
    const client = await serverSupabaseClient(event)
    const channel = client.channel('room:global')

    await channel.send({
        type: 'broadcast',
        event: 'reaction_update',
        payload: {
            messageId,
            reactionType,
            counts
        }
    })

    // 6. Analytics Event
    try {
        await serviceClient.from('app_events').insert({
            event_type: 'reaction_removed',
            user_id: null,
            payload: {
                message_id: messageId,
                reaction_type: reactionType,
                session_id_hash: sessionId,
                fingerprint_key: fingerprintKey
            }
        })
    } catch (e) {
        console.error('[Reaction Remove] Analytics failed', e)
    }

    return { success: true, counts }
})
