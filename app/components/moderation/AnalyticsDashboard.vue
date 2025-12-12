<template>
  <div class="analytics-dashboard">
    <div class="refresh-bar">
        <span class="status">STATUS: ONLINE - POLLING (5s)</span>
        <button class="retro-btn" @click="fetchData">RELOAD</button>
    </div>

    <div class="metrics-grid">
        <!-- 1. Realtime Energy -->
        <div class="card">
            <div class="card-header">ROOM ENERGY (Realtime)</div>
            <div class="card-body large-stat">
                <span class="value">{{ metrics.current_typers_est }}</span>
                <span class="label">ACTIVE TYPERS</span>
            </div>
        </div>

        <!-- 2. Recent Averge -->
        <div class="card">
            <div class="card-header">AVG ACTIVITY (5m)</div>
            <div class="card-body large-stat">
                <span class="value">{{ metrics.avg_typers_5m }}</span>
                <span class="label">AVG TYPERS</span>
            </div>
        </div>

        <!-- 3. Spam Alert -->
        <div class="card error-card">
            <div class="card-header">SPAM ALERTS (1h)</div>
            <div class="card-body large-stat error-text">
                <span class="value">{{ metrics.spam_events_1h }}</span>
                <span class="label">RATE LIMIT HITS</span>
            </div>
        </div>

        <!-- 4. UX Metric -->
        <div class="card">
            <div class="card-header">INDICATOR UX</div>
            <div class="card-body">
                <div class="stat-row">
                    <span>AVG VISIBILITY:</span>
                    <strong>{{ metrics.avg_visibility_ms }} ms</strong>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const metrics = ref({
    current_typers_est: 0,
    avg_typers_5m: 0,
    spam_events_1h: 0,
    avg_visibility_ms: 0
})

let pollTimer = null

const fetchData = async () => {
    try {
        const data = await $fetch('/api/analytics/summary')
        metrics.value = data
    } catch (e) {
        console.error('Failed to fetch analytics', e)
    }
}

onMounted(() => {
    fetchData()
    pollTimer = setInterval(fetchData, 5000)
})

onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.analytics-dashboard {
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: 'Verdana', sans-serif;
}

.refresh-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #000;
    color: #0f0;
    padding: 10px;
    font-family: 'Courier New', monospace;
    border: 2px solid #0f0;
}

.retro-btn {
    background: #c0c0c0;
    border: 2px outset #fff;
    cursor: pointer;
    font-weight: bold;
    font-size: 12px;
}
.retro-btn:active {
    border-style: inset;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.card {
    background: #e0e0e0;
    border: 2px solid #808080;
    box-shadow: 2px 2px 0 #000;
}

.card-header {
    background: #000080; /* Windows 95 Title Bar Blue */
    color: white;
    padding: 5px;
    font-weight: bold;
    font-size: 12px;
}

.card-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.large-stat {
    gap: 5px;
}

.large-stat .value {
    font-size: 32px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
}

.large-stat .label {
    font-size: 10px;
    color: #606060;
}

.error-card .card-header {
    background: #800000;
}

.error-text {
    color: #c00000;
}
</style>
