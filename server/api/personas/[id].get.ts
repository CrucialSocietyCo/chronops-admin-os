import { serverSupabaseServiceRole } from '#supabase/server'
import { buildFingerprint } from '../../utils/southmain-mod'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const client = serverSupabaseServiceRole(event)

    // 1. Resolve Identity of Requester
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const { fingerprintKey } = buildFingerprint(ip, userAgent)
    const requesterActorId = fingerprintKey

    // 2. Fetch Public Data (View)
    const { data: cardData, error } = await client
        .from('persona_cards')
        .select('*')
        .eq('persona_id', id)
        .single()

    if (error || !cardData) {
        throw createError({
            statusCode: 404,
            message: 'Persona not found'
        })
    }

    // 3. Check Ownership (Private Lookup)
    // We need to know the actor_id of this persona. 
    // The view hides it, so we query size-optimised.
    const { data: ownerData } = await client
        .from('personas')
        .select('actor_id')
        .eq('persona_id', id)
        .single()

    const isOwner = ownerData && ownerData.actor_id === requesterActorId

    return {
        ...cardData,
        is_owner: isOwner
    }
})
