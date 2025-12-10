import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)

    // 1. Reset ALL events to inactive
    const { error } = await client
        .from('events')
        .update({ is_active: false })
        .neq('id', 0) // updates all rows

    if (error) {
        return { success: false, error: error.message }
    }

    return {
        success: true,
        message: 'All events have been reset to Inactive. Please go to the Admin Dashboard and activate ONE event.'
    }
})
