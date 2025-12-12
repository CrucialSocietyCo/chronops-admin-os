<template>
  <div class="settings-editor">
    <div v-if="loading" class="loading-container">
      <WindowFrame title="System Status" class="loading-window">
        <div class="loading-text">Loading configuration...</div>
      </WindowFrame>
    </div>

    <form v-else @submit.prevent="saveSettings" class="settings-form">
      <div class="masonry-grid">
        
        <!-- WINDOW 1: RATE LIMITING -->
        <div class="masonry-item">
          <WindowFrame title="Rate Limiting">
            <div class="form-row">
              <RetroInput label="Max Messages" v-model="form.max_messages_per_window" type="number" class="flex-grow" />
              <RetroInput label="Window (sec)" v-model="form.window_seconds" type="number" class="flex-grow" />
            </div>
            <div class="form-row">
               <RetroInput label="Mute Duration (min)" v-model="form.mute_minutes" type="number" class="flex-grow" />
            </div>
          </WindowFrame>
        </div>

        <!-- WINDOW 2: BURST & FLOW -->
        <div class="masonry-item">
          <WindowFrame title="Burst & Flow">
            <div class="form-row">
               <div class="form-group checkbox-group">
                 <input type="checkbox" id="burstSet" v-model="form.burst_protection_enabled" />
                 <label for="burstSet">Burst Protection</label>
               </div>
               <RetroInput label="Max Burst" v-model="form.max_burst_messages" type="number" style="width: 60px" />
            </div>
            <div class="form-group">
               <label>Slow Mode</label>
               <select v-model="form.slow_mode_interval" class="retro-select full-width-select">
                  <option :value="0">Off (0s)</option>
                  <option :value="3">3s</option>
                  <option :value="5">5s</option>
                  <option :value="10">10s</option>
                  <option :value="30">30s</option>
               </select>
            </div>
          </WindowFrame>
        </div>

        <!-- WINDOW 3: AUTOMATIONS -->
        <div class="masonry-item">
           <WindowFrame title="Automations">
             <div class="checkbox-list">
               <div class="form-group checkbox-group">
                 <input type="checkbox" id="surgeSet" v-model="form.crowd_surge_detection_enabled" />
                 <label for="surgeSet">Crowd Surge Detection</label>
               </div>
               <div class="form-group checkbox-group">
                 <input type="checkbox" id="spamBurstSet" v-model="form.spam_burst_auto_mute" />
                 <label for="spamBurstSet">Spam Burst Auto-Mute</label>
               </div>
             </div>
           </WindowFrame>
        </div>

        <!-- WINDOW 5: CONTENT FILTER -->
        <div class="masonry-item">
           <WindowFrame title="Blocked Words">
              <div class="form-group checkbox-group highlight-box" style="background: #e6f7ff; margin-bottom: 10px;">
                 <input type="checkbox" id="aiRwSet" v-model="form.ai_persona_rewrite_enabled" />
                 <div style="display:flex; flex-direction:column;">
                    <label for="aiRwSet" style="font-weight:bold;">AI Persona Rewrite</label>
                    <span style="font-size:10px; color:#555;">Replace blocked with corporate jargon.</span>
                 </div>
              </div>
              <textarea 
                v-model="form.bad_words_str" 
                rows="6" 
                class="retro-textarea"
                placeholder="Comma separated list..."
              ></textarea>
           </WindowFrame>
        </div>

      </div>

      <div class="actions-bar">
         <div v-if="saveMessage" class="status-message success">{{ saveMessage }}</div>
         <div v-if="error" class="status-message error">{{ error }}</div>
         <RetroButton :disabled="saving" @click="saveSettings" class="save-button">
            {{ saving ? 'Saving...' : 'Save Configuration' }}
         </RetroButton>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import RetroInput from '~/components/RetroInput.vue'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saveMessage = ref('')

const form = ref({
  // Moderation Settings (New)
  max_messages_per_window: 5,
  window_seconds: 10,
  mute_minutes: 5,
  bad_words_str: '',
  ai_persona_rewrite_enabled: false,
  
  // House Controls (Legacy)
  is_chat_enabled: true,
  slow_mode_interval: 0,
  max_message_length: 500,
  profanity_filter_enabled: true,
  allow_links: false,
  burst_protection_enabled: false,
  max_burst_messages: 5,
  allow_pixel_reactions: true,
  crowd_surge_detection_enabled: false,
  spam_burst_auto_mute: false
})

