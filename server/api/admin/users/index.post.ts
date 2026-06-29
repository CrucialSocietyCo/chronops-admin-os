export default defineEventHandler(async (event) => {
    setResponseStatus(event, 403)
    return {
        error: 'Admin user creation is disabled. Existing admins must log in.'
    }
})
