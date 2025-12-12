<template>
  <div class="pinned-items-manager">
    <div class="header-actions">
      <!-- Title handled by parent window -->
      <div class="left-actions"></div> 
      <button @click="openEditor()" class="btn-primary">New Item</button>
    </div>

    <div v-if="loading" class="loading">Loading items...</div>
    
    <div v-else class="items-list">
      <div v-if="items.length === 0" class="empty-state">
        No pinned items active. Create one to display at the top of the chat.
      </div>
      
      <div v-for="item in items" :key="item.id" class="item-card" :class="{ inactive: !item.is_active }">
        <div class="item-status">
           <span class="status-indicator" :class="item.is_active ? 'active' : 'inactive'"></span>
           <span class="type-badge">{{ formatType(item.type) }}</span>
        </div>
        
        <div class="item-details">
          <div v-if="item.type === 'rules'" class="content-preview">
             <strong>Rules:</strong> {{ truncate(item.content.text) }}
          </div>
          <div v-else-if="item.type === 'daily_topic'" class="content-preview">
             <strong>Topic:</strong> {{ item.content.text }}
          </div>
          <div v-else-if="item.type === 'announcement'" class="content-preview">
             <strong>Announcement:</strong> {{ truncate(item.content.text) }}
          </div>
          <div v-else-if="item.type === 'featured_link'" class="content-preview">
             <strong>Link:</strong> <a :href="item.content.url" target="_blank">{{ item.content.title || item.content.url }}</a>
          </div>

          <div class="meta-info">
             <span v-if="item.start_time || item.end_time">
                Sched: {{ formatDate(item.start_time) }} - {{ formatDate(item.end_time) }}
             </span>
             <span v-else>Always Visible</span>
          </div>
        </div>

        <div class="item-actions">
           <button @click="toggleActive(item)" class="btn-icon" :title="item.is_active ? 'Deactivate' : 'Activate'">
              {{ item.is_active ? '⏸️' : '▶️' }}
           </button>
           <button @click="openEditor(item)" class="btn-icon" title="Edit">✏️</button>
           <button @click="deleteItem(item.id)" class="btn-icon destructive" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <div v-if="showEditor" class="modal-overlay" @click.self="showEditor = false">
      <div class="modal-content">
        <h3>{{ editingItem?.id ? 'Edit Item' : 'New Pinned Item' }}</h3>
        
        <form @submit.prevent="saveItem">
          <div class="form-group">
            <label>Type</label>
            <select v-model="form.type" required>
              <option value="rules">Rules (Static)</option>
              <option value="daily_topic">Daily Topic</option>
              <option value="announcement">Announcement (Urgent)</option>
              <option value="featured_link">Featured Link</option>
            </select>
          </div>

          <div class="form-group" v-if="form.type !== 'featured_link'">
             <label>Content Text</label>
             <textarea v-model="form.content.text" rows="3" required></textarea>
          </div>

          <template v-if="form.type === 'featured_link'">
             <div class="form-group">
               <label>URL</label>
               <input v-model="form.content.url" type="url" required placeholder="https://..." />
             </div>
             <div class="form-group">
               <label>Link Title</label>
               <input v-model="form.content.title" type="text" placeholder="Click here!" />
             </div>
             <div class="form-group">
               <label>Emoji Icon</label>
               <input v-model="form.content.emoji" type="text" style="width: 50px;" placeholder="🔗" />
             </div>
          </template>
          
          <div class="form-row">
            <div class="form-group">
               <label>Start Time (Optional)</label>
               <input v-model="form.start_time" type="datetime-local" />
            </div>
            <div class="form-group">
               <label>End Time (Optional)</label>
               <input v-model="form.end_time" type="datetime-local" />
            </div>
          </div>

          <div class="form-group checkbox">
             <label>
               <input type="checkbox" v-model="form.is_active" />
               Active immediately
             </label>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showEditor = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const items = ref([])
const loading = ref(true)
const showEditor = ref(false)
const editingItem = ref(null)
const saving = ref(false)

const form = ref({
  type: 'daily_topic',
  content: { text: '', url: '', title: '', emoji: '' },
  is_active: true,
  start_time: '',
  end_time: ''
})

const fetchItems = async () => {
  loading.value = true
  try {
    const { items: data } = await $fetch('/api/pinned-items')
    items.value = data
  } catch (e) {
    alert('Failed to load items')
  } finally {
    loading.value = false
  }
}

const openEditor = (item = null) => {
  editingItem.value = item
  if (item) {
    // Clone data
    form.value = {
      type: item.type,
      content: { ...item.content },
      is_active: item.is_active,
      start_time: item.start_time ? item.start_time.slice(0, 16) : '',
      end_time: item.end_time ? item.end_time.slice(0, 16) : ''
    }
  } else {
    // Reset
    form.value = {
      type: 'daily_topic',
      content: { text: '', url: '', title: '', emoji: '' },
      is_active: true,
      start_time: '',
      end_time: ''
    }
  }
  showEditor.value = true
}

