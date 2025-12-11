<template>
  <div class="analytics-dashboard">
    <div class="header">
      <h1 class="page-title">Live Analytics</h1>
      <RetroButton @click="refreshData" class="refresh-btn">
        {{ loading ? 'Loading...' : 'Refresh Data' }}
      </RetroButton>
    </div>

    <!-- Top Row: KPIs -->
    <KpiRow :stats="kpiStats" />

    <!-- Middle Row: Realtime Charts -->
    <div class="realtime-row">
      <WindowFrame title="Messages / Minute (Live 15m)" class="chart-card">
        <ClientOnly fallback-tag="div" fallback="Loading Chart...">
          <RealtimeLineChart 
            :labels="messagesPerMin.labels" 
            :data="messagesPerMin.data" 
            label="Messages"
            color="#000080"
          />
        </ClientOnly>
      </WindowFrame>

      <WindowFrame title="Active Users (Live 15m)" class="chart-card">
        <ClientOnly fallback-tag="div" fallback="Loading Chart...">
          <RealtimeLineChart 
             :labels="activeUsersOverTime.labels" 
             :data="activeUsersOverTime.data" 
             label="Unique Users"
             color="#008080"
          />
        </ClientOnly>
      </WindowFrame>
    </div>

    <!-- Bottom Row: Daily + Recent Activity -->
    <div class="bottom-row">
      <WindowFrame title="Daily Activity (14 Days)" class="chart-card daily-chart">
        <ClientOnly fallback-tag="div" fallback="Loading Chart...">
          <DailyActivityChart 
            :days="dailyStats.days"
            :messages="dailyStats.messages"
            :newUsers="dailyStats.newUsers"
          />
        </ClientOnly>
      </WindowFrame>

      <WindowFrame title="Recent Activity Feed" class="feed-card">
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

// Standard Imports for safe components
import KpiRow from '~/components/analytics/KpiRow.vue'
import RecentActivityFeed from '~/components/analytics/RecentActivityFeed.vue'

// Lazy Load Charts to prevent SSR Crash (Chart.js references window)
const RealtimeLineChart = defineAsyncComponent(() => import('~/components/analytics/RealtimeLineChart.vue'))
const DailyActivityChart = defineAsyncComponent(() => import('~/components/analytics/DailyActivityChart.vue'))

definePageMeta({
  layout: 'admin'
})

const supabase = useSupabaseClient()
const { recentEvents, getMessagesPerMinute, getActiveUsersOverTime, subscribe, unsubscribe, fetchRecentHistory } = useRealtimeAnalytics()

const loading = ref(false)
const refreshTimer = ref<NodeJS.Timer | null>(null)

// --- State for KPIs & Daily ---
const kpiStats = ref({})
const dailyStats = ref({
    days: [],
    messages: [],
    newUsers: []
})

// --- Computed Realtime Data ---
const messagesPerMin = computed(() => getMessagesPerMinute())
const activeUsersOverTime = computed(() => getActiveUsersOverTime())

// --- Data Fetching ---
const fetchStaticStats = async () => {
    try {
        loading.value = true
        // 1. Fetch KPI Stats
        const { data: kpiData } = await supabase
            .from('chatroom_stats')
            .select('*')
            .single()
        
        if (kpiData) kpiStats.value = kpiData

        // 2. Fetch Daily Activity
        const { data: dailyData } = await supabase
            .from('daily_activity')
            .select('*')
            .order('day', { ascending: true }) // Chart prefers ascending time
        
        if (dailyData) {
            dailyStats.value = {
                days: dailyData.map((d: any) => new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
                messages: dailyData.map((d: any) => d.messages || 0),
                newUsers: dailyData.map((d: any) => d.new_users || 0)
            }
        }
    } catch (e) {
        console.error('Failed to load analytics', e)
    } finally {
        loading.value = false
    }
}

const refreshData = () => {
    fetchStaticStats()
    // Trigger chart calculations
}

onMounted(async () => {
    await fetchStaticStats()
    await fetchRecentHistory() // Pre-fill buffers
    subscribe()
    
    // Auto-refresh static stats every 60s
    refreshTimer.value = setInterval(refreshData, 60000)
})

onUnmounted(() => {
    unsubscribe()
    if (refreshTimer.value) clearInterval(refreshTimer.value)
})

</script>

<style lang="scss" scoped>
.analytics-dashboard {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
    overflow-y: auto;
    padding-bottom: 30px;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-title {
    font-size: 24px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px #000;
}

/* Realtime Row: 2 Columns */
.realtime-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    height: 320px; /* Explicit height for charts */
}

/* Bottom Row: Daily (2/3) + Activity (1/3) */
.bottom-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    height: 380px;
}

.chart-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    
    /* Ensure internal chart container fills space */
    :deep(.window-content) {
        flex: 1;
        position: relative;
        overflow: hidden; 
    }
}

.feed-card {
    height: 100%;
    overflow: hidden;
}
</style>
