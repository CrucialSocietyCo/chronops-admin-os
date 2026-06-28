import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const id = event.context.params?.id
    const body = await readBody(event)

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID required' })
    }

    // If setting active, deactivate others first
    if (body.is_active === true) {
        console.log(`[Events API] Activating Event ${id}. Deactivating others...`)

        // Safety: Update ALL other events to inactive
        const { error: deactivateError } = await client
            .from('events')
            .update({ is_active: false })
            .neq('id', id) // Use raw ID (string) to support both UUIDs and Ints safely

        if (deactivateError) {
            console.error('[Events API] Failed to deactivate other events:', deactivateError)
        }
    }

    // Prepare update object
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.status !== undefined) updateData.status = body.status
    if (body.show_chat_history !== undefined) updateData.show_chat_history = body.show_chat_history
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.window_title !== undefined) updateData.window_title = body.window_title
    if (body.show_ads !== undefined) updateData.show_ads = body.show_ads
    else if (body.show_sponsored !== undefined) updateData.show_ads = body.show_sponsored

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await client
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }

    return data
})
