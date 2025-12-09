<template>
  <div class="dashboard-content">
    <!-- Stats Row -->
    <div class="stats-row">
      <WindowFrame title="Event Modes" class="stat-card event-mode-card">
        <div class="mode-controls">
          <select v-model="eventMode" class="retro-select">
            <option>Pre-Show</option>
            <option>Live Event</option>
            <option>Afterparty</option>
            <option>Quiet Mode</option>
          </select>
          <RetroButton @click="applyMode" :disabled="saving" class="apply-btn">
            {{ saving ? '...' : 'Apply' }}
          </RetroButton>
        </div>
        <div class="mode-status" :class="{ visible: saveMessage }">
          {{ saveMessage || 'Ready' }}
        </div>
      </WindowFrame>
      <WindowFrame title="System Status" class="stat-card">
        <div class="stat-value ok">OK</div>
        <div class="stat-label">All Systems Go</div>
      </WindowFrame>
      <WindowFrame title="Pending Reports" class="stat-card">
        <div class="stat-value warning">3</div>
        <div class="stat-label">Needs Review</div>
      </WindowFrame>
    </div>

    <!-- Charts / Recent Activity Area -->
    <div class="content-grid">
      <div class="main-column">
        <WindowFrame title="Recent Activity" class="activity-window">
          <div class="activity-list">
            <div class="activity-item">
              <span class="time">10:42 AM</span>
              <span class="user">User123</span>
              <span class="action">joined room "General"</span>
            </div>
            <div class="activity-item">
              <span class="time">10:40 AM</span>
              <span class="user">Admin</span>
              <span class="action">updated House Controls</span>
            </div>
            <div class="activity-item">
              <span class="time">10:35 AM</span>
              <span class="user">Guest_99</span>
              <span class="action">registered new account</span>
            </div>
          </div>
        </WindowFrame>
      </div>
      
      <div class="side-column">
        <WindowFrame title="Aesthetics" class="aesthetics-window">
          <div class="aesthetics-content">
            <div class="form-group">
              <label>Border Style</label>
              <select v-model="settings.window_border_style" class="retro-select">
                <option>System95</option>
                <option>Hard Pixel</option>
                <option>SlateShell</option>
                <option>VaporMesh</option>
              </select>
            </div>
            <div class="form-group">
              <label>Color Theme</label>
              <select v-model="settings.color_theme" class="retro-select">
                <option>Teal Base</option>
                <option>Graphite</option>
                <option>Noir Terminal</option>
                <option>CRT Glow</option>
              </select>
            </div>
            <div class="form-group">
              <label>Admin Badge</label>
              <select v-model="settings.admin_badge_style" class="retro-select">
                <option>Key Icon</option>
                <option>Star Icon</option>
                <option>System Icon</option>
              </select>
            </div>
            <div class="apply-bar">
              <RetroButton @click="saveSettings" :disabled="saving" class="full-width">
                {{ saving ? 'Saving...' : 'Apply Theme' }}
              </RetroButton>
            </div>
          </div>
        </WindowFrame>

        <WindowFrame title="Server Load" class="chart-window">
          <div class="mock-chart">
            <div class="bar" style="height: 40%"></div>
            <div class="bar" style="height: 60%"></div>
            <div class="bar" style="height: 30%"></div>
            <div class="bar" style="height: 80%"></div>
            <div class="bar" style="height: 50%"></div>
            <div class="bar" style="height: 70%"></div>
            <div class="bar" style="height: 45%"></div>
          </div>
        </WindowFrame>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'admin'
})

const eventMode = ref('Live Event')
const saving = ref(false)
const saveMessage = ref('')

const settings = ref({
  window_border_style: 'System95',
  color_theme: 'Teal Base',
  scanline_intensity: 0,
  admin_badge_style: 'Star Icon'
})

const fetchSettings = async () => {
  try {
    const data = await $fetch('/api/admin/house-controls')
    if (data) {
      if (data.event_mode) eventMode.value = data.event_mode
      settings.value = { ...settings.value, ...data }
    }
  } catch (e) {
    console.error('Failed to load settings', e)
  }
}

const applyMode = async () => {
  try {
    saving.value = true
    await $fetch('/api/admin/house-controls', {
      method: 'POST',
      body: { event_mode: eventMode.value }
    })
    saveMessage.value = 'Mode Updated!'
    setTimeout(() => saveMessage.value = '', 3000)
  } catch (e) {
    saveMessage.value = 'Error!'
    console.error(e)
  } finally {
    saving.value = false
  }
}

const saveSettings = async () => {
  try {
    saving.value = true
    await $fetch('/api/admin/house-controls', {
      method: 'POST',
      body: settings.value
    })
    saveMessage.value = 'Theme Applied!'
    setTimeout(() => saveMessage.value = '', 3000)
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  height: 100px;
}

.stat-card {
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    margin-top: 10px;
    
    &.ok { color: green; }
    &.warning { color: #808000; }
  }
  
  .stat-label {
    font-size: 12px;
    text-align: center;
    color: #666;
  }
}

.event-mode-card {
  .mode-controls {
    display: flex;
    gap: 8px;
    padding: 10px;
    align-items: center;
    justify-content: center;
  }

  .retro-select {
    @include retro-input;
    padding: 4px;
    height: 28px;
    flex: 1;
    font-size: 12px;
  }

  .apply-btn {
    min-width: 60px;
    font-size: 11px;
  }

  .mode-status {
    text-align: center;
    font-size: 10px;
    color: #666;
    height: 12px;
    opacity: 0;
    transition: opacity 0.3s;
    
    &.visible {
      opacity: 1;
      color: green;
      font-weight: bold;
    }
  }
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 15px;
  min-height: 0;
}

.main-column {
  height: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 2px; /* Reduced from 5px */
}

.side-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
}

.activity-window {
  height: 100%;
}

.aesthetics-content {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Reduced from 10px */
  padding: 6px; /* Reduced from 10px */
}

.chart-window {
  flex: 1;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.activity-item {
  display: flex;
  gap: 10px;
  padding: 4px;
  border-bottom: 1px dotted #ccc;
  
  .time { color: #666; }
  .user { font-weight: bold; color: #000080; }
}

.mock-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  background: white;
  
  .bar {
    width: 10%;
    background-color: #000080;
    border: 1px solid black;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
  }
}
</style>


