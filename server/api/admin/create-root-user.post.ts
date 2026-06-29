export default defineEventHandler(async (event) => {
  setResponseStatus(event, 403)
  return {
    error: 'Admin registration is disabled. Existing admins must log in.'
  }
})
