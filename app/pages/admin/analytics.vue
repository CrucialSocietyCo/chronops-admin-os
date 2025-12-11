<template>
  <div class="analytics-dashboard">
    <div class="header">
      <h1 class="page-title">Live Analytics</h1>
      <RetroButton @click="refreshData" class="refresh-btn">
        {{ loading ? 'Loading...' : 'Refresh Data' }}
      </RetroButton>
    </div>

    <!-- Top Row: KPIs -->
    <AnalyticsKpiRow :stats="kpiStats" />

    <!-- Middle Row: Realtime Charts -->
    <div class="realtime-row">
      <WindowFrame title="Messages / Minute (Live 15m)" class="chart-card">
        <ClientOnly>
          <AnalyticsRealtimeLineChart 
            :labels="messagesPerMin.labels" 
            :data="messagesPerMin.data" 
            label="Messages"
            color="#000080"
          />
        </ClientOnly>
      </WindowFrame>

      <WindowFrame title="Active Users (Live 15m)" class="chart-card">
        <ClientOnly>
          <AnalyticsRealtimeLineChart 
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
      <WindowFrame title="Daily Activity (14 Days)" class="chart-card flex-2">
        <ClientOnly>
          <AnalyticsDailyActivityChart 
            :days="dailyStats.days"
            :messages="dailyStats.messages"
            :newUsers="dailyStats.newUsers"
          />
        </ClientOnly>
      </WindowFrame>

      <WindowFrame title="Recent Activity Feed" class="feed-card flex-1">
        <AnalyticsRecentActivityFeed :events="analytics.recentEvents" />
      </WindowFrame>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'
// NO manual import for useRealtimeAnalytics (Auto-imported)

definePageMeta({
  layout: 'admin'
})

const supabase = useSupabaseClient()
const analytics = useRealtimeAnalytics()
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
const messagesPerMin = computed(() => analytics.getMessagesPerMinute())
const activeUsersOverTime = computed(() => analytics.getActiveUsersOverTime())

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
    await analytics.fetchRecentHistory() // Pre-fill buffers
    analytics.subscribe()
    
    // Auto-refresh static stats every 60s (Live charts update automatically)
    refreshTimer.value = setInterval(refreshData, 60000)
    
    // Force re-calculation of dynamic charts every 5s to slide the window
    // (Since they depend on Time.now which isn't reactive)
    const chartTicker = setInterval(() => {
        // Trigger computed reactivity by "poking" the comps? 
        // Actually, computed depends on analytics buffers. 
        // We'll trust the buffers update on events. But empty windows need to slide.
        // Let's rely on event ingress for now or add a trigger if needed.
    }, 5000)
})

onUnmounted(() => {
    analytics.unsubscribe()
    if (refreshTimer.value) clearInterval(refreshTimer.value)
})

</script>

<style lang="scss" scoped>
.analytics-dashboard {
    display: flex;
    flex-direction: column;
    gap: 15px;
    height: 100%;
    overflow-y: auto;
    padding-bottom: 20px;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-title {
    font-size: 20px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px #000;
}

.realtime-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    height: 300px;
}

.bottom-row {
    display: flex;
    gap: 15px;
    height: 350px;
    
    .flex-2 { flex: 2; }
    .flex-1 { flex: 1; }
}

.chart-card {
    display: flex;
    flex-direction: column;
}

.feed-card {
    height: 100%;
    overflow: hidden;
}
</style>
