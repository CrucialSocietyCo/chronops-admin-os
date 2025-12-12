import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const results: any = { steps: [] }
    try {
        results.steps.push('1. Start')

        const client = await serverSupabaseClient(event)
        results.steps.push('2. Client Init')

        // Fetch 1 message
        results.steps.push('3. Fetching 1 Message...')
        const { data: messages, error: msgError } = await client
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

        if (msgError) {
            results.steps.push('3. Error: ' + msgError.message)
            return results
        }
        results.steps.push(`3. Success: Found ${messages?.length || 0} messages`)

        if (messages && messages.length > 0) {
            const msg = messages[0]
            results.steps.push(`4. Message ID: ${msg.id}, User ID: ${msg.user_id}`)

            // Test User Fetch
            results.steps.push('5. Fetching User...')
            const { data: users, error: userError } = await client
                .from('users')
                .select('id, name')
                .eq('id', msg.user_id)
                .single()

            if (userError) {
                results.steps.push('5. Error: ' + userError.message)
            } else {
                results.steps.push(`5. Success: User ${users?.name}`)
            }
        }

        return results

    } catch (e: any) {
        results.error = e.message
        results.stack = e.stack
        return results
    }
})
