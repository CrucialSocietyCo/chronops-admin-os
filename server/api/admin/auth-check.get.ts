import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // Handle OPTIONS request for CORS explicitly if needed, though Nuxt routeRules should handle it.
    if (event.method === 'OPTIONS') {
        setResponseHeaders(event, {
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
        })
        return 'OK'
    }

    const user = await serverSupabaseUser(event)

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    return {
        authenticated: true,
        user: {
            id: user.id,
            email: user.email
        }
    }
})