const saveItem = async () => {
    saving.value = true
    try {
        const payload = { ...form.value }
        
        // Clean up empty dates
        if (!payload.start_time) payload.start_time = null
        else payload.start_time = new Date(payload.start_time).toISOString()

        if (!payload.end_time) payload.end_time = null
        else payload.end_time = new Date(payload.end_time).toISOString()

        if (editingItem.value) {
            await $fetch(`/api/pinned-items/${editingItem.value.id}`, {
                method: 'PUT',
                body: payload
            })
        } else {
            await $fetch('/api/pinned-items', {
                method: 'POST',
                body: payload
            })
        }
        await fetchItems()
        showEditor.value = false
    } catch (e) {
        alert('Failed to save: ' + e.message)
    } finally {
        saving.value = false
    }
}

const toggleActive = async (item) => {
    try {
        await $fetch(`/api/pinned-items/${item.id}`, {
            method: 'PUT',
            body: { is_active: !item.is_active }
        })
        item.is_active = !item.is_active
    } catch (e) { alert('Update failed') }
}

const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this pinned item?')) return
    try {
        await $fetch(`/api/pinned-items/${id}`, { method: 'DELETE' })
        items.value = items.value.filter(i => i.id !== id)
    } catch (e) { alert('Delete failed') }
}



// Helpers
const formatType = (t) => t.replace('_', ' ').toUpperCase()
const truncate = (t) => t && t.length > 50 ? t.substring(0, 50) + '...' : t
const formatDate = (d) => d ? new Date(d).toLocaleString() : 'Date'

onMounted(fetchItems)
</script>

<style lang="scss" scoped>
.pinned-items-manager {
    padding: 10px;
    color: #000;
    font-family: 'MS Sans Serif', 'Arial', sans-serif;
}

.header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.items-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.empty-state {
    padding: 20px;
    text-align: center;
    background: #e0e0e0;
    border: 2px inset #fff;
    color: #404040;
}

.item-card {
    display: flex;
    align-items: center;
    background: #c0c0c0;
    border: 2px outset #fff;
    padding: 10px;
    box-shadow: 1px 1px 0 #000;
    
    &.inactive {
        opacity: 0.6;
        border-style: dotted;
    }
}

.item-status {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 140px;
}

.status-indicator {
    width: 12px;
    height: 12px;
    background: #808080;
    border: 1px solid #404040;
    box-shadow: inset 1px 1px 0 #000;
    
    &.active { 
        background: #00ff00; 
        border-color: #008000;
    }
}

.type-badge {
    background: #000080;
    color: white;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    box-shadow: 1px 1px 0 #fff;
}

.item-details {
    flex: 1;
    padding: 0 20px;
    
    .content-preview {
        font-size: 14px;
        margin-bottom: 4px;
        color: #000;
        
        strong { color: #404040; margin-right: 5px; }
        a { color: #000080; text-decoration: underline; }
    }

    .meta-info {
        font-size: 11px;
        color: #404040;
    }
}

.item-actions {
    display: flex;
    gap: 8px;
}

/* Retro Buttons */
button {
    font-family: 'MS Sans Serif', sans-serif;
    font-size: 11px;
    transition: none;
}

.btn-primary {
    background: #c0c0c0;
    color: #000;
    border: 2px outset #fff;
    padding: 6px 14px;
    cursor: pointer;
    font-weight: bold;
    text-transform: uppercase;
    
    &:active { border-style: inset; transform: translate(1px, 1px); }
    &:disabled { color: #808080; border-style: solid; }
}

.btn-icon {
    background: #c0c0c0;
    border: 2px outset #fff;
    padding: 6px;
    cursor: pointer;
    color: #000;
    
    &:active { border-style: inset; }
    
    &.destructive { 
        color: #cc0000;
        &:hover { background: #e0e0e0; }
    }
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.modal-content {
    background: #c0c0c0;
    padding: 4px;
    border: 2px outset #fff;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.5);
    width: 500px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    
    h3 { 
        background: #000080; 
        background: linear-gradient(90deg, #000080, #1084d0);
        color: white; 
        margin: 0 0 15px 0; 
        padding: 4px 6px;
        font-size: 14px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    form { padding: 10px 15px 15px 15px; }
}

.form-group {
    margin-bottom: 15px;
    
    label { display: block; margin-bottom: 4px; font-weight: bold; font-size: 12px; color: #000; }
    input, select, textarea {
        width: 100%;
        padding: 4px;
        background: #fff;
        border: 2px inset #dfdfdf;
        border-right-color: #fff;
        border-bottom-color: #fff;
        color: #000;
        font-family: 'Arial', sans-serif;
        font-size: 13px;
        
        &:focus { outline: none; background: #fff; }
    }
}

.form-row {
    display: flex;
    gap: 15px;
    .form-group { flex: 1; }
}

.checkbox label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    
    input { width: auto; }
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
    padding-top: 15px;
    
    button {
       min-width: 80px;
    }
    
    button[type="button"] { 
        background: #c0c0c0; 
        color: #000; 
        border: 2px outset #fff;
        &:active { border-style: inset; }
    }
}

.btn-text {
    background: transparent;
    border: none;
    color: #404040;
    text-decoration: underline;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    margin-right: 15px;
    
    &:hover { color: #000; }
}
</style>
