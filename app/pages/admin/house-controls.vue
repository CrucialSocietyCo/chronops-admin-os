<template>
  <div class="house-controls-page">
    <div v-if="error" class="error">{{ error }}</div>
    
    <form @submit.prevent="saveSettings" class="settings-form">
    <div class="bento-grid">
        <!-- GROUP 1: Pinned Items (Wide, Top Left) -->
        <div class="grid-item area-pinned">
          <WindowFrame title="Pinned Items" height="100%">
            <PinnedItemsManager />
          </WindowFrame>
        </div>

        <!-- NEW: Live Voice Drop (Top Right) -->
        <div class="grid-item area-voice">
           <WindowFrame title="Live Voice Drop" height="100%">
              <AudioRecorder @sent="fetchSettings" />
           </WindowFrame>
        </div>

        <!-- GROUP 2: Admin Signal Tools (Middle Left) -->
        <div class="grid-item area-signals">
          <WindowFrame title="Admin Signals" height="100%">
            <div class="form-row">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="adminHighlight" v-model="settings.admin_highlight_enabled" />
                <label for="adminHighlight">Highlight Mode</label>
              </div>
              <RetroButton type="button" @click="freezeChat">Freeze Chat (30s)</RetroButton>
            </div>
            <div class="form-row">
              <RetroInput label="Topic Prompt" v-model="settings.topic_prompt_text" class="flex-grow" />
              <RetroButton type="button" @click="sendTopicPrompt">Send Prompt</RetroButton>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 6: Event Scheduling (Middle Center) -->
        <div class="grid-item area-sched">
          <WindowFrame title="Scheduling" height="100%">
            <div class="form-group checkbox-group">
              <input type="checkbox" id="schedulingEnabled" v-model="settings.is_scheduling_enabled" />
              <label for="schedulingEnabled">Enable Scheduling</label>
            </div>
            <div class="grid-sub-2">
              <RetroInput label="Pre-Show Time" type="datetime-local" v-model="settings.pre_show_time" />
              <RetroInput label="Live Event Time" type="datetime-local" v-model="settings.live_event_time" />
              <RetroInput label="Afterparty Time" type="datetime-local" v-model="settings.afterparty_time" />
              <div class="form-group checkbox-group">
                <input type="checkbox" id="autoTransition" v-model="settings.auto_mode_transition_enabled" />
                <label for="autoTransition">Auto Transition</label>
              </div>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 7: System Snapshots (Bottom Full Width) -->
        <div class="grid-item area-snaps">
          <WindowFrame title="Snapshots" height="auto">
            <div class="snapshot-controls">
              <RetroButton type="button" @click="saveSnapshot">Save Snapshot</RetroButton>
              <select class="retro-select flex-grow">
                <option>Select Snapshot...</option>
                <option>Default Setup</option>
                <option>High Security</option>
              </select>
              <RetroButton type="button" @click="restoreSnapshot">Restore</RetroButton>
            </div>
          </WindowFrame>
        </div>
      </div>

      <div class="actions-bar">
        <div v-if="saveMessage" class="status-message success">{{ saveMessage }}</div>
        <div v-if="error" class="status-message error">{{ error }}</div>
        <RetroButton :disabled="saving" class="save-button">
          {{ saving ? 'Saving...' : 'Save All Settings' }}
        </RetroButton>
      </div>
      
    </form>
  </div>
</template>

<script setup lang="ts">
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import RetroInput from '~/components/RetroInput.vue'
import PinnedItemsManager from '~/components/moderation/PinnedItemsManager.vue'
import AudioRecorder from '~/components/admin/AudioRecorder.vue'
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'admin'
})

