<template>
  <div class="users-page">
    <WindowFrame title="User Management">
      <div class="toolbar">
        <div class="search-group">
            <span class="toolbar-label">Search:</span>
            <RetroInput v-model="searchQuery" placeholder="Name or Email..." class="search-input" />
        </div>
        
        <div class="divider"></div>

        <div class="filter-group">
            <span class="toolbar-label">Role:</span>
            <select v-model="roleFilter" class="retro-select">
                <option value="">All</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="guest">Guest</option>
            </select>
        </div>

        <div class="filter-group">
             <span class="toolbar-label">Status:</span>
             <select v-model="statusFilter" class="retro-select">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="banned">Banned</option>
             </select>
        </div>

        <div class="spacer"></div>
        
        <RetroButton @click="loadUsers">🔄 Refresh</RetroButton>
        <RetroButton @click="exportUsers">💾 Export</RetroButton>
      </div>

      <div class="table-container">
        <table class="retro-table">
          <thead>
            <tr>
              <th @click="handleSort('name')" class="sortable">
                  User <span v-if="sortColumn === 'name'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <!-- Email and Username columns removed -->
              <th @click="handleSort('status')" class="sortable">
                  Status <span v-if="sortColumn === 'status'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="handleSort('role')" class="sortable">
                  Role <span v-if="sortColumn === 'role'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="handleSort('created_at')" class="sortable">
                  Joined <span v-if="sortColumn === 'created_at'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="handleSort('last_seen_at')" class="sortable">
                  Last Active <span v-if="sortColumn === 'last_seen_at'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
                <td colspan="8" class="center">Loading users...</td>
            </tr>
            <tr v-else-if="error">
                <td colspan="8" class="center">{{ error }}</td>
            </tr>
            <tr v-else-if="paginatedUsers.length === 0">
                <td colspan="8" class="center">No users found.</td>
            </tr>
            <tr v-else v-for="user in paginatedUsers" :key="user.id">
              <td>
                <div class="user-cell">
                    <div class="avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
                    <span class="name">{{ user.name }}</span>
                </div>
              </td>
              <!-- Email and Username cells removed -->
              <td>
                 <span class="status-indicator" :class="getStatusClass(user)">
                    {{ getStatusLabel(user) }}
                 </span>
              </td>
              <td>{{ user.is_admin ? 'Admin' : 'User' }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>{{ formatTimeAgo(user.last_seen_at) }}</td>
              <td class="actions">
                <RetroButton small @click="viewUser(user)">✏️ Edit</RetroButton>
                <!-- Add more actions here if needed -->
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-footer">
          <div class="rows-selector">
              <span>Rows per page:</span>
              <select v-model="itemsPerPage" class="retro-select small">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
              </select>
          </div>
          
          <div class="page-controls">
              <span>{{ startIndex + 1 }}-{{ Math.min(endIndex, filteredUsers.length) }} of {{ filteredUsers.length }}</span>
              <div class="btn-group">
                  <RetroButton small :disabled="currentPage === 1" @click="currentPage = 1">«</RetroButton>
                  <RetroButton small :disabled="currentPage === 1" @click="currentPage--">‹</RetroButton>
                  <RetroButton small :disabled="currentPage === totalPages" @click="currentPage++">›</RetroButton>
                  <RetroButton small :disabled="currentPage === totalPages" @click="currentPage = totalPages">»</RetroButton>
              </div>
          </div>
      </div>
    </WindowFrame>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import RetroInput from '~/components/RetroInput.vue'

definePageMeta({ layout: 'admin' })

const users = ref<any[]>([])
const loading = ref(true)
const error = ref('')

// Filters
const searchQuery = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Sorting state
const sortColumn = ref('created_at')
const sortDirection = ref('desc')

const loadUsers = async () => {
    loading.value = true
    try {
        const data = await $fetch('/api/admin/users')
        users.value = data || []
    } catch (e: any) {
        error.value = e.message
    } finally {
        loading.value = false
    }
}

const handleSort = (column: string) => {
    if (sortColumn.value === column) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortColumn.value = column
        sortDirection.value = 'asc'
    }
}

const filteredUsers = computed(() => {
    return users.value.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                              u.email.toLowerCase().includes(searchQuery.value.toLowerCase())
        
        const matchesRole = roleFilter.value ? (roleFilter.value === 'admin' ? u.is_admin : !u.is_admin) : true
        
        const status = getStatusLabel(u).toLowerCase()
        const matchesStatus = statusFilter.value ? status === statusFilter.value : true

        return matchesSearch && matchesRole && matchesStatus
    })
})

