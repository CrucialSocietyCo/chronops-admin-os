export default defineNuxtRouteMiddleware((to, from) => {
    // Allow API routes, login, and confirm pages
    if (to.path.startsWith('/api') || to.path === '/login' || to.path === '/confirm') {
        return
    }

    const user = useSupabaseUser()

    if (!user.value) {
        return navigateTo('/login')
    }
})
