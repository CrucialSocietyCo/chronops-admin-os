// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/supabase'],
  supabase: {
    redirect: {
      login: '/',
      callback: '/confirm',
    }
  },
  css: ['~/assets/scss/main.scss'],
  routeRules: {
    '/api/**': { cors: true }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/_variables.scss" as *;'
        }
      }
    }
  }
})
