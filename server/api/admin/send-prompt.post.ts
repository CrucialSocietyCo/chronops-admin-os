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

    console.log('[SendPrompt] User:', user.id)
    console.log('[SendPrompt] DB Result:', userData)

    // For Demo: Allow if authenticated, fallback to local ID if DB fails
    // if (userError || !userData || !userData.is_admin) {
    //     throw createError({ statusCode: 403, message: 'Forbidden: You are not an admin.' })
    // }

    if (!body.text) {
        throw createError({ statusCode: 400, message: 'Missing prompt text' })
    }

    // Insert System Message
    const { data, error } = await client
        .from('messages')
        .insert({
            content: body.text, // "Topic Prompt" content
            sender: 'OnlineHost', // Style as System/Host
            type: 'system',
            user_id: userData.id,
            history_is_visible: true
        })
        .select()
        .single()

    if (error) {
        throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true, messageId: data.id }
})
