import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // Remove ID from body to avoid updating it if it's not meant to be changed or if it's missing
    const { id, ...updates } = body

    // We assume there's only one settings row, so we fetch it first to get the ID, or just upsert if we know the ID is 1 (but we don't).
    // Better approach: fetch the single row, then update it.

    const { data: existing } = await client
        .from('chat_settings')
        .select('id')
        .single()

    let query = client.from('chat_settings')

    try {
        if (existing) {
            // Update existing
            const { data, error } = await query
                .update(updates)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Error updating settings:', error)
                throw error
            }
            return data
        } else {
            // Insert new
            const { data, error } = await query
                .insert(updates)
                .select()
                .single()

            if (error) {
                console.error('Error inserting settings:', error)
                throw error
            }
            return data
        }
    } catch (e: any) {
        console.error('Unexpected error in house-controls.post:', e)
        throw createError({
            statusCode: 500,
            statusMessage: e.message || 'Failed to save settings',
        })
    }
})
