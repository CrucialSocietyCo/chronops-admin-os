<template>
  <div class="events-page">
    <WindowFrame title="Event Management">
      <div class="toolbar">
        <RetroButton @click="loadEvents">🔄 Refresh</RetroButton>
        <div class="divider"></div>
        <RetroInput v-model="newEventName" placeholder="New Event Name" class="new-event-input" />
        <RetroInput v-model="newWindowTitle" placeholder="Window Title" class="new-event-input" />
        <RetroButton @click="createEvent" :disabled="!newEventName || !newWindowTitle">➕ Create Event</RetroButton>
      </div>

      <div class="table-container">
        <table class="retro-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Event Name</th>
              <th>Window Title</th>
              <th>Show History</th>
              <th>Show Ads</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in events" :key="event.id" :class="{ 'active-row': event.is_active }">
              <td class="status-cell">
                <span v-if="event.is_active" class="status-indicator active">ACTIVE</span>
                <span v-else class="status-indicator">Inactive</span>
              </td>
              <td>
                <span v-if="editingId === event.id">
                  <input v-model="editName" @blur="saveEvents(event)" @keyup.enter="saveEvents(event)" />
                </span>
                <span v-else @dblclick="startEdit(event)">{{ event.name }}</span>
              </td>
              <td>
                <span v-if="editingId === event.id">
                  <input v-model="editWindowTitle" @blur="saveEvents(event)" @keyup.enter="saveEvents(event)" />
                </span>
                <span v-else @dblclick="startEdit(event)">{{ event.window_title }}</span>
              </td>
              <td class="center">
                <input type="checkbox" :checked="event.show_chat_history" @change="toggleHistory(event)" />
              </td>
              <td class="center">
                <input type="checkbox" :checked="event.show_sponsored !== false" @change="toggleAds(event)" />
              </td>
              <td>{{ new Date(event.created_at).toLocaleDateString() }}</td>
              <td class="actions">
                <RetroButton v-if="!event.is_active" @click="activateEvent(event)" small>▶ Activate</RetroButton>
                <RetroButton v-else @click="deactivateEvent(event)" small>⏹ Stop</RetroButton>
                <RetroButton @click="exportChat(event)" small>💾 Export</RetroButton>
              </td>
            </tr>
            <tr v-if="events.length === 0">
              <td colspan="5" class="empty">No events found. Create one to get started.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </WindowFrame>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import RetroInput from '~/components/RetroInput.vue' // Assuming existed or standard input

const events = ref<any[]>([])
const newEventName = ref('')
const newWindowTitle = ref('')
const editingId = ref<number | null>(null)
const editName = ref('')
const editWindowTitle = ref('')

definePageMeta({
  layout: 'admin'
})

const loadEvents = async () => {
  const { data, error } = await useFetch('/api/events')
  if (data.value) {
    events.value = data.value
  } else if (error.value) {
    alert('Failed to load events: ' + error.value.message)
  }
}

const createEvent = async () => {
  if (!newEventName.value || !newWindowTitle.value) return
  try {
    await $fetch('/api/events', {
      method: 'POST',
      body: { 
          name: newEventName.value,
          window_title: newWindowTitle.value || undefined
      }
    })
    newEventName.value = ''
    newWindowTitle.value = ''
    loadEvents()
  } catch (err: any) {
    alert('Error creating event: ' + err.message)
  }
}

const activateEvent = async (event: any) => {
  try {
    await $fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      body: { is_active: true }
    })
    loadEvents()
  } catch (err: any) {
    alert('Error activating event: ' + err.message)
  }
}

const deactivateEvent = async (event: any) => {
  try {
    await $fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      body: { is_active: false }
    })
    loadEvents()
  } catch (err: any) {
    alert('Error deactivating event: ' + err.message)
  }
}

const toggleHistory = async (event: any) => {
  try {
    await $fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      body: { show_chat_history: !event.show_chat_history }
    })
    // Optimistic update or reload? Reload is safer for sync
    loadEvents()
    loadEvents()
  } catch (err: any) {
    alert('Error updating history setting: ' + err.message)
  }
}

const toggleAds = async (event: any) => {
  try {
    const current = event.show_sponsored !== false // Default true
    await $fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      body: { show_sponsored: !current }
    })
    loadEvents()
  } catch (err: any) {
    alert('Error updating ads setting: ' + err.message)
  }
}

const exportChat = async (event: any) => {
    // Open in new tab to trigger download
    window.open(`/api/events/${event.id}/export`, '_blank')
}

const startEdit = (event: any) => {
    editingId.value = event.id
    editName.value = event.name
    editWindowTitle.value = event.window_title
}

const saveEvents = async (event: any) => {
    if (editingId.value === null) return
    
    const updates: any = {}
    if (editName.value !== event.name) updates.name = editName.value
    if (editWindowTitle.value !== event.window_title) updates.window_title = editWindowTitle.value
    
    if (Object.keys(updates).length > 0) {
        try {
            await $fetch(`/api/events/${event.id}`, {
                method: 'PUT',
                body: updates
            })
            loadEvents()
        } catch(err) {
            console.error(err)
        }
    }
    editingId.value = null
}



let pollInterval: any

onMounted(() => {
  loadEvents()
  // Auto-refresh every 5 seconds
  pollInterval = setInterval(loadEvents, 5000)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

.events-page {
  height: 100%;
  padding: 10px;
}

.toolbar {
  padding: 10px;
  background: #c0c0c0;
  border-bottom: 1px solid #808080;
  display: flex;
  gap: 8px;
  align-items: center;
}

.divider {
    width: 1px;
    background: #808080;
    height: 20px;
    margin: 0 4px;
}

.new-event-input {
    width: 200px;
}

.table-container {
    flex: 1;
    overflow: auto;
    background: white;
    @include retro-border-inset;
}

.retro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    
    th {
        background: #c0c0c0;
        @include retro-border-outset;
        padding: 4px 8px;
        text-align: left;
        position: sticky;
        top: 0;
    }

    td {
        padding: 4px 8px;
        border: 1px solid #dfdfdf;
    }

    tr:hover {
        background: #f0f0f0;
    }

    .active-row {
        background: #e6ffe6;
        font-weight: bold;
    }
    
    .center {
        text-align: center;
    }

    .actions {
        display: flex;
        gap: 4px;
    }
}

.status-indicator {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    background: #e0e0e0;
    color: #666;
    
    &.active {
        background: #008000;
        color: white;
        font-weight: bold;
    }
}
</style>
