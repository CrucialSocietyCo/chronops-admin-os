export default defineEventHandler((event) => {
    // Add CORS headers explicitly or rely on routeRules?
    // Best to be explicit since routeRules failed us.
    setResponseHeaders(event, {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
    })

    return null // 204 No Content implied or 200 OK with no body
})
