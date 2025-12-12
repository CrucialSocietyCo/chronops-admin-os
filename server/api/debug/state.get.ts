
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = serverSupabaseServiceRole(event)

    // 1. Get Active Event
    const { data: activeEvent } = await client.from('events').select('*').eq('is_active', true)

    // 2. Get Last 5 Messages (Raw)
    const { data: lastMessages } = await client.from('messages').select('*').order('created_at', { ascending: false }).limit(5)

    return {
        activeEvents: activeEvent, // Should be array of 1 (or 0)
        lastMessages: lastMessages
    }
})
