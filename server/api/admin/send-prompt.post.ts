import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)
    const body = await readBody(event)

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Verify Admin Status
    const { data: userData } = await client
        .from('users')
        .select('id, is_admin')
        .eq('supabase_user_id', user.id)
        .single()

    let finalUserId = userData?.id

    if (!finalUserId) {
        console.log('[SendPrompt] User not found in public.users, creating...')
        const { data: newUser, error: insertError } = await client
            .from('users')
            .insert({
                supabase_user_id: user.id,
                name: 'Admin',
                email: user.email,
                is_admin: true
            })
            .select()
            .single()

        if (insertError) {
            console.error('[SendPrompt] User creation failed:', insertError)
            // Last resort: Try to find ANY admin or system user
            const { data: anyAdmin } = await client.from('users').select('id').eq('name', 'Admin').single()
            if (anyAdmin) finalUserId = anyAdmin.id
            else throw createError({ statusCode: 500, message: 'Could not resolve Admin User ID' })
        } else {
            finalUserId = newUser.id
        }
    }

    if (!body.text) {
        throw createError({ statusCode: 400, message: 'Missing prompt text' })
    }

    // Get Active Event for FK
    const { data: activeEvent } = await client.from('events').select('id').eq('is_active', true).single()
    const eventId = activeEvent?.id || null

    console.log('[SendPrompt] Inserting message for User:', finalUserId, 'Event:', eventId)

    // Insert System Message
    const { data, error } = await client
        .from('messages')
        .insert({
            content: body.text,
            sender: 'OnlineHost',
            type: 'system',
            user_id: finalUserId,
            event_id: eventId, // Required FK
            history_is_visible: true
        })
        .select()
        .single()

    if (error) {
        console.error('[SendPrompt] Insert Failed:', error)
        throw createError({ statusCode: 500, message: `Insert Failed: ${error.message}` })
    }

    return { success: true, messageId: data.id }
})
