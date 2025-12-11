<template>
  <div>
    <h1>Analytics Debug Page</h1>
    <p>If you can see this, the route exists.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin'
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
