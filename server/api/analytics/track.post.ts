import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    if (!body.event_type) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing event_type'
        })
    }

    // Construct payload
    const eventData = {
        event_type: body.event_type,
        payload: body.payload || {},
        user_id: user?.id || null, // Link to authenticated user if known
        room_id: body.room_id || 'general' // Default to general room for now
    }

    // Insert into app_events
    const { error } = await client
        .from('app_events')
        .insert(eventData)

    if (error) {
        console.error('Failed to log event:', error)
        // Don't fail the request, just log error on backend (analytics shouldn't break app)
        return { success: false, error: error.message }
    }

    return { success: true }
})
