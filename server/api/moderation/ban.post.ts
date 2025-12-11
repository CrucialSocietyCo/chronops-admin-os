import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

// Full Ban (IP + Client) logic same as Mute but permanent and broader scope? 
// User asked for "Ban" capability.
// Reuse logic mostly.
export default defineEventHandler(async (event) => {
    // Similar implementation to Mute but sets scope='both' or 'ip' and indefinite expiry
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    if (!user) throw createError({ statusCode: 401 })

    const { data: viewer } = await client.from('users').select('is_admin').eq('supabase_user_id', user.id).single()
    if (!viewer?.is_admin) throw createError({ statusCode: 403 })

    const { targetUsername, reason } = body

    // Resolve Identity
    const { data: lastEvent } = await client
        .from('app_events')
        .select('payload, user_id') // Try to get user_id too if linked
        .eq('event_type', 'message_sent')
        .contains('payload', { sender: targetUsername })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!lastEvent?.payload?.client_id) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const targetClientId = lastEvent.payload.client_id

    // Resolve IP from Session
    const { data: session } = await client
        .from('client_sessions')
        .select('ip_address')
        .eq('client_id', targetClientId)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .single()

    const targetIp = session?.ip_address

    // Insert Ban (Permanent)
    await client.from('bans').insert({
        client_id: targetClientId,
        ip_address: targetIp, // Ban IP too!
        reason: reason || 'Manual Ban',
        created_by: user.id,
        scope: 'both', // Ban both
        expires_at: null // Permanent
    })

    await client.from('app_events').insert({
        event_type: 'user_banned',
        user_id: user.id,
        payload: { target: targetUsername, reason }
    })

    return { success: true, message: `Banned ${targetUsername} and IP ${targetIp}` }
})
