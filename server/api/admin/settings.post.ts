import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    const { id, ...updates } = body

    const { data: existing } = await client
        .from('system_settings')
        .select('id')
        .single()

    let query = client.from('system_settings')

    try {
        if (existing) {
            // Update existing
            const { data, error } = await query
                .update(updates)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Error updating system settings:', error)
                throw error
            }
            return data
        } else {
            // Insert new (should rarely happen if GET creates default)
            const { data, error } = await query
                .insert(updates)
                .select()
                .single()

            if (error) {
                console.error('Error inserting system settings:', error)
                throw error
            }
            return data
        }
    } catch (e: any) {
        console.error('Unexpected error in settings.post:', e)
        throw createError({
            statusCode: 500,
            statusMessage: e.message || 'Failed to save system settings',
        })
    }
})
