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
      
      <div class="field-group">
        <label>Max Messages (per window)</label>
        <RetroInput 
          v-model="form.max_messages_per_window" 
          type="number" 
          placeholder="e.g. 5"
        />
        <span class="hint">Users blocked after this many messages.</span>
      </div>

      <div class="field-group">
        <label>Time Window (seconds)</label>
        <RetroInput 
          v-model="form.window_seconds" 
          type="number" 
          placeholder="e.g. 10"
        />
        <span class="hint">Rate limit resets after this time.</span>
      </div>

      <div class="field-group">
        <label>Auto-Mute Duration (minutes)</label>
        <RetroInput 
          v-model="form.mute_minutes" 
          type="number" 
          placeholder="e.g. 5"
        />
        <span class="hint">How long spammers are muted.</span>
      </div>

      <div class="field-group full-width">
        <label>Max Message Length</label>
        <RetroInput 
          v-model="form.max_message_length" 
          type="number" 
          placeholder="e.g. 500"
        />
      </div>

      <div class="field-group full-width">
        <label>Bad Words (comma separated)</label>
        <textarea 
          v-model="form.bad_words_str" 
          rows="4" 
          class="retro-textarea"
        ></textarea>
        <span class="hint">Case-insensitive partial match.</span>
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
  max_messages_per_window: 5,
  window_seconds: 10,
  mute_minutes: 5,
  max_message_length: 500,
  bad_words_str: ''
})

const fetchSettings = async () => {
    try {
        const data = await $fetch('/api/moderation/settings')
        form.value = {
            max_messages_per_window: data.max_messages_per_window,
            window_seconds: data.rate_limit_window_ms / 1000,
            mute_minutes: data.auto_mute_duration_ms / 60000,
            max_message_length: data.max_message_length,
            bad_words_str: (data.bad_words || []).join(', ')
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
        const payload = {
            max_messages_per_window: parseInt(form.value.max_messages_per_window),
            rate_limit_window_ms: parseInt(form.value.window_seconds) * 1000,
            auto_mute_duration_ms: parseInt(form.value.mute_minutes) * 60000,
            max_message_length: parseInt(form.value.max_message_length),
            bad_words: form.value.bad_words_str.split(',').map(s => s.trim()).filter(s => s)
        }

        await $fetch('/api/moderation/settings', {
            method: 'POST',
            body: payload
        })
        
        alert('Settings Saved Successfully!')
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

.full-width {
  grid-column: 1 / -1;
}

.retro-textarea {
  @include retro-border-inset;
  font-family: 'MS Sans Serif', sans-serif;
  padding: 4px;
  resize: vertical;
}

.loading {
  padding: 20px;
  text-align: center;
  font-style: italic;
}
</style>
