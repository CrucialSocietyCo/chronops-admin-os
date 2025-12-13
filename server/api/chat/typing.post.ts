import { typingManager } from '../../utils/typing-manager'
import { buildFingerprint } from '../../utils/southmain-mod'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const clientId = getRequestHeader(event, 'x-client-id') || 'unknown'

    // We use client-id as a proxy for user-id for anonymous typing tracking
    // This is sufficient for the "Someone is typing" feature
    if (!clientId) {
        throw createError({ statusCode: 400, message: 'Missing Client ID' })
    }

    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const { fingerprintKey } = buildFingerprint(ip, userAgent)

    const action = body.status === 'start' ? 'start' : 'stop'

    // 4. Resolve Identity (Persona)
    const client = serverSupabaseServiceRole(event)
    // Resolve Actor ID from fingerprint (hash of fingerprintKey) - actually SouthMain uses fingerprintKey AS actor_id usually
    // Let's use fingerprintKey directly as actor_id per previous tasks
    const actorId = fingerprintKey

    // Default to body username (trusted from client for ephemeral typing) or Guest
    // We sanitize it slightly to prevent massive strings
    let displayName = (body.username && typeof body.username === 'string')
        ? body.username.substring(0, 20)
        : 'Guest'

    if (client) {
        const { data: persona, error } = await client
            .from('personas')
            .select('display_name')
            .eq('actor_id', actorId)
            .eq('is_active', true)
            .maybeSingle()

        if (persona) {
            displayName = persona.display_name
        }

        console.log(`[Typing] Actor: ${actorId} -> Name: ${displayName} (Error: ${error?.message})`)
    }

    // 5. Update Typing State with Name
    const result = await typingManager.handleTyping(event, ip, clientId, displayName, action)

    if (!result.allowed) {
        if (result.mutedUntil) {
            throw createError({
                statusCode: 429,
                message: 'You are doing that too much.',
                data: { mutedUntil: result.mutedUntil }
            })
        }
    }

    return { success: true, isActive: result.isActive }
})
