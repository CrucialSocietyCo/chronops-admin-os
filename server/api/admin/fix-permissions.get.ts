import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
        return { error: 'Not logged in' }
    }

    // Update the public user record for this auth user
    const { data, error } = await client
        .from('users')
        .update({ is_admin: true })
        .eq('supabase_user_id', user.id)
        .select()

    return {
        message: 'Permissions updated',
        user: data,
        error
    }
})
