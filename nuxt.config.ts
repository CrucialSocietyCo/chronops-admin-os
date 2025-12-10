// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/supabase'],

  supabase: {
    redirect: false,
    // types: './app/types/database.types.ts',
  },


  runtimeConfig: {
    public: {
      chatUrl: process.env.NUXT_PUBLIC_CHAT_URL || 'http://localhost:5173'
    }
  },

  css: ['~/assets/scss/main.scss'],

  routeRules: {
    '/api/**': {
      cors: true,
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/_variables.scss" as *;',
        },
      },
    },
  },
})
