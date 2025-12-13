import { serverSupabaseServiceRole } from '#supabase/server'
import { buildFingerprint } from '../../utils/southmain-mod'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const vibeTag = body.vibe_tag

    if (!vibeTag) {
        throw createError({ statusCode: 400, message: 'Missing vibe_tag' })
    }

    // 1. Resolve Identity (Reusing logic from messages.post.ts roughly)
    // We need to ensure we find the SAME actor_id as the message sender would have.
    // In messages.post.ts we use built-in logic. Let's replicate or extract.
    // Ideally we'd extract "resolveActorId(event)" but for now we reconstruct.

    // We trust x-session-id or fingerprint just like chat.
    // BUT critical: "Owner Actions - If the current viewer’s actor_id owns this active persona"

    // We need to find the actor_id for this request.
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const { fingerprintKey } = buildFingerprint(ip, userAgent)

    // NOTE: In the current implementation (migrations v1), actor_id IS the fingerprintKey.
    // See migration: inputs "actor_id text PRIMARY KEY, -- Uses fingerprintKey"
    const actorId = fingerprintKey

    const client = serverSupabaseServiceRole(event)

    // 2. Update Active Persona for this Actor
    // We only update the IS_ACTIVE one.
    const { data, error } = await client
        .from('personas')
        .update({ vibe_tag: vibeTag })
        .eq('actor_id', actorId)
        .eq('is_active', true)
        .select()
        .single()

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    if (!data) {
        throw createError({ statusCode: 404, message: 'No active persona found for this user.' })
    }

    return { success: true, persona: data }
})
