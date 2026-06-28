import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const user = await serverSupabaseUser(event)

    console.log('[Pinned DELETE] Request received for id:', id)

    if (!id || typeof id !== 'string') {
        console.warn('[Pinned DELETE] Missing pinned item id')
        throw createError({ statusCode: 400, message: 'Pinned item id is required' })
    }

    if (!user) {
        console.warn('[Pinned DELETE] Unauthorized request for id:', id)
        throw createError({ statusCode: 401, message: 'Unauthorized: admin session required' })
    }

    const userId = user.id || user.sub
    if (!userId) {
        console.warn('[Pinned DELETE] Auth user did not include an id')
        throw createError({ statusCode: 401, message: 'Unauthorized: invalid admin session' })
    }

    const client = serverSupabaseServiceRole(event)
    if (!client) {
        console.error('[Pinned DELETE] Supabase service role client is unavailable')
        throw createError({ statusCode: 500, message: 'Server configuration error: Supabase service role is unavailable' })
    }

    const { data: userData, error: userError } = await client
        .from('users')
        .select('is_admin')
        .eq('supabase_user_id', userId)
        .single()

    if (userError) {
        console.error('[Pinned DELETE] Admin verification failed:', userError)
        throw createError({ statusCode: 500, message: `Failed to verify admin permissions: ${userError.message}` })
    }

    if (!userData?.is_admin) {
        console.warn('[Pinned DELETE] Forbidden delete attempt by user:', user.email || userId)
        throw createError({ statusCode: 403, message: 'Forbidden: admin permissions required' })
    }

    const { data, error } = await client
        .from('pinned_items')
        .delete()
        .eq('id', id)
        .select('id, type')

    if (error) {
        console.error('[Pinned DELETE] Supabase delete failed:', {
            id,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        })
        throw createError({ statusCode: 500, message: `Failed to delete pinned item: ${error.message}` })
    }

    if (!data || data.length === 0) {
        console.warn('[Pinned DELETE] No pinned item row deleted for id:', id)
        throw createError({ statusCode: 404, message: `Pinned item not found: ${id}` })
    }

    console.log('[Pinned DELETE] Deleted pinned item:', data[0])

    return {
        success: true,
        deletedId: data[0].id,
        message: 'Pinned item deleted successfully'
    }
})
