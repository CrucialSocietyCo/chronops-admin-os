<template>
  <div class="settings-editor">
    <div class="header">
      <h3>Global Configuration</h3>
      <RetroButton small @click="saveSettings" :disabled="saving">
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </RetroButton>
    </div>

    <div v-if="loading" class="loading">Loading settings...</div>
    <div v-else class="form-grid">
      
      <!-- SECTION 1: RATE LIMITS -->
      <div class="section-label full-width">Rate Limiting</div>
      
      <div class="field-group">
        <label>Max Messages (Window)</label>
        <RetroInput 
          v-model="form.max_messages_per_window" 
          type="number" 
          placeholder="e.g. 5"
        />
        <span class="hint">Strict limit (Auto-Mute Trigger).</span>
      </div>

      <div class="field-group">
        <label>Window Size (seconds)</label>
        <RetroInput 
          v-model="form.window_seconds" 
          type="number" 
          placeholder="e.g. 10"
        />
        <span class="hint">Timeframe for max messages.</span>
      </div>

      <div class="field-group">
        <label>Auto-Mute Duration (min)</label>
        <RetroInput 
          v-model="form.mute_minutes" 
          type="number" 
          placeholder="e.g. 5"
        />
        <span class="hint">Penalty for rate limit violations.</span>
      </div>

      <!-- SECTION 2: BURST & FLOW -->
       <div class="field-group">
        <label>Burst Protection</label>
        <div class="checkbox-wrapper">
             <input type="checkbox" v-model="form.burst_protection_enabled" id="burstSet" />
             <label for="burstSet">Enable</label>
        </div>
        <div class="split-input">
            <label>Max:</label>
            <input type="number" v-model="form.max_burst_messages" class="retro-select" style="width: 50px" />
        </div>
      </div>

      <div class="field-group">
        <label>Slow Mode (seconds)</label>
         <select v-model="form.slow_mode_interval" class="retro-select">
            <option :value="0">Off (0s)</option>
            <option :value="3">3s</option>
            <option :value="5">5s</option>
            <option :value="10">10s</option>
            <option :value="30">30s</option>
        </select>
      </div>

      <div class="field-group">
         <label>Advanced Automations</label>
         <div class="checkbox-wrapper">
             <input type="checkbox" v-model="form.crowd_surge_detection_enabled" id="surgeSet" />
             <label for="surgeSet">Surge Detect</label>
         </div>
         <div class="checkbox-wrapper">
             <input type="checkbox" v-model="form.spam_burst_auto_mute" id="spamBurstSet" />
             <label for="spamBurstSet">Spam Auto-Mute</label>
         </div>
      </div>

      <!-- SECTION 3: CHAT RESTRICTIONS -->
      <div class="section-label full-width">Restrictions & Safety</div>

      <div class="field-group">
        <label>Enable Chat</label>
        <div class="checkbox-wrapper">
            <input type="checkbox" v-model="form.is_chat_enabled" id="chatEnabledSet" />
            <label for="chatEnabledSet">Allow New Messages</label>
        </div>
      </div>

      <div class="field-group">
        <label>Content Policies</label>
        <div class="checkbox-wrapper">
             <input type="checkbox" v-model="form.profanity_filter_enabled" id="profSet" />
             <label for="profSet">Profanity Filter</label>
        </div>
        <div class="checkbox-wrapper">
             <input type="checkbox" v-model="form.allow_links" id="linkSet" />
             <label for="linkSet">Allow Links</label>
        </div>
        <div class="checkbox-wrapper">
             <input type="checkbox" v-model="form.allow_pixel_reactions" id="pixelSet" />
             <label for="pixelSet">Pixel Reactions</label>
        </div>
      </div>

       <div class="field-group">
        <label>Max Message Length</label>
        <RetroInput 
          v-model="form.max_message_length" 
          type="number" 
          placeholder="e.g. 500"
        />
      </div>

      <!-- SECTION 4: BAD WORDS -->
      <div class="section-label full-width">Bad Words List</div>

      <div class="field-group full-width">
        <label>Comma Separated List</label>
        <textarea 
          v-model="form.bad_words_str" 
          rows="4" 
          class="retro-textarea"
        ></textarea>
        <span class="hint">Case-insensitive partial match. Blocks messages containing these words.</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import RetroButton from '~/components/RetroButton.vue'
import RetroInput from '~/components/RetroInput.vue'

const loading = ref(true)
const saving = ref(false)
const form = ref({
  // Moderation Settings (New)
  max_messages_per_window: 5,
  window_seconds: 10,
  mute_minutes: 5,
  bad_words_str: '',
  
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
        const [modData, houseData] = await Promise.all([
            $fetch('/api/moderation/settings').catch(() => ({})),
            $fetch('/api/admin/house-controls').catch(() => ({}))
        ])

        // Merge State
        form.value = {
            // New Table
            max_messages_per_window: modData.max_messages_per_window || 5,
            window_seconds: (modData.rate_limit_window_ms || 10000) / 1000,
            mute_minutes: (modData.auto_mute_duration_ms || 300000) / 60000,
            bad_words_str: (modData.bad_words || []).join(', '),
            
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
        alert('Error loading settings')
    } finally {
        loading.value = false
    }
}

const saveSettings = async () => {
    saving.value = true
    try {
        // Payload 1: Moderation Settings Table
        const modPayload = {
            max_messages_per_window: parseInt(form.value.max_messages_per_window),
            rate_limit_window_ms: parseInt(form.value.window_seconds) * 1000,
            auto_mute_duration_ms: parseInt(form.value.mute_minutes) * 60000,
            max_message_length: parseInt(form.value.max_message_length),
            bad_words: form.value.bad_words_str.split(',').map(s => s.trim()).filter(s => s)
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
        
        alert('All Settings Saved Successfully!')
    } catch (err) {
         console.error('Failed to save settings:', err)
         alert('Error saving settings: ' + err.message)
    } finally {
        saving.value = false
    }
}

onMounted(() => {
    fetchSettings()
})
</script>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

.settings-editor {
  background: #c0c0c0;
  padding: 10px;
  border: 1px dotted #808080;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: bold;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
}

.full-width {
  grid-column: 1 / -1;
}

.section-label {
    font-weight: bold;
    border-bottom: 1px solid #808080;
    margin-top: 10px;
    margin-bottom: 5px;
    padding-bottom: 2px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  label {
    font-size: 12px;
    font-weight: bold;
  }
  
  .hint {
    font-size: 10px;
    color: #666;
    margin-top: 2px;
  }
}

.checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
    
    label {
        font-weight: normal;
    }
}

.split-input {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
}

.retro-textarea {
  @include retro-border-inset;
  font-family: 'MS Sans Serif', sans-serif;
  padding: 4px;
  resize: vertical;
}

.retro-select {
  @include retro-border-inset;
  padding: 4px;
  font-family: 'MS Sans Serif', sans-serif;
}

.loading {
  padding: 20px;
  text-align: center;
  font-style: italic;
}
</style>
