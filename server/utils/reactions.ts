import { SupabaseClient } from '@supabase/supabase-js'

export const VALID_REACTIONS = ['like', 'love', 'laugh', 'shock', 'angry', 'eyes']

export async function getReactionCounts(client: SupabaseClient, messageId: string) {
    const { data, error } = await client
        .from('chat_message_reactions')
        .select('reaction_type')
        .eq('message_id', messageId)

    if (error) throw error

    const counts = {
        like: 0,
        love: 0,
        laugh: 0,
        shock: 0,
        angry: 0,
        eyes: 0
    }

    data.forEach((row: any) => {
        if (counts[row.reaction_type as keyof typeof counts] !== undefined) {
            counts[row.reaction_type as keyof typeof counts]++
        }
    })

    return counts
}
