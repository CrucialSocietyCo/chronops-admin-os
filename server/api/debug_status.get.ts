import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = serverSupabaseServiceRole(event)
    const { data } = await client.from('moderation_settings').select('*').eq('room_id', 'global').single()
    return { settings: data }
})