const sortedUsers = computed(() => {
    return [...filteredUsers.value].sort((a, b) => {
        let aVal = a[sortColumn.value]
        let bVal = b[sortColumn.value]

        // Handle computed/special columns
        if (sortColumn.value === 'username') {
            aVal = deriveUsername(a)
            bVal = deriveUsername(b)
        } else if (sortColumn.value === 'role') {
            aVal = a.is_admin ? 1 : 0
            bVal = b.is_admin ? 1 : 0
        } else if (sortColumn.value === 'status') {
            // Simplified status sort (alphabetical by label for now)
            aVal = getStatusLabel(a)
            bVal = getStatusLabel(b)
        }

        // Handle nulls
        if (aVal === null) return 1
        if (bVal === null) return -1
        
        // String comparison
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase()
            bVal = bVal.toLowerCase()
        }

        if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
        return 0
    })
})

const totalPages = computed(() => Math.ceil(sortedUsers.value.length / itemsPerPage.value))

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => startIndex.value + itemsPerPage.value)

const paginatedUsers = computed(() => {
    return sortedUsers.value.slice(startIndex.value, endIndex.value)
})

// Reset to page 1 when filters change (sorting doesn't necessarily need reset, but acceptable if desired)
watch([searchQuery, roleFilter, statusFilter, itemsPerPage], () => {
    currentPage.value = 1
})

const exportUsers = () => {
    // TODO: Implement export
    alert('Export feature coming soon!')
}

const viewUser = (user: any) => {
    // TODO: Edit user
    console.log('Edit', user)
}

// Helpers
const getStatusLabel = (user: any) => {
    if (user.is_banned) return 'Banned'
    if (user.last_seen_at) {
        const diff = Date.now() - new Date(user.last_seen_at).getTime()
        if (diff < 1000 * 60 * 15) return 'Active'
    }
    return 'Inactive'
}

const getStatusClass = (user: any) => {
    return getStatusLabel(user).toLowerCase()
}

const deriveUsername = (user: any) => user.username || user.email.split('@')[0]

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
}

const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const diff = (Date.now() - date.getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

onMounted(() => {
    loadUsers()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.users-page {
    height: 100%;
    padding: 10px;
    display: flex;
    flex-direction: column;
}

.toolbar {
    padding: 8px;
    background: #c0c0c0;
    border-bottom: 1px solid #808080;
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 13px;
}

.search-group, .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.toolbar-label {
    font-weight: bold;
}

.search-input {
    width: 200px;
}

.retro-select {
    padding: 4px;
    border: 2px solid;
    border-color: #808080 #dfdfdf #dfdfdf #808080; /* Inset */
    background: #fff;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    
    &.small {
        padding: 2px;
    }
}

.divider {
    width: 2px;
    height: 20px;
    background: #808080;
    border-right: 1px solid #fff;
    margin: 0 4px;
}

.spacer {
    flex: 1;
}

.table-container {
    flex: 1;
    overflow: auto;
    background: white;
    @include retro-border-inset;
    min-height: 300px; /* Ensure space for listing */
}

.retro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
        background: #c0c0c0;
        @include retro-border-outset;
        padding: 6px;
        text-align: left;
        position: sticky;
        top: 0;
        z-index: 10;
        user-select: none;
        
        &.sortable {
            cursor: pointer;
            /* Hover effect removed as requested */
        }
    }

    td {
        padding: 6px;
        border: 1px solid #dfdfdf;
        vertical-align: middle;
    }

    tr:hover {
        background: #000080;
        color: white;
        
        .status-indicator {
            border-color: white; 
            /* Keep status colors but add border for visibility */
        }
        
        .name { color: white; }
    }
    
    .center { text-align: center; }
}

.user-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.avatar {
    width: 24px;
    height: 24px;
    background: #008080;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border: 1px solid #000;
}

.name {
    font-weight: bold;
    color: #000080;
}

/* Status Indicators */
.status-indicator {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    background: #e0e0e0;
    color: #666;
    border: 1px solid transparent;

    &.active { background: #008000; color: white; }
    &.inactive { background: #c0c0c0; color: #404040; }
    &.banned { background: #800000; color: white; }
}

.actions {
    display: flex;
    gap: 4px;
}

/* Pagination Footer */
.pagination-footer {
    padding: 8px;
    background: #c0c0c0;
    border-top: 1px solid #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
}

.rows-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.btn-group {
    display: flex;
    gap: 2px;
}

/* Responsive */
@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    
    .search-input { width: 100%; }
    
    .divider, .spacer { display: none; }
    
    .pagination-footer {
        flex-direction: column;
        gap: 10px;
    }
}
</style>
