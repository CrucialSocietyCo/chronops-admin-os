<template>
  <div class="activity-feed">
    <table class="retro-table">
      <thead>
        <tr>
          <th width="80">Time</th>
          <th>Event</th>
          <th width="100">Type</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="event in events" :key="event.id">
          <td class="time">{{ formatTime(event.created_at) }}</td>
          <td class="message">
             {{ formatMessage(event) }}
          </td>
          <td>
             <span class="badge" :class="getBadgeClass(event.event_type)">
               {{ event.event_type }}
             </span>
          </td>
        </tr>
        <tr v-if="events.length === 0">
           <td colspan="3" class="empty-state">No recent activity</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  events: any[]
}>()

const formatTime = (ts: string) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatMessage = (event: any) => {
  const p = event.payload || {}
  
  switch (event.event_type) {
    case 'message_sent':
      return `${p.sender || 'Someone'} sent: "${limitText(p.content, 30)}"`
    case 'room_joined':
      return `${p.username || 'User'} joined the room`
    case 'room_left':
      return `${p.username || 'User'} left the room`
    case 'user_registered':
      return `New user registered${p.email ? ': ' + p.email : ''}`
    case 'user_muted':
      return `Admin muted ${p.target_username || 'user'}`
    case 'user_banned':
      return `Admin BANNED ${p.target_username || 'user'}`
    case 'system_status':
      return `System status changed to: ${p.status}`
    default:
      return JSON.stringify(p)
  }
}

const limitText = (text: string, max: number) => {
    if (!text) return ''
    return text.length > max ? text.substring(0, max) + '...' : text
}

const getBadgeClass = (type: string) => {
    if (type === 'message_sent') return 'info'
    if (type.includes('user_registered')) return 'success'
    if (type.includes('banned') || type.includes('muted')) return 'danger'
    if (type.includes('joined')) return 'neutral'
    return 'default'
}
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.activity-feed {
    height: 100%;
    overflow-y: auto;
    @include retro-border-inset;
    background: white;
}

.retro-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 12px;

  th {
    text-align: left;
    padding: 4px;
    background-color: #c0c0c0;
    border-bottom: 2px solid #808080;
    position: sticky;
    top: 0;
  }

  td {
    padding: 4px;
    border-bottom: 1px dotted #ccc;
    vertical-align: middle;
  }
  
  .time { color: #666; font-family: 'Courier New', monospace; }
  .message { font-weight: bold; color: #000080; }
  .empty-state { text-align: center; padding: 20px; color: #999; }
}

.badge {
    font-size: 10px;
    padding: 2px 4px;
    color: white;
    background: #808080;
    border-radius: 2px;
    text-transform: uppercase;
    
    &.info { background: #000080; }
    &.success { background: #008000; }
    &.danger { background: #800000; }
    &.neutral { background: #666; }
}
</style>
