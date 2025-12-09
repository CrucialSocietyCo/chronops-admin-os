<template>
  <div class="settings-page">
    <div v-if="loading" class="loading-container">
      <WindowFrame title="System Status" class="loading-window">
        <div class="loading-text">Loading settings...</div>
      </WindowFrame>
    </div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <form v-else @submit.prevent="saveSettings" class="settings-form">
      
      <div class="masonry-grid">
        <!-- GROUP 2: Time, Locale & Formatting -->
        <div class="masonry-item">
          <WindowFrame title="Time & Formatting">
            <div class="grid-2">
              <div class="form-group">
                <label>Timezone</label>
                <select v-model="settings.timezone" class="retro-select">
                  <option value="UTC">UTC</option>
                  <option value="EST">EST (UTC-5)</option>
                  <option value="CST">CST (UTC-6)</option>
                  <option value="PST">PST (UTC-8)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Date Format</label>
                <select v-model="settings.date_format" class="retro-select">
                  <option>YYYY-MM-DD</option>
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                </select>
              </div>
            </div>
            <div class="form-group radio-group">
              <label>Time Format:</label>
              <div class="radio-option">
                <input type="radio" id="12h" value="12-hour" v-model="settings.time_format" />
                <label for="12h">12-hour</label>
              </div>
              <div class="radio-option">
                <input type="radio" id="24h" value="24-hour" v-model="settings.time_format" />
                <label for="24h">24-hour</label>
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="showSeconds" v-model="settings.show_seconds" />
                <label for="showSeconds">Show Seconds</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="showTimestamps" v-model="settings.show_timestamps" />
                <label for="showTimestamps">Show Timestamps</label>
              </div>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 3: Data & Privacy -->
        <div class="masonry-item">
          <WindowFrame title="Data & Privacy">
            <div class="form-row">
              <div class="form-group flex-grow">
                <label>Message Retention</label>
                <select v-model="settings.message_retention_policy" class="retro-select">
                  <option>24 hours</option>
                  <option>7 days</option>
                  <option>30 days</option>
                  <option>Forever</option>
                </select>
              </div>
              <RetroButton type="button" :disabled="!settings.allow_chat_log_export">Export Log</RetroButton>
            </div>
            <div class="grid-2">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="allowExport" v-model="settings.allow_chat_log_export" />
                <label for="allowExport">Allow Export</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="anonymize" v-model="settings.anonymize_exports" />
                <label for="anonymize">Anonymize Exports</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="logIp" v-model="settings.log_ip_enabled" />
                <label for="logIp">Log IP Addresses</label>
              </div>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 4: Access & Admin Security -->
        <div class="masonry-item">
          <WindowFrame title="Access & Security">
            <div class="form-row">
              <RetroInput label="Admin Display Name" v-model="settings.admin_display_name" class="flex-grow" />
              <RetroButton type="button">Change Password</RetroButton>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="requirePass" v-model="settings.require_password_for_dashboard" />
              <label for="requirePass">Require Password for Dashboard</label>
            </div>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="autoLogout" v-model="settings.auto_logout_enabled" />
                <label for="autoLogout">Auto-Logout Idle</label>
              </div>
              <RetroInput label="Timeout (min)" type="number" v-model="settings.idle_timeout_minutes" style="width: 80px;" />
            </div>
            <div class="future-section">Additional Admins (coming soon)</div>
          </WindowFrame>
        </div>

        <!-- GROUP 5: Notifications & Alerts -->
        <div class="masonry-item">
          <WindowFrame title="Notifications">
            <RetroInput label="Notification Email / Webhook" v-model="settings.notification_email" />
            <div class="grid-2">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="alertError" v-model="settings.alert_on_error" />
                <label for="alertError">Alert on Error</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="alertOffline" v-model="settings.alert_on_disconnect" />
                <label for="alertOffline">Alert Offline</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="alertSurge" v-model="settings.alert_on_surge" />
                <label for="alertSurge">Alert Traffic Surge</label>
              </div>
            </div>
            <div class="subsection-label">Admin Sounds</div>
            <div class="grid-3">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="soundMsg" v-model="settings.sound_on_new_message" />
                <label for="soundMsg">New Msg</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="soundMention" v-model="settings.sound_on_mention" />
                <label for="soundMention">Mentions</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="soundWarn" v-model="settings.sound_on_warning" />
                <label for="soundWarn">Warnings</label>
              </div>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 6: Startup & Defaults -->
        <div class="masonry-item">
          <WindowFrame title="Startup Behavior">
            <div class="form-group">
              <label>Default Event Mode</label>
              <select v-model="settings.default_event_mode" class="retro-select">
                <option>Pre-Show</option>
                <option>Live Event</option>
                <option>Afterparty</option>
                <option>Quiet Mode</option>
              </select>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="autoOpen" v-model="settings.auto_open_chat" />
              <label for="autoOpen">Auto-Open Chat on Start</label>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="autoSnapshot" v-model="settings.auto_apply_snapshot" />
              <label for="autoSnapshot">Auto-Apply Last Snapshot</label>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="closedSplash" v-model="settings.show_closed_splash" />
              <label for="closedSplash">Show "Closed" Splash Screen</label>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 7: Integrations -->
        <div class="masonry-item">
          <WindowFrame title="Integrations">
            <RetroInput label="Analytics ID" v-model="settings.analytics_id" />
            <RetroInput label="Event Webhook URL" v-model="settings.webhook_url" />
            <div class="subsection-label">Send Events For:</div>
            <div class="grid-2">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="evtJoin" v-model="settings.send_events_joined" />
                <label for="evtJoin">User Joined</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="evtLeft" v-model="settings.send_events_left" />
                <label for="evtLeft">User Left</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="evtMsg" v-model="settings.send_events_message" />
                <label for="evtMsg">Message Posted</label>
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="evtAdmin" v-model="settings.send_events_admin" />
                <label for="evtAdmin">Admin Action</label>
              </div>
            </div>
          </WindowFrame>
        </div>

        <!-- GROUP 8: Advanced -->
        <div class="masonry-item">
          <WindowFrame title="Advanced">
            <div class="form-group checkbox-group">
              <input type="checkbox" id="expFeatures" v-model="settings.experimental_features" />
              <label for="expFeatures">Enable Experimental Features</label>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="devConsole" v-model="settings.show_dev_console" />
              <label for="devConsole">Show Developer Console Link</label>
            </div>
            <div class="danger-zone">
              <RetroButton type="button" class="danger-button">Reset All Settings</RetroButton>
            </div>
          </WindowFrame>
        </div>
      </div>

      <div class="actions-bar">
        <div v-if="saveMessage" class="status-message success">{{ saveMessage }}</div>
        <div v-if="error" class="status-message error">{{ error }}</div>
        <RetroButton type="button" @click="cancelChanges">Cancel</RetroButton>
        <RetroButton :disabled="saving" class="save-button">
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </RetroButton>
      </div>
      
    </form>
  </div>
