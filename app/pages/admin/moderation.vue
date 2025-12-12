<template>
  <div class="moderation-page">
      <div class="tabs">
          <button @click="currentTab = 'settings'" :class="{ active: currentTab === 'settings' }">Settings</button>
          <button @click="currentTab = 'reactions'" :class="{ active: currentTab === 'reactions' }">Reactions</button>
      </div>

      <div class="moderation-content">
        <SettingsEditor v-if="currentTab === 'settings'" />
        <ReactionsDashboard v-else-if="currentTab === 'reactions'" />
      </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SettingsEditor from '~/components/moderation/SettingsEditor.vue'
import ReactionsDashboard from '~/components/moderation/ReactionsDashboard.vue'

definePageMeta({
  layout: 'admin'
})

const currentTab = ref('settings')
</script>

<style lang="scss" scoped>
.moderation-page {
  display: flex;
  flex-direction: column; /* Stack tabs and content */
  align-items: center;    /* Center width-constrained content */
  padding-top: 20px;
  padding-bottom: 40px;
  width: 100%;
}

.moderation-content {
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  background: #1a1a1a; /* Dark background */
  border: 2px solid #555;
  border-right-color: #111;
  border-bottom-color: #111;
  box-shadow: 1px 1px 0 #000;
  min-height: 500px;
}

.tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 0; /* Attach to content */
    padding: 0 20px;
    width: 100%;
    max-width: 1200px;
    justify-content: flex-start;
}

.tabs button {
    background: #1a1a1a;
    border: 2px solid #555;
    border-right-color: #111;
    border-bottom-color: #111;
    color: #888;
    padding: 8px 16px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    cursor: pointer;
    font-family: 'MS Sans Serif', 'Arial', sans-serif;
    font-size: 13px;
    margin-bottom: -2px; /* Overlap border */
    position: relative;
    z-index: 1;
    transition: all 0.2s;
}

.tabs button.active {
    background: #1a1a1a;
    border-top-color: #4facfe;
    border-bottom-color: #1a1a1a; /* Merge with content */
    color: #fff;
    font-weight: bold;
    z-index: 2;
    padding-top: 10px; /* Pop up slightly */
    text-shadow: 0 0 5px rgba(79, 172, 254, 0.5);
}
</style>

