import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    // DEBUG: Log headers to check for Auth Cookie
    const headers = getRequestHeaders(event)
    console.log('[Pinned POST] Cookie Header:', headers.cookie ? 'Present' : 'Missing')
    console.log('[Pinned POST] Auth Header:', headers.authorization ? 'Present' : 'Missing')

    const user = await serverSupabaseUser(event)

    // DEBUG: Log full user object to diagnose the 'ID: undefined' issue
    console.log('[Pinned POST] Raw User Object Type:', typeof user)
    if (user) console.log('[Pinned POST] User Keys:', Object.keys(user))

    // Fallback: serverSupabaseUser in strict mode might return 'sub' instead of 'id'
    const userId = user?.id || user?.sub

    if (!user || !userId) {
        console.error('[Pinned POST] Invalid session: User or User ID is missing.')
        throw createError({ statusCode: 401, message: 'Unauthorized: Invalid Session' })
    }

    // Initialize Service Role Client to bypass RLS for Admin Check
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    console.log('[Pinned POST] Config - URL:', supabaseUrl, 'Service Key Present:', !!serviceKey)

    if (!supabaseUrl || !serviceKey) {
        throw createError({ statusCode: 500, message: 'Server Config Error: Missing Service Key' })
    }

    const client = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    // Admin Check (Bypassing RLS)
    const { data: userData, error: userError } = await client.from('users').select('is_admin, email').eq('supabase_user_id', userId).single()

    console.log('[Pinned POST] Admin Check - Email:', user.email, 'Is Admin:', userData?.is_admin)

    if (userError) {
        console.error('[Pinned POST] DB Error:', userError)
        // Fallback: If verifying admin fails, deny.
        throw createError({ statusCode: 500, message: 'Failed to verify admin permissions' })
    }

    if (!userData?.is_admin) {
        console.warn('[Pinned POST] Access denied for user:', user.email)
        throw createError({ statusCode: 403, message: 'Forbidden: You are not an admin.' })
    }

    const body = await readBody(event)
    const { type, content, is_active, order_index, start_time, end_time } = body

    if (!type || !content) {
        throw createError({ statusCode: 400, message: 'Missing required fields' })
    }

    // Sanitize Dates (Handle empty strings from HTML inputs)
    const validStart = (start_time && start_time !== '') ? start_time : null
    const validEnd = (end_time && end_time !== '') ? end_time : null

    // Sanitize Content (Ensure JSON Object)
    let validContent = content
    if (typeof content === 'string') {
        // If it's a raw string, wrap it based on common usage
        // PinnedBar expects .text for most types
        validContent = { text: content }
    }

    const { data, error } = await client.from('pinned_items').insert({
        type,
        content: validContent,
        is_active: is_active ?? true,
        order_index: order_index ?? 0,
        start_time: validStart,
        end_time: validEnd
    }).select().single()

    if (error) {
        console.error('[Pinned POST] DB Insert Error:', JSON.stringify(error, null, 2))
        throw createError({ statusCode: 500, message: error.message })
    }

    return { item: data }
})
