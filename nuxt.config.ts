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
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    public: {
      chatUrl: process.env.NUXT_PUBLIC_CHAT_URL || 'https://southmain.app'
    }
  },
  // Force restart 2025-12-10
  app: {
    head: {
      title: 'Society on South Main - Admin',
      link: [
        { rel: 'icon', type: 'image/jpeg', href: '/favicon_admin.jpg' }
      ],
      meta: [
        { property: 'og:title', content: 'Society on South Main - Admin' },
        { property: 'og:description', content: 'Administrative Dashboard for Society on South Main.' },
        { property: 'og:image', content: 'https://api.southmain.app/og-image.png' },
        { property: 'og:type', content: 'website' }
      ]
    }
  },

  css: [
    '~/assets/scss/main.scss',
    '~/assets/scss/themes/dragon-fire-cult.css',
  ],

  // We utilize server/middleware/cors.ts for granular CORS control
  // '/api/**': { cors: true },

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
