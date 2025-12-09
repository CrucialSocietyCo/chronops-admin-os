import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // Create auth user first (this would typically be done via Supabase Admin API or client-side signup)
    // For now, we'll assume we're creating a public user profile, 
    // but in a real app we'd need to handle the auth user creation too.
    // Since we have a trigger, creating an auth user creates a public user.
    // So this endpoint might be for updating or manual creation if triggers aren't used.

    // Let's assume this is for updating or creating a user profile manually
    const { data, error } = await client
        .from('users')
        .insert(body)
        .select()
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create user',
        })
    }

    return data
})
