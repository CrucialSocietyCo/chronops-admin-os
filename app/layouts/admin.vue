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
      <!-- Mobile Menu Toggle (Only visible on mobile) -->
      <div class="mobile-menu-toggle" @click="toggleSidebar">
          <img src="https://win98icons.alexmeub.com/icons/png/computer_explorer-0.png" />
          <span>Menu</span>
      </div>

      <!-- Backdrop for mobile sidebar -->
      <div class="sidebar-backdrop" 
           :class="{ 'visible': isSidebarOpen }" 
           @click="closeMobileSidebar">
      </div>

      <div class="sidebar" :class="{ 'mobile-hidden': !isSidebarOpen, 'mobile-visible': isSidebarOpen }">
        <WindowFrame title="Menu" class="sidebar-window">
          <!-- Close button for mobile -->
          <div class="mobile-close-btn" @click="toggleSidebar">x</div>
          
          <nav class="nav-menu">
            <NuxtLink to="/admin/dashboard" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">📊</span> Dashboard
            </NuxtLink>
            <NuxtLink to="/admin/events" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">📅</span> Events Management
            </NuxtLink>
            <NuxtLink to="/admin/users" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">👥</span> Users
            </NuxtLink>
            <NuxtLink to="/admin/house-controls" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">🏠</span> House Controls
            </NuxtLink>
            <NuxtLink to="/admin/analytics" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">📈</span> Live Analytics
            </NuxtLink>
            <NuxtLink to="/admin/moderation" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">🛡️</span> Moderation
            </NuxtLink>
            <NuxtLink to="/admin/system-health" class="nav-item" active-class="active" @click="closeMobileSidebar">
              <span class="icon">💻</span> System Health
            </NuxtLink>
            <NuxtLink to="/admin/settings" class="nav-item" active-class="active" @click="closeMobileSidebar">
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
        <span class="start-text">Society on South Main</span>
      </NuxtLink>
      <div class="right-controls">
        <button @click="handleLogout" class="logout-button">
          <img src="https://win98icons.alexmeub.com/icons/png/key_padlock-0.png" alt="logout" />
          <span class="logout-text">Log Off</span>
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
const isSidebarOpen = ref(false)

// Shared Theme State
const currentTheme = useState('adminTheme', () => 'Teal Base')

const themeMap: Record<string, string> = {
  'Teal Base': '#008080',
  'Graphite': '#2F4F4F',
  'Noir Terminal': '#000000',
  'CRT Glow': '#1a0526' 
}

const backgroundColor = computed(() => themeMap[currentTheme.value] || '#008080')

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
}

const closeMobileSidebar = () => {
    isSidebarOpen.value = false
}

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
  position: relative; /* Context for absolute sidebar */
}

/* Mobile Toggle */
.mobile-menu-toggle {
    display: none; /* Hidden on desktop */
    padding: 6px 10px;
    background: #c0c0c0;
    border: 2px outset #fff;
    cursor: pointer;
    align-items: center;
    gap: 6px;
    font-weight: bold;
    user-select: none;
    margin-bottom: 10px;
    
    &:active {
        border-style: inset;
    }
    
    img { width: 16px; height: 16px; }
}

.sidebar-backdrop {
    display: none;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  height: 100%;
  z-index: 200;
  transition: transform 0.3s ease;
}

.mobile-close-btn { display: none; }

@media (max-width: 768px) {
  .main-container {
      flex-direction: column;
  }

  .mobile-menu-toggle {
      display: flex;
      width: fit-content;
  }

  .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 250px; /* Slightly wider for ease of use */
      background: #c0c0c0;
      box-shadow: 4px 0 10px rgba(0,0,0,0.5);
      
      /* Hidden Logic */
      transform: translateX(-110%);
      
      &.mobile-visible {
          transform: translateX(0);
      }
  }

  .sidebar-backdrop {
      display: block;
      position: absolute; /* Cover the main container */
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.4); /* Dim the background */
      z-index: 150; /* Below sidebar (200) */
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      
      &.visible {
          opacity: 1;
          pointer-events: auto;
      }
  }

  .mobile-close-btn {
      display: block;
      position: absolute;
      top: 2px;
      right: 2px;
      width: 20px;
      height: 20px;
      background: red;
      color: white;
      text-align: center;
      line-height: 20px;
      cursor: pointer;
      font-weight: bold;
      border: 1px outset white;
  }
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
  border-top: 1px solid white;

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
  
  @media (max-width: 600px) {
      .start-text, .logout-text { display: none; }
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
  border-bottom: 1px solid white;
  box-shadow: 0 1px 0 #808080;

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
      white-space: nowrap;
      overflow-x: auto;
      
      /* Hide scrollbar */
      scrollbar-width: none; 
      -ms-overflow-style: none;
      &::-webkit-scrollbar { display: none; }
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
