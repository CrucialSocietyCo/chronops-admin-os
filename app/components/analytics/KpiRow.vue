<template>
  <div class="kpi-row">
    <WindowFrame title="Current Active" class="kpi-card">
      <div class="kpi-value">{{ stats.current_active || 0 }}</div>
      <div class="kpi-label">Users (5m)</div>
    </WindowFrame>

    <WindowFrame title="Max Active (24h)" class="kpi-card">
      <div class="kpi-value highlight">{{ stats.max_concurrent_24h || 0 }}</div>
      <div class="kpi-label">Peak</div>
    </WindowFrame>

    <WindowFrame title="Total Messages" class="kpi-card">
      <div class="kpi-value">{{ stats.total_messages || 0 }}</div>
      <div class="kpi-label">Lifetime</div>
    </WindowFrame>

    <WindowFrame title="Actions Taken" class="kpi-card">
      <div class="kpi-value warning">{{ stats.moderation_actions || 0 }}</div>
      <div class="kpi-label">Moderation</div>
    </WindowFrame>
  </div>
</template>

<script setup lang="ts">
import WindowFrame from '~/components/WindowFrame.vue'

defineProps<{
  stats: {
    current_active?: number
    max_concurrent_24h?: number
    total_messages?: number
    moderation_actions?: number
  }
}>()
</script>

<style lang="scss" scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  height: 100px;
}

.kpi-card {
  .kpi-value {
    font-size: 28px;
    font-weight: bold;
    text-align: center;
    margin-top: 8px;
    font-family: 'Courier New', monospace;

    &.highlight { color: #000080; }
    &.warning { color: #800000; }
  }

  .kpi-label {
    font-size: 12px;
    text-align: center;
    color: #666;
    margin-top: 4px;
  }
}
</style>
