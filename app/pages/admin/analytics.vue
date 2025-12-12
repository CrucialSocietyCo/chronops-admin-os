<template>
  <div class="analytics-page">
    <div class="header">
      <h1 class="page-title">Live Analytics</h1>
      <RetroButton @click="refreshData" class="refresh-btn">
        {{ loading ? 'Loading...' : 'Refresh Data' }}
      </RetroButton>
    </div>

    <!-- Masonry Grid Container -->
    <div class="masonry-grid">
        
        <!-- KPI: Current Active -->
        <WindowFrame title="Current Active" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value">{{ kpiStats.current_active || 0 }}</div>
                <div class="kpi-label">Users (5m)</div>
            </div>
        </WindowFrame>

        <!-- TYPING: Chat Heat -->
        <WindowFrame title="Chat Heat" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value">{{ typingMetrics.typing_pulse_score || 0 }}</div>
                <div class="kpi-label">Intensity (0-100)</div>
            </div>
        </WindowFrame>

        <!-- KPI: Max Active -->
        <WindowFrame title="Peak Active (24h)" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value highlight">{{ kpiStats.max_concurrent_24h || 0 }}</div>
                <div class="kpi-label">Recorded Max</div>
            </div>
        </WindowFrame>

        <!-- TYPING: Room Energy -->
        <WindowFrame title="Room Energy" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value">{{ typingMetrics.current_typers_est || 0 }}</div>
                <div class="kpi-label">Active Typers</div>
            </div>
        </WindowFrame>

        <!-- CHART: Messages/Min (Tall) -->
        <WindowFrame title="Messages / Minute" class="grid-item chart-item">
            <ClientOnly fallback-tag="div" fallback="Loading Chart...">
                <RealtimeLineChart 
                    :labels="messagesPerMin.labels" 
                    :data="messagesPerMin.data" 
                    label="Messages"
                    color="#000080"
                />
            </ClientOnly>
        </WindowFrame>

        <!-- TYPING: Spam Risk -->
        <WindowFrame title="Spam Risk" class="grid-item" :class="{ 'error-border': typingMetrics.spam_index === 'High' }">
             <div class="kpi-body">
                <div class="kpi-value" :class="{ 'error-text': typingMetrics.spam_index !== 'Low' }">
                    {{ typingMetrics.spam_index || 'Low' }}
                </div>
                <div class="kpi-label">Threat Level</div>
            </div>
        </WindowFrame>

        <!-- KPI: Total Messages -->
        <WindowFrame title="Total Messages" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value">{{ kpiStats.total_messages || 0 }}</div>
                <div class="kpi-label">Lifetime</div>
            </div>
        </WindowFrame>

        <!-- CHART: Daily Activity (Wide/Tall) -->
        <WindowFrame title="Daily Activity (14d)" class="grid-item chart-item daily-chart">
             <ClientOnly fallback-tag="div" fallback="Loading Chart...">
                <DailyActivityChart 
                    :days="dailyStats.days"
                    :messages="dailyStats.messages"
                    :newUsers="dailyStats.newUsers"
                />
            </ClientOnly>
        </WindowFrame>

        <!-- TYPING: Burst Duration -->
        <WindowFrame title="Avg Burst" class="grid-item">
             <div class="kpi-body">
                <div class="kpi-value">{{ typingMetrics.avg_burst_duration_ms || 0 }}<span class="unit">ms</span></div>
                <div class="kpi-label">Typing Duration</div>
            </div>
        </WindowFrame>

         <!-- CHART: Active Users -->
        <WindowFrame title="Active Users Live" class="grid-item chart-item">
            <ClientOnly fallback-tag="div" fallback="Loading Chart...">
                <RealtimeLineChart 
                    :labels="activeUsersOverTime.labels" 
                    :data="activeUsersOverTime.data" 
                    label="Unique Users"
                    color="#008080"
                />
            </ClientOnly>
        </WindowFrame>

        <!-- KPI: Moderation Actions -->
        <WindowFrame title="Mod Actions" class="grid-item">
             <div class="kpi-body">
                <div class="kpi-value warning">{{ kpiStats.moderation_actions || 0 }}</div>
                <div class="kpi-label">Interventions</div>
            </div>
        </WindowFrame>

        <!-- TYPING: UX Metric -->
        <WindowFrame title="Avg Uptime" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value small">{{ typingMetrics.avg_visibility_ms || 0 }} ms</div>
            </div>
        </WindowFrame>
         <!-- TYPING: Spam Events -->
        <WindowFrame title="Spam Events (1h)" class="grid-item">
            <div class="kpi-body">
                <div class="kpi-value">{{ typingMetrics.spam_events_1h || 0 }}</div>
                <div class="kpi-label">Rate Limits</div>
            </div>
        </WindowFrame>


        <!-- FEED: Recent Activity -->
        <WindowFrame title="Live Feed" class="grid-item feed-item">
            <RecentActivityFeed :events="recentEvents" />
        </WindowFrame>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
