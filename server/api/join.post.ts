import { handleUserJoin } from '../utils/southmain-mod'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
    const referrer = body.referrer || null

    const decision = await handleUserJoin({
        ip,
        userAgent,
        referrer
    })

    if (!decision.allow) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Join Rejected',
            data: { reason: decision.reason }
        })
    }

    return decision
})
