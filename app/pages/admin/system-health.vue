<template>
  <div class="system-health-page">
    <WindowFrame title="System Health Monitor" width="600px">
      <div class="health-content">
        <div v-if="loading" class="loading">Analyzing system...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else class="stats-grid">
          
          <!-- Database Section -->
          <fieldset class="retro-fieldset">
            <legend>Database Status</legend>
            <div class="stat-row">
              <span class="label">Connection:</span>
              <span class="value" :class="{ 'ok': stats.database.status === 'Connected', 'bad': stats.database.status !== 'Connected' }">
                {{ stats.database.status }}
              </span>
            </div>
            <div class="stat-row">
              <span class="label">Latency:</span>
              <span class="value">{{ stats.database.latency }}</span>
            </div>
          </fieldset>

          <!-- Server Section -->
          <fieldset class="retro-fieldset">
            <legend>Server Performance</legend>
            
            <div class="stat-group">
              <div class="stat-header">
                <span class="label">CPU Usage:</span>
                <span class="value">{{ stats.server.cpu }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: stats.server.cpu + '%' }"></div>
              </div>
            </div>

            <div class="stat-group">
              <div class="stat-header">
                <span class="label">Memory Usage:</span>
                <span class="value">{{ stats.server.memory }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: stats.server.memory + '%' }"></div>
              </div>
            </div>

            <div class="stat-row mt-2">
              <span class="label">Uptime:</span>
              <span class="value small">{{ stats.server.uptime }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Node Version:</span>
              <span class="value">{{ stats.server.nodeVersion }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Platform:</span>
              <span class="value">{{ stats.server.platform }}</span>
            </div>
          </fieldset>

        </div>
        
        <div class="actions">
          <RetroButton @click="refreshStats" :disabled="loading">Refresh Scan</RetroButton>
        </div>
      </div>
    </WindowFrame>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'

definePageMeta({
  layout: 'admin'
})

const loading = ref(true)
const error = ref(null)
const stats = ref(null)

const fetchStats = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch('/api/admin/system-health')
    stats.value = data
  } catch (err) {
    error.value = 'Failed to load system health data.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const refreshStats = () => {
  fetchStats()
}

onMounted(() => {
  fetchStats()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.system-health-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 20px;
}

.health-content {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.loading, .error {
  text-align: center;
  padding: 20px;
  font-family: 'Courier New', monospace;
}

.error {
  color: red;
}

.retro-fieldset {
  border: 2px groove white;
  padding: 10px;
  margin-bottom: 10px;
  
  legend {
    padding: 0 5px;
    font-weight: bold;
  }
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.label {
  font-weight: bold;
}

.value.ok { color: green; }
.value.bad { color: red; }
.value.small { font-size: 12px; }

.stat-group {
  margin-bottom: 10px;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
  font-size: 12px;
}

.progress-bar {
  @include retro-border-inset;
  height: 16px;
  background: white;
  position: relative;
}

.progress-fill {
  height: 100%;
  background-color: #000080;
  transition: width 0.5s ease;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.mt-2 {
  margin-top: 10px;
}
</style>
