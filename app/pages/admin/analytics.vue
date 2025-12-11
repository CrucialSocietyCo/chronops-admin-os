<template>
  <div>
    <h1>Analytics Debug Step 2</h1>
    <p>Composable Loaded? {{ loaded }}</p>
    <pre>{{ events }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRealtimeAnalytics } from '~/composables/useRealtimeAnalytics'

definePageMeta({
  layout: 'admin'
})

const loaded = ref(false)
const events = ref([])

onMounted(() => {
    try {
        const analytics = useRealtimeAnalytics()
        console.log('Analytics loaded', analytics)
        events.value = analytics.recentEvents.value
        loaded.value = true
    } catch (e) {
        console.error('Composable Failed', e)
        alert('Composable Error: ' + e.message)
    }
})
</script>
