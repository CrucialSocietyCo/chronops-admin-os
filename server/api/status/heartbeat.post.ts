import { buildFingerprint } from '../../utils/southmain-mod'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const { fingerprintKey } = buildFingerprint(ip, userAgent)

    // We treat fingerprintKey as the actor_id
    const actorId = fingerprintKey

    const client = serverSupabaseServiceRole(event)
    if (!client) {
        throw createError({ statusCode: 500, message: 'DB Connection Failed' })
    }

    // Upsert Actor to update last_seen_at
    const { error } = await client
        .from('actors')
        .upsert({
            actor_id: actorId,
            last_seen_at: new Date().toISOString()
        }, { onConflict: 'actor_id' })

    if (error) {
        console.error('[Heartbeat] Failed to update actor:', error)
        // Non-blocking error for client, but logged
    }

    return { success: true }
})