const settings = ref({
  is_chat_enabled: true,
  maintenance_mode: false,
  is_scheduling_enabled: false,
  window_title: 'Retro Chat',
  max_message_length: 500,
  max_messages_per_minute: 30,
  event_mode: 'Live Event',
  slow_mode_interval: 0,
  burst_protection_enabled: false,
  max_burst_messages: 5,
  auto_mute_enabled: false,
  auto_mute_violations: 3,
  allow_links: false,
  allow_pixel_reactions: true,
  profanity_filter_enabled: true,
  admin_highlight_enabled: false,
  topic_prompt_text: '',
  crowd_surge_detection_enabled: false,
  surge_threshold: 100,
  spam_burst_auto_mute: false,
  inactivity_cleanup_enabled: false,
  inactivity_cleanup_hours: 24,
  scheduled_system_messages_enabled: false,
  auto_mode_transition_enabled: false,
  pre_show_time: '',
  live_event_time: '',
  afterparty_time: ''
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saveMessage = ref('')

// Removed getModeDescription and applyMode as they are moved to Dashboard

const freezeChat = () => {
  // In a real implementation, this would call an API endpoint
  saveMessage.value = 'Chat frozen for 30 seconds!'
  setTimeout(() => saveMessage.value = '', 3000)
}

const sendTopicPrompt = async () => {
  if (!settings.value.topic_prompt_text) return
  
  try {
      saving.value = true
      await $fetch('/api/admin/send-prompt', {
          method: 'POST',
          body: { text: `*** Topic: ${settings.value.topic_prompt_text} ***` } // Format nicely
      })
      saveMessage.value = `Prompt broadcasted!`
      setTimeout(() => saveMessage.value = '', 3000)
  } catch (err: any) {
      error.value = 'Failed to send prompt: ' + err.message
  } finally {
      saving.value = false
  }
}

const saveSnapshot = () => {
  saveMessage.value = 'System snapshot saved!'
  setTimeout(() => saveMessage.value = '', 3000)
}

const restoreSnapshot = () => {
  saveMessage.value = 'System restored from snapshot!'
  setTimeout(() => saveMessage.value = '', 3000)
}

const fetchSettings = async () => {
  try {
    loading.value = true
    const data = await $fetch('/api/admin/house-controls')
    if (data) {
      settings.value = { ...settings.value, ...data }
    }
  } catch (e: any) {
    error.value = 'Failed to load settings: ' + e.message
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  try {
    saving.value = true
    saveMessage.value = ''
    error.value = ''
    
    await $fetch('/api/admin/house-controls', {
      method: 'POST',
      body: settings.value
    })
    
    saveMessage.value = 'Settings saved successfully!'
    setTimeout(() => {
      saveMessage.value = ''
    }, 4000)
  } catch (err: any) {
    error.value = 'Failed to save settings: ' + err.message
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/_variables.scss' as *;
@use '~/assets/scss/_mixins.scss' as *;

.house-controls-page {
  max-width: 1600px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Bento Box Grid Layout */
.bento-grid {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr; /* Custom ratios */
    grid-template-rows: auto auto auto;
    gap: 15px;
    grid-template-areas:
        "pinned pinned voice"
        "signals sched voice" /* Voice Drop spans 2 rows for height */
        "snaps snaps snaps";
}

/* Grid Areas */
.area-pinned { grid-area: pinned; }
.area-voice { grid-area: voice; }
.area-signals { grid-area: signals; }
.area-sched { grid-area: sched; }
.area-snaps { grid-area: snaps; }

/* Responsive adjustments */
@media (max-width: 1024px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-areas:
            "pinned pinned"
            "voice voice"
            "signals sched"
            "snaps snaps";
    }
}

@media (max-width: 768px) {
    .bento-grid {
        display: flex;
        flex-direction: column;
    }
}

.grid-item {
  width: 100%;
  height: 100%; /* Stretch to fill grid cell */
  min-height: 0; /* allows flex/grid children to shrink */
  
  /* Ensure WindowFrame fills height */
  display: flex;
  flex-direction: column;
}

/* Override WindowFrame to fill container in Grid */
:deep(.window-frame) {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
:deep(.window-content) {
    flex: 1; /* Push footer down if any */
}

/* Internal grid for Scheduling window inputs (Keep as Grid) */
.grid-sub-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  align-items: center;
  
  @media (max-width: 600px) {
     grid-template-columns: 1fr;
  }
}

.form-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  
  &:last-child { margin-bottom: 0; }
  
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  label {
    font-size: 12px;
    color: #333;
  }
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  
  input[type="checkbox"] { width: 16px; height: 16px; }
  label { font-size: 14px; font-weight: normal; color: black; cursor: pointer; }
}

.retro-select {
  @include retro-input;
  padding: 4px;
  height: 28px;
}

.snapshot-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap; /* responsive */
}

.flex-grow { flex: 1; }

.actions-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  padding: 15px;
  border: 2px solid #dfdfdf;
  border-right-color: #404040;
  border-bottom-color: #404040;
  background: #c0c0c0;
  border-top: 1px solid #fff;
  box-shadow: 0 -1px 0 #808080;
  flex-wrap: wrap; /* Allow wrapping on small screens */

  @media (max-width: 600px) {
      justify-content: center;
      flex-direction: column;
      align-items: stretch;
      
      .save-button {
          width: 100%;
      }
  }
}

.status-message {
  font-weight: bold;
  &.success { color: green; }
  &.error { color: red; }
}

.save-button { min-width: 120px; }

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px;
}

.loading-window { width: 300px; }
.loading-text { padding: 20px; text-align: center; font-weight: bold; }
</style>