</template>

<script setup lang="ts">
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import RetroInput from '~/components/RetroInput.vue'
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'admin'
})

const settings = ref({
  timezone: 'UTC',
  time_format: '24-hour',
  date_format: 'YYYY-MM-DD',
  show_seconds: false,
  show_timestamps: true,
  message_retention_policy: 'Forever',
  allow_chat_log_export: false,
  anonymize_exports: true,
  log_ip_enabled: true,
  admin_display_name: 'Admin',
  require_password_for_dashboard: true,
  auto_logout_enabled: true,
  idle_timeout_minutes: 15,
  notification_email: '',
  alert_on_error: true,
  alert_on_disconnect: true,
  alert_on_surge: false,
  sound_on_new_message: false,
  sound_on_mention: true,
  sound_on_warning: true,
  default_event_mode: 'Live Event',
  auto_open_chat: true,
  auto_apply_snapshot: false,
  show_closed_splash: true,
  analytics_id: '',
  webhook_url: '',
  send_events_joined: false,
  send_events_left: false,
  send_events_message: false,
  send_events_admin: true,
  experimental_features: false,
  show_dev_console: false
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saveMessage = ref('')

const fetchSettings = async () => {
  try {
    loading.value = true
    const data = await $fetch('/api/admin/settings')
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
    
    await $fetch('/api/admin/settings', {
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

const cancelChanges = () => {
  fetchSettings()
}

onMounted(() => {
  fetchSettings()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/_variables.scss' as *;
@use '~/assets/scss/_mixins.scss' as *;

.settings-page {
  max-width: 1200px;
  margin: 0 auto; // Center horizontally
  padding-bottom: 40px;
  padding-top: 40px; // Add space to the top of dialog boxes
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.masonry-grid {
  column-count: 2;
  column-gap: 20px;
  
  @media (max-width: 768px) {
    column-count: 1;
  }
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  align-items: center;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
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
  
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }
  
  label {
    font-size: 14px;
    font-weight: normal;
    color: black;
    cursor: pointer;
  }
}

.radio-group {
  margin-bottom: 10px;
  
  label {
    font-weight: bold;
    margin-bottom: 4px;
  }
  
  .radio-option {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 15px;
    
    label {
      font-weight: normal;
      margin-bottom: 0;
    }
  }
}

.retro-select {
  @include retro-input;
  padding: 4px;
  height: 28px;
}

.flex-grow {
  flex: 1;
}

.future-section {
  color: #888;
  font-style: italic;
  text-align: center;
  margin-top: 10px;
  padding: 10px;
  border: 1px dashed #ccc;
}

.subsection-label {
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 5px;
  font-size: 12px;
}

.danger-zone {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dotted #999;
  display: flex;
  justify-content: flex-end;
}

.danger-button {
  color: red !important;
}

.actions-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  padding-top: 10px;
  /* Removed border-top and box-shadow */
  /* Remove background as requested */
  background: transparent;
}

.status-message {
  font-weight: bold;
  margin-right: auto;
  
  &.success { color: green; }
  &.error { color: red; }
}

.save-button {
  min-width: 120px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px;
}

.loading-window {
  width: 300px;
}

.loading-text {
  padding: 20px;
  text-align: center;
  font-weight: bold;
}
</style>
