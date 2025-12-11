export default defineEventHandler((event) => {
    const allowedOrigins = [
        'http://localhost:5173',
        'https://chronops-retrochat-vue.vercel.app',
        'https://southmain.app',
        'https://www.southmain.app'
    ]
    const origin = getRequestHeader(event, 'origin')

    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
        setResponseHeaders(event, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
            'Access-Control-Allow-Credentials': 'true'
        })
    }

    if (getMethod(event) === 'OPTIONS') {
        event.node.res.statusCode = 204
        event.node.res.statusMessage = 'No Content'
        return 'OK'
    }
})
