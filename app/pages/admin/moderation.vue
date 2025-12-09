<template>
  <div class="moderation-page">
    <WindowFrame title="Moderation Queue" width="800px">
      <div class="moderation-content">
        <div class="toolbar">
          <div class="filter-group">
            <label>Filter:</label>
            <select class="retro-select">
              <option>All Reports</option>
              <option>Pending</option>
              <option>Resolved</option>
            </select>
          </div>
          <div class="actions">
            <RetroButton>Refresh</RetroButton>
          </div>
        </div>

        <table class="retro-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Reason</th>
              <th>Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in reports" :key="report.id">
              <td>#{{ report.id }}</td>
              <td>{{ report.user }}</td>
              <td>{{ report.reason }}</td>
              <td>{{ report.time }}</td>
              <td>
                <RetroButton small>Review</RetroButton>
              </td>
            </tr>
            <tr v-if="reports.length === 0">
              <td colspan="5" class="empty-state">No pending reports.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </WindowFrame>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'

definePageMeta({
  layout: 'admin'
})

const reports = ref([
  { id: 101, user: 'SpamBot_9000', reason: 'Spamming links', time: '10:45 AM' },
  { id: 102, user: 'TrollUser', reason: 'Harassment', time: '10:30 AM' },
  { id: 103, user: 'Anon_55', reason: 'Inappropriate content', time: '09:15 AM' },
])
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.moderation-page {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.moderation-content {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.retro-select {
  @include retro-border-inset;
  padding: 2px 4px;
  font-family: 'MS Sans Serif', sans-serif;
}

.retro-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 14px;
  background: white;
  @include retro-border-inset;

  thead {
    background-color: #c0c0c0;
    
    th {
      text-align: left;
      padding: 4px 8px;
      border-bottom: 1px solid #808080;
      border-right: 1px solid #808080;
    }
  }

  tbody {
    td {
      padding: 4px 8px;
      border-right: 1px dotted #ccc;
      border-bottom: 1px dotted #ccc;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}
</style>