import { useRealtimeAnalytics } from '~/composables/useRealtimeAnalytics'
import RecentActivityFeed from '~/components/analytics/RecentActivityFeed.vue'

// Lazy Load Charts
const RealtimeLineChart = defineAsyncComponent(() => import('~/components/analytics/RealtimeLineChart.vue'))
const DailyActivityChart = defineAsyncComponent(() => import('~/components/analytics/DailyActivityChart.vue'))

definePageMeta({
  layout: 'admin'
})

const supabase = useSupabaseClient()
const { recentEvents, getMessagesPerMinute, getActiveUsersOverTime, subscribe, unsubscribe, fetchRecentHistory } = useRealtimeAnalytics()

const loading = ref(false)
const refreshTimer = ref<NodeJS.Timer | null>(null)

// --- Combined State ---
const kpiStats = ref({})
const typingMetrics = ref({})
const dailyStats = ref({ days: [], messages: [], newUsers: [] })

// --- Computed Realtime Data ---
const messagesPerMin = computed(() => getMessagesPerMinute())
const activeUsersOverTime = computed(() => getActiveUsersOverTime())

// --- Data Fetching ---
const fetchData = async () => {
    try {
        loading.value = true
        
        // 1. Static KPIs
        const { data: kpiData } = await supabase.from('chatroom_stats').select('*').single()
        if (kpiData) kpiStats.value = kpiData

        // 2. Daily Activity
        const { data: dailyData } = await supabase.from('daily_activity').select('*').order('day', { ascending: true })
        if (dailyData) {
            dailyStats.value = {
                days: dailyData.map((d: any) => new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
                messages: dailyData.map((d: any) => d.messages || 0),
                newUsers: dailyData.map((d: any) => d.new_users || 0)
            }
        }

        // 3. Typing Summary
        const typingData = await $fetch('/api/analytics/summary')
        if (typingData) typingMetrics.value = typingData

    } catch (e) {
        console.error('Data load error', e)
    } finally {
        loading.value = false
    }
}

const refreshData = () => {
    fetchData()
}

onMounted(async () => {
    await fetchData()
    await fetchRecentHistory()
    subscribe()
    refreshTimer.value = setInterval(refreshData, 5000) // 5s unified poll
})

onUnmounted(() => {
    unsubscribe()
    if (refreshTimer.value) clearInterval(refreshTimer.value)
})

</script>

<style lang="scss" scoped>
.analytics-page {
    padding-bottom: 40px;
    height: 100%;
    overflow-y: auto;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
}

.page-title {
    font-size: 24px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px #000;
}

/* MASONRY LAYOUT */
.masonry-grid {
    column-count: 3;
    column-gap: 20px;
}

@media (max-width: 1200px) {
    .masonry-grid { column-count: 2; }
}

@media (max-width: 768px) {
    .masonry-grid { column-count: 1; }
}

.grid-item {
    break-inside: avoid;
    margin-bottom: 20px;
    background: #c0c0c0; /* Match WindowFrame base */
}

/* Content Styles */
.kpi-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.kpi-value {
    font-size: 32px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    color: #000;
    
    &.highlight { color: #000080; }
    &.warning { color: #800000; }
    &.error-text { color: #ff0000; }
    &.small { font-size: 24px; }
    
    .unit { font-size: 14px; color: #666; }
}

.kpi-label {
    font-size: 11px;
    color: #555;
    margin-top: 5px;
    text-transform: uppercase;
    font-weight: bold;
}

/* Charts need fixed heights to play nice in Masonry */
.chart-item :deep(.window-content) {
    height: 250px;
    position: relative;
}

.daily-chart :deep(.window-content) {
    height: 300px;
}

.feed-item :deep(.window-content) {
    height: 400px; 
    overflow: hidden;
}

.error-border {
    border: 2px solid red !important;
}
</style>
