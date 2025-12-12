import { typingManager } from '../../utils/typing-manager'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const clientId = getRequestHeader(event, 'x-client-id') || 'unknown'

    // We use client-id as a proxy for user-id for anonymous typing tracking
    // This is sufficient for the "Someone is typing" feature
    if (!clientId) {
        throw createError({ statusCode: 400, message: 'Missing Client ID' })
    }

    const action = body.status === 'start' ? 'start' : 'stop'

    const result = await typingManager.handleTyping(event, ip, clientId, action)

    if (!result.allowed) {
        if (result.mutedUntil) {
            throw createError({
                statusCode: 429,
                message: 'You are doing that too much.',
                data: { mutedUntil: result.mutedUntil }
            })
        }
    }

    return { success: true, isActive: result.isActive }
})