const fetchSettings = async () => {
    try {
        loading.value = true
        const client = useSupabaseClient()
        const { data } = await client.auth.getSession()
        const headers = data?.session?.access_token 
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {}

        const [modData, houseData] = await Promise.all([
            $fetch('/api/moderation/settings', { headers }).catch(err => {
                console.error('Mod Settings Fetch Error:', err)
                return {}
            }),
            $fetch('/api/admin/house-controls', { headers }).catch(() => ({}))
        ])

        console.log('API Mod Settings Received:', modData)

        // Merge State
        form.value = {
            // New Table
            max_messages_per_window: modData.max_messages_per_window || 5,
            window_seconds: (modData.rate_limit_window_ms || 10000) / 1000,
            mute_minutes: (modData.auto_mute_duration_ms || 300000) / 60000,
            bad_words_str: (modData.bad_words || []).join(', '),
            ai_persona_rewrite_enabled: modData.ai_persona_rewrite_enabled || false,
            
            // Legacy Table
            is_chat_enabled: houseData.is_chat_enabled !== false,
            slow_mode_interval: houseData.slow_mode_interval || 0,
            max_message_length: houseData.max_message_length || 500,
            profanity_filter_enabled: houseData.profanity_filter_enabled !== false,
            allow_links: houseData.allow_links || false,
            burst_protection_enabled: houseData.burst_protection_enabled || false,
            max_burst_messages: houseData.max_burst_messages || 5,
            allow_pixel_reactions: houseData.allow_pixel_reactions !== false,
            crowd_surge_detection_enabled: houseData.crowd_surge_detection_enabled || false,
            spam_burst_auto_mute: houseData.spam_burst_auto_mute || false
        }

    } catch (err) {
        console.error('Failed to fetch settings:', err)
        error.value = 'Error loading settings'
    } finally {
        loading.value = false
    }
}

const saveSettings = async () => {
    saving.value = true
    error.value = ''
    saveMessage.value = ''
    
    try {
        // Payload 1: Moderation Settings Table
        const modPayload = {
            max_messages_per_window: parseInt(form.value.max_messages_per_window),
            rate_limit_window_ms: parseInt(form.value.window_seconds) * 1000,
            auto_mute_duration_ms: parseInt(form.value.mute_minutes) * 60000,
            max_message_length: parseInt(form.value.max_message_length),
            bad_words: form.value.bad_words_str.split(',').map(s => s.trim()).filter(s => s),
            ai_persona_rewrite_enabled: form.value.ai_persona_rewrite_enabled
        }

        // Payload 2: House Controls (Chat Settings Table)
        const housePayload = {
             is_chat_enabled: form.value.is_chat_enabled,
             slow_mode_interval: parseInt(form.value.slow_mode_interval),
             max_message_length: parseInt(form.value.max_message_length),
             profanity_filter_enabled: form.value.profanity_filter_enabled,
             allow_links: form.value.allow_links,
             burst_protection_enabled: form.value.burst_protection_enabled,
             max_burst_messages: parseInt(form.value.max_burst_messages),
             allow_pixel_reactions: form.value.allow_pixel_reactions,
             crowd_surge_detection_enabled: form.value.crowd_surge_detection_enabled,
             spam_burst_auto_mute: form.value.spam_burst_auto_mute
        }

        await Promise.all([
             $fetch('/api/moderation/settings', { method: 'POST', body: modPayload }),
             $fetch('/api/admin/house-controls', { method: 'POST', body: housePayload })
        ])
        
        saveMessage.value = 'Settings Saved!'
        setTimeout(() => saveMessage.value = '', 3000)
    } catch (err) {
         console.error('Failed to save settings:', err)
         error.value = 'Error saving: ' + err.message
    } finally {
        saving.value = false
    }
}

onMounted(() => {
    fetchSettings()
})
</script>

<style scoped lang="scss">
@use '~/assets/scss/_variables.scss' as *;
@use '~/assets/scss/_mixins.scss' as *;

.settings-editor {
  /* Removed outer border to allow windows to float freely */
}

/* Reusing Masonry Logic from House Controls */
.masonry-grid {
  column-count: 2;
  column-gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 900px) {
    column-count: 1;
  }
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  align-items: flex-end; /* Align inputs */
  gap: 15px;
  margin-bottom: 10px;
}

.flex-grow {
  flex: 1;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    
    label {
        font-size: 12px;
        color: #333;
    }
}

.checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    
    label {
        font-size: 13px;
        font-weight: normal;
        cursor: pointer;
    }
    
    input[type="checkbox"] {
        width: 16px;
        height: 16px;
    }
}

.checkbox-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.checkbox-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 10px 0;
}

.highlight-box {
    background: #ffffcc;
    border: 1px dotted #999;
    padding: 5px;
    margin-bottom: 5px;
}

.retro-select {
    @include retro-input;
    padding: 2px;
    height: 26px;
}

.full-width-select {
    width: 100%;
}

.retro-textarea {
    @include retro-border-inset;
    width: 100%;
    font-family: 'MS Sans Serif', sans-serif;
    padding: 5px;
    resize: vertical;
    box-sizing: border-box; 
    font-size: 12px;
}

/* Reuse Loading/Actions Bar from House Controls for consistency */
.loading-container {
  display: flex;
  justify-content: center;
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

.actions-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #fff;
  box-shadow: 0 -1px 0 #808080;
  background: #c0c0c0;
  padding: 15px;
  border: 2px solid #dfdfdf;
  border-right-color: #404040;
  border-bottom-color: #404040;
  grid-column: 1 / -1; /* If inside grid */
}

.status-message {
  font-weight: bold;
  &.success { color: green; }
  &.error { color: red; }
}

.save-button {
    min-width: 140px;
}
</style>
