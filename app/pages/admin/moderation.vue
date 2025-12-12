<template>
  <div class="moderation-page">
      <div class="moderation-content">
        <div class="retro-tabs">
            <button 
                class="tab" 
                :class="{ active: currentTab === 'settings' }"
                @click="currentTab = 'settings'"
            >
                SETTINGS
            </button>
             <button 
                class="tab" 
                :class="{ active: currentTab === 'analytics' }"
                @click="currentTab = 'analytics'"
            >
                ANALYTICS
            </button>
        </div>

        <div class="tab-panel">
            <SettingsEditor v-if="currentTab === 'settings'" />
            <AnalyticsDashboard v-else-if="currentTab === 'analytics'" />
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SettingsEditor from '~/components/moderation/SettingsEditor.vue'
import AnalyticsDashboard from '~/components/moderation/AnalyticsDashboard.vue'

definePageMeta({
  layout: 'admin'
})

const currentTab = ref('settings')
</script>

<style lang="scss" scoped>
.moderation-page {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  padding-bottom: 40px;
  background: #c0c0c0;
  min-height: 100vh;
}

.moderation-content {
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
}

.retro-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: -2px; /* Overlap with panel border */
    position: relative;
    z-index: 10;
}

.tab {
    padding: 8px 16px;
    background: #c0c0c0;
    border: 2px solid #fff;
    border-right-color: #808080;
    border-bottom-color: #808080;
    font-family: 'Verdana', sans-serif;
    font-weight: bold;
    font-size: 12px;
    cursor: pointer;
    border-radius: 4px 4px 0 0;
}

.tab.active {
    background: #e0e0e0;
    border-bottom: 2px solid #e0e0e0; /* Hide bottom border to merge with panel */
    padding-bottom: 10px;
    margin-top: -4px; /* Pop up */
    padding-top: 10px;
}

.tab-panel {
    background: #e0e0e0;
    border: 2px solid #fff;
    border-right-color: #808080;
    border-bottom-color: #808080;
    padding: 20px;
    min-height: 400px;
    box-shadow: 2px 2px 0 #000;
}
</style>

