<template>
  <div class="users-page">
    <WindowFrame title="User Management">
      <div class="toolbar">
        <RetroButton @click="refresh">Refresh List</RetroButton>
      </div>

      <div v-if="loading" class="loading">Loading users...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      
      <div v-else class="users-list">
        <table class="retro-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.name }}</td>
              <td>{{ user.is_admin ? 'Admin' : 'User' }}</td>
              <td>
                <span :class="['status-badge', user.is_banned ? 'banned' : 'active']">
                  {{ user.is_banned ? 'Banned' : 'Active' }}
                </span>
              </td>
              <td>{{ new Date(user.created_at).toLocaleDateString() }}</td>
              <td>
                <RetroButton size="small" @click="viewUser(user)">View</RetroButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WindowFrame>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const users = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const fetchUsers = async () => {
  try {
    loading.value = true
    const data = await $fetch('/api/admin/users')
    users.value = data || []
  } catch (e: any) {
    error.value = 'Failed to load users: ' + e.message
  } finally {
    loading.value = false
  }
}

const refresh = () => {
  fetchUsers()
}

const viewUser = (user: any) => {
  // TODO: Implement user detail view or modal
  console.log('View user:', user)
}

onMounted(() => {
  fetchUsers()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/_variables.scss' as *;
@use '~/assets/scss/_mixins.scss' as *;

.users-page {
  max-width: 800px;
  margin: 0 auto;
}

.toolbar {
  margin-bottom: 15px;
  display: flex;
  justify-content: flex-end;
}

.retro-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 2px solid $border-dark;
  
  th, td {
    padding: 8px;
    text-align: left;
    border: 1px solid $border-light;
    font-family: $font-family;
    font-size: 14px;
  }

  th {
    background: $bg-color;
    font-weight: bold;
  }

  tr:hover {
    background: rgba($primary-color, 0.1);
  }
}

.status-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  
  &.active {
    background: #e6ffe6;
    color: green;
    border: 1px solid green;
  }
  
  &.banned {
    background: #ffe6e6;
    color: red;
    border: 1px solid red;
  }
}
</style>
