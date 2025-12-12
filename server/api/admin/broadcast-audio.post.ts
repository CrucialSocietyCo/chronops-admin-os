import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    const client = serverSupabaseServiceRole(event)

    if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

    const body = await readBody(event)
    const { url, duration } = body

    if (!url) throw createError({ statusCode: 400, message: 'Missing URL' })

    // 1. Resolve Admin User ID (Service Role to bypass RLS)
    const { data: adminUser } = await client.from('users').select('id, is_admin').eq('supabase_user_id', user.id).single()

    if (!adminUser?.is_admin) {
        throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    // 2. Resolve Active Event
    const { data: activeEvent } = await client.from('events').select('id').eq('is_active', true).single()
    const eventId = activeEvent?.id || null

    // 3. Insert Message
    // usage: type='system', payload={ subtype: 'audio_drop', ... }
    const { data, error } = await client.from('messages').insert({
        content: '🎤 Admin Voice Drop',
        sender: 'Admin',
        type: 'system',
        payload: {
            subtype: 'audio_drop',
            url: url,
            duration: duration
        },
        user_id: adminUser.id,
        event_id: eventId,
        history_is_visible: true
    }).select().single()

    if (error) {
        console.error('Broadcast Error:', error)
        throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true, messageId: data.id }
})
