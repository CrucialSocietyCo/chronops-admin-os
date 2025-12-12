import { logAnalyticsEvent } from '../../utils/analytics-logger'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const clientId = getRequestHeader(event, 'x-client-id')

    // Validate Event
    const { eventName, payload } = body
    if (!eventName) {
        throw createError({ statusCode: 400, message: 'Missing eventName' })
    }

    // Call Logger
    // Context is derived from request headers inside logger, 
    // but we pass known client-id from body or header explicitly if needed.
    await logAnalyticsEvent(event, eventName, {
        clientId,
        payload
    })

    return { success: true }
})
