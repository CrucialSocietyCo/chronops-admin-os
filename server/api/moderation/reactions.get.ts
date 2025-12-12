import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // 1. Check Admin Auth (Session cookie or similar check)
    // For MVP we assume the layout/middleware handles auth or we check context
    // Ideally we verify the user is an admin here.

    // 2. Fetch Data
    const client = serverSupabaseServiceRole(event)
    if (!client) throw createError({ statusCode: 500, message: "No service client" })

    // Top Reacted Messages (simplified: just fetch all reactions and aggregate in memory for MVP, 
    // or use a view if scale was large. For <10k reactions, in-memory is fine. For >10k, needs SQL view)
    // Let's use a raw RPC or just fetch the raw table constrained by time if possible.
    // Actually, let's just fetch the last 1000 reactions for the "Trend" chart
    // And groupings for "Top".

    // For MVP, we'll fetch the `chat_message_reactions` and `messages` joined?
    // Supabase join syntax:
    const { data: reactions, error } = await client
        .from('chat_message_reactions')
        .select(`
            reaction_type,
            created_at,
            messages (
                id,
                content,
                sender,
                created_at
            )
        `)
        .order('created_at', { ascending: false })
        .limit(500) // Recent 500 reactions

    if (error) throw error

    // Process Data
    const topMessagesMap = new Map()
    const recentActivity = []

    reactions.forEach((r: any) => {
        const msg = r.messages
        if (!msg) return

        if (!topMessagesMap.has(msg.id)) {
            topMessagesMap.set(msg.id, {
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                total: 0,
                breakdown: {}
            })
        }

        const entry = topMessagesMap.get(msg.id)
        entry.total++
        entry.breakdown[r.reaction_type] = (entry.breakdown[r.reaction_type] || 0) + 1

        recentActivity.push({
            date: r.created_at,
            type: r.reaction_type,
            msgPreview: msg.content.substring(0, 30)
        })
    })

    const topMessages = Array.from(topMessagesMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)

    // Alert Handling (High Negative Sentiment)
    const alerts = topMessages.filter(m => {
        const angry = m.breakdown['angry'] || 0
        const shock = m.breakdown['shock'] || 0
        return (angry + shock) > 3 // Threshold
    })

    return {
        topMessages,
        recentActivity, // For charts
        alerts
    }
})
