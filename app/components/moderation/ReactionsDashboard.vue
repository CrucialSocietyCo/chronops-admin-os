<template>
  <div class="reactions-dashboard">
    <div class="dashboard-section alerts" v-if="data?.alerts?.length">
        <h3>⚠️ Content Alerts (High Negative Reactions)</h3>
        <div v-for="alert in data.alerts" :key="alert.id" class="alert-item">
            <div class="alert-header">
                <strong>{{ alert.sender }}</strong>: "{{ alert.content }}"
            </div>
            <div class="alert-stats">
                😡 {{ alert.breakdown.angry || 0 }} 
                😮 {{ alert.breakdown.shock || 0 }}
            </div>
        </div>
    </div>

    <div class="dashboard-grid">
        <div class="dashboard-section">
            <h3>Top Reacted Messages</h3>
            <div v-for="msg in data?.topMessages" :key="msg.id" class="top-msg-item">
                <div class="msg-preview">"{{ msg.content }}"</div>
                <div class="msg-meta">by {{ msg.sender }}</div>
                <div class="msg-reactions">
                    <span v-for="(count, type) in msg.breakdown" :key="type" class="reaction-tag">
                        {{ type }}: {{ count }}
                    </span>
                </div>
            </div>
        </div>
        
        <div class="dashboard-section">
            <h3>Recent Activity</h3>
            <div class="chart-placeholder">
                (Chart Visualization Placeholder)
                <br>
                {{ data?.recentActivity?.length || 0 }} reactions in last batch
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
const { data, refresh } = await useFetch('/api/moderation/reactions')

// Auto-refresh every 10s
let interval
onMounted(() => {
    interval = setInterval(refresh, 10000)
})
onUnmounted(() => {
    clearInterval(interval)
})
</script>

<style scoped>
.reactions-dashboard {
    display: flex;
    flex-direction: column;
    gap: 20px;
    color: #fff;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.dashboard-section {
    background: #1e1e1e;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #333;
}

.alerts {
    border-color: #ff4444;
    background: #2a1a1a;
}

.alert-item {
    background: #000;
    padding: 10px;
    margin-bottom: 5px;
    border-left: 3px solid #ff4444;
}

.top-msg-item {
    background: #252525;
    padding: 10px;
    margin-bottom: 8px;
    border-radius: 4px;
}

.msg-preview {
    font-size: 14px;
    margin-bottom: 4px;
}

.msg-meta {
    font-size: 11px;
    color: #888;
}

.reaction-tag {
    display: inline-block;
    background: #333;
    padding: 2px 6px;
    margin-right: 4px;
    font-size: 10px;
    border-radius: 4px;
    margin-top: 4px;
}
</style>
