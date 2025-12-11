import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { MODERATION_CONFIG } from '../../../app/config/moderation'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // 1. Verify Admin (Strict)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { data: viewer, error: viewerError } = await client
        .from('users')
        .select('is_admin')
        .eq('supabase_user_id', user.id)
        .single()

    if (!viewer?.is_admin) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admins only' })
    }

    // 2. Parse Mute Request
    const { targetUsername, duration, reason } = body

    if (!targetUsername) {
        throw createError({ statusCode: 400, statusMessage: 'Missing targetUsername' })
    }

    // 3. Resolve Target to Client ID (Tricky for anonymous users!)
    // Moderation commands like /mute @GuestUser need to find the `client_id` associated with that *User*.
    // But `users` table doesn't store `client_id` (it's anonymous).
    // The `client_id` is only in `app_events` (recent messages) or `client_sessions`.
    // STRATEGY: Find the most recent `message_sent` event from this username (sender name) to get the client_id.

    // Step 3a: Find user by name (to warn if ambiguous?)
    // Actually, just find the last message from this 'sender'.
    const { data: lastEvent, error: searchError } = await client
        .from('app_events')
        .select('payload, user_id')
        .eq('event_type', 'message_sent')
        .contains('payload', { sender: targetUsername }) // Assuming payload has 'sender'
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!lastEvent || !lastEvent.payload) {
        throw createError({ statusCode: 404, statusMessage: `Could not find any recent messages from "${targetUsername}" to resolve identity.` })
    }

    const targetClientId = lastEvent.payload.client_id
    if (!targetClientId) {
        throw createError({ statusCode: 400, statusMessage: `User "${targetUsername}" exists but has no linked Client ID (old messages?).` })
    }

    // 4. Calculate Expiry
    // duration can be '10m', '1h', or number (ms). Default to AUTO_MUTE constants.
    let expiryDate = null
    const now = Date.now()

    if (typeof duration === 'number') {
        expiryDate = new Date(now + duration)
    } else if (typeof duration === 'string') {
        const match = duration.match(/^(\d+)([mh])$/)
        if (match) {
            const val = parseInt(match[1])
            const unit = match[2]
            const mult = unit === 'm' ? 60_000 : 3600_000
            expiryDate = new Date(now + (val * mult))
        } else {
            // Default Manual Mute = 1 Hour
            expiryDate = new Date(now + 3600_000)
        }
    } else {
        // Default Manual Mute = 1 Hour
        expiryDate = new Date(now + 3600_000)
    }

    // 5. Insert Ban
    console.log(`Banning Client ${targetClientId} (User: ${targetUsername}) until ${expiryDate}`)

    const { error: banError } = await client.from('bans').insert({
        client_id: targetClientId,
        reason: reason || `Manual mute by Admin`,
        created_by: user.id,
        expires_at: expiryDate,
        scope: 'client'
    })

    if (banError) {
        throw createError({ statusCode: 500, statusMessage: banError.message })
    }

    // 6. Log Event
    await client.from('app_events').insert({
        event_type: 'user_muted',
        user_id: user.id, // Admin did it
        payload: {
            target_username: targetUsername,
            target_client_id: targetClientId,
            duration: duration,
            reason: reason
        }
    })

    return { success: true, message: `Muted ${targetUsername} until ${expiryDate.toLocaleTimeString()}` }
})
