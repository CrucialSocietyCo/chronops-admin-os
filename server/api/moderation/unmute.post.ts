import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // 1. Verify Admin
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const { data: viewer } = await client
        .from('users')
        .select('is_admin')
        .eq('supabase_user_id', user.id)
        .single()

    if (!viewer?.is_admin) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const { targetUsername } = body
    if (!targetUsername) throw createError({ statusCode: 400, statusMessage: 'Missing targetUsername' })

    // 2. Resolve targetUsername to Client ID(s)
    // We need to unban ALL bans associated with this username's recent Client IDs?
    // Or just find the most recent one.
    // Ideally, we find active bans linked to this user's identity.
    // Since we ban by `client_id` but command uses `username`, we have to resolve again.

    // Find recent messages to get client_id
    const { data: lastEvent } = await client
        .from('app_events')
        .select('payload')
        .eq('event_type', 'message_sent')
        .contains('payload', { sender: targetUsername })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    const targetClientId = lastEvent?.payload?.client_id

    // 3. Deactivate Bans
    // If we found a client ID, unban it.
    let unbanCount = 0

    if (targetClientId) {
        const { error: dbError, count } = await client
            .from('bans')
            .update({ expires_at: new Date() }) // Expire immediately
            .eq('client_id', targetClientId)
            .gt('expires_at', new Date().toISOString()) // Only active ones
            .select()

        unbanCount = count || 0
    }

    // Also Log
    await client.from('app_events').insert({
        event_type: 'user_unmuted',
        user_id: user.id,
        payload: {
            target_username: targetUsername,
            target_client_id: targetClientId,
            unbanned_count: unbanCount
        }
    })

    return { success: true, message: `Unmuted ${targetUsername} (${unbanCount} active bans removed).` }
})
