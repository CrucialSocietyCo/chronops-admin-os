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
  justify-content: center;
  padding-top: 20px;
  padding-bottom: 40px;
}

.moderation-content {
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
}

.tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    padding: 0 20px;
}

.tabs button {
    background: #333;
    border: none;
    color: #888;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.tabs button.active {
    background: #3b82f6;
    color: white;
}
</style>

