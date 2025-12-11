<template>
  <div class="admin-desktop" :style="{ backgroundColor: backgroundColor }">
    <div class="address-bar">
      <span class="address-label">Address</span>
      <div class="address-input">
        <div class="breadcrumbs">
          <span v-for="(crumb, index) in breadcrumbs" :key="crumb.path" class="crumb-item">
            <NuxtLink :to="crumb.path" class="crumb-link">
              <img v-if="crumb.name === 'My Computer'" src="https://win98icons.alexmeub.com/icons/png/computer_explorer-0.png" class="crumb-icon" />
              <img v-else-if="crumb.path.includes('dashboard')" src="https://win98icons.alexmeub.com/icons/png/desktop-0.png" class="crumb-icon" />
              <img v-else src="https://win98icons.alexmeub.com/icons/png/folder_open-0.png" class="crumb-icon" />
              {{ crumb.name }}
            </NuxtLink>
            <span v-if="index < breadcrumbs.length - 1" class="separator"> ► </span>
          </span>
        </div>
      </div>
    </div>

    <div class="main-container">
      <div class="sidebar">
        <WindowFrame title="Menu" class="sidebar-window">
          <nav class="nav-menu">
            <NuxtLink to="/admin/dashboard" class="nav-item" active-class="active">
              <span class="icon">📊</span> Dashboard
            </NuxtLink>
            <NuxtLink to="/admin/events" class="nav-item" active-class="active">
              <span class="icon">📅</span> Event Management
            </NuxtLink>
            <NuxtLink to="/admin/users" class="nav-item" active-class="active">
              <span class="icon">👥</span> Users
            </NuxtLink>
            <NuxtLink to="/admin/house-controls" class="nav-item" active-class="active">
              <span class="icon">🏠</span> House Controls
            </NuxtLink>
            <NuxtLink to="/admin/moderation" class="nav-item" active-class="active">
              <span class="icon">🛡️</span> Moderation
            </NuxtLink>
            <NuxtLink to="/admin/system-health" class="nav-item" active-class="active">
              <span class="icon">💻</span> System Health
            </NuxtLink>
            <NuxtLink to="/admin/settings" class="nav-item" active-class="active">
              <span class="icon">⚙️</span> Settings
            </NuxtLink>
          </nav>
          
          <div class="quick-actions">
             <div class="action-label">Quick Actions</div>
             <RetroButton @click="enterChatAsAdmin" class="action-btn">
               💬 Enter Chat
             </RetroButton>
             <RetroButton @click="toggleChat" :class="{ 'active-state': isChatEnabled, 'inactive-state': !isChatEnabled }">
               {{ isChatEnabled ? 'Disable Chat' : 'Enable Chat' }}
             </RetroButton>
          </div>
        </WindowFrame>
      </div>

      <div class="desktop-area">
        <slot />
      </div>
    </div>

    <div class="start-menu-bar">
      <NuxtLink to="/admin/dashboard" class="start-button">
        <img src="https://win98icons.alexmeub.com/icons/png/windows_slanted-1.png" alt="logo" />
        Start
      </NuxtLink>
      <div class="right-controls">
        <button @click="handleLogout" class="logout-button">
          <img src="https://win98icons.alexmeub.com/icons/png/key_padlock-0.png" alt="logout" />
          Log Off
        </button>
        <div class="clock">{{ time }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const time = ref('')
let timer: NodeJS.Timer

const isChatEnabled = ref(false)
const settingsId = ref<number | null>(null)

// Shared Theme State
const currentTheme = useState('adminTheme', () => 'Teal Base')

const themeMap: Record<string, string> = {
  'Teal Base': '#008080',
  'Graphite': '#2F4F4F',
  'Noir Terminal': '#000000',
  'CRT Glow': '#1a0526' 
}

const backgroundColor = computed(() => themeMap[currentTheme.value] || '#008080')


const fetchSettings = async () => {
  try {
    const data = await $fetch('/api/admin/house-controls')
    if (data) {
      isChatEnabled.value = data.is_chat_enabled
      settingsId.value = data.id
    }
  } catch (e) {
    console.error('Failed to fetch settings', e)
  }
}

const toggleChat = async () => {
  try {
    const newValue = !isChatEnabled.value
    await $fetch('/api/admin/house-controls', {
      method: 'POST',
      body: {
        id: settingsId.value,
        is_chat_enabled: newValue
      }
    })
    isChatEnabled.value = newValue
  } catch (e) {
    console.error('Failed to toggle chat', e)
    alert('Failed to toggle chat status')
  }
}

const enterChatAsAdmin = async () => {
  try {
    // Open IMMEDIATELY to bypass browser popup blockers
    const config = useRuntimeConfig()
    const session = useSupabaseSession()
    
    // Construct URL with auth_token
    const url = new URL(config.public.chatUrl)
    if (session.value?.access_token) {
      url.searchParams.set('auth_token', session.value.access_token)
    }
    
    // DEBUG: Show user the URL before opening
    alert(`Debug: Opening Chat at ${url.toString()}`)
    
    window.open(url.toString(), '_blank')
  } catch (e) {
    console.error('Failed to open chat', e)
    alert('Error opening chat: ' + e.message)
  }
}

const updateTime = () => {
  const now = new Date()
  time.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error logging out:', error)
  router.push('/login')
}

const breadcrumbs = computed(() => {
  const path = route.path
  const parts = path.split('/').filter(p => p)
  
  const crumbs = []
  let currentPath = ''
  
  for (const part of parts) {
    currentPath += `/${part}`
    
    // Skip 'dashboard' as it's redundant with 'My Computer'
    if (part === 'dashboard') continue

    let name = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
    let crumbPath = currentPath
    
    if (part === 'admin') {
      name = 'My Computer'
      crumbPath = '/admin/dashboard'
    }
    
    crumbs.push({
      name,
      path: crumbPath
    })
  }
  return crumbs
})

onMounted(async () => {
  updateTime()
  fetchSettings()
  timer = setInterval(updateTime, 1000)
  // Initial fetch for theme
  const { data } = await useFetch('/api/admin/house-controls')
  if (data.value) {
    if (data.value.is_chat_enabled !== undefined) isChatEnabled.value = data.value.is_chat_enabled
    if (data.value.id) settingsId.value = data.value.id
    if (data.value.color_theme) currentTheme.value = data.value.color_theme
  }
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.admin-desktop {
  height: 100vh;
  /* Dynamic style handled in template */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background-color 0.5s ease;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 10px;
  gap: 10px;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  height: 100%;
}

.sidebar-window {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  text-decoration: none;
  color: black;
  border: 1px solid transparent;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 14px;

  &:hover {
    background-color: #000080;
    color: white;
  }

  &.active {
    background-color: #000080;
    color: white;
    font-weight: bold;
  }

  .icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
}

.quick-actions {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-label {
  font-size: 12px;
  font-weight: bold;
  color: #666;
}

.active-state {
  background-color: #e6ffe6 !important;
  border: 2px inset white !important;
}

.inactive-state {
  background-color: #ffe6e6 !important;
}

.desktop-area {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.start-menu-bar {
  @include retro-border-outset;
  height: 28px;
  background-color: $bg-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px;
  z-index: 1000;
  border-top: 1px solid white; /* Ensure top border for bottom bar */

  .start-button {
    @include retro-button;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    padding: 2px 6px;
    text-decoration: none;
    color: black;
    
    img {
      width: 16px;
      height: 16px;
    }
  }

  .right-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logout-button {
    @include retro-button;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    padding: 2px 6px;
    
    img {
      width: 16px;
      height: 16px;
    }
  }

  .clock {
    @include retro-border-inset;
    padding: 2px 8px;
    margin-right: 2px;
    font-size: 12px;
  }
}

.address-bar {
  background-color: $bg-color;
  padding: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid white; /* Changed from border-top to border-bottom */
  box-shadow: 0 1px 0 #808080; /* Shadow below */

  .address-label {
    font-size: 12px;
    color: #404040;
  }

  .address-input {
    @include retro-border-inset;
    flex: 1;
    background: white;
    padding: 2px 4px;
    display: flex;
    align-items: center;
    height: 20px;
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    font-size: 12px;
  }

  .crumb-item {
    display: flex;
    align-items: center;
  }

  .crumb-link {
    display: flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    color: black;
    padding: 0 4px;

    &:hover {
      background-color: #000080;
      color: white;
    }
  }

  .crumb-icon {
    width: 14px;
    height: 14px;
  }

  .separator {
    color: #808080;
    margin: 0 2px;
    font-size: 10px;
  }
}
</style>
