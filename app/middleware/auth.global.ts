export default defineNuxtRouteMiddleware((to, _from) => {
    const user = useSupabaseUser()

    // Allow access to login page
    if (to.path === '/login') {
        if (user.value) {
            return navigateTo('/admin/dashboard')
        }
        return
    }

    // Protect admin routes
    if (to.path.startsWith('/admin')) {
        if (!user.value) {
            return navigateTo('/')
        }
    }
})
