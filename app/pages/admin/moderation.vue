<template>
  <div class="moderation-page">
      <div class="moderation-content">
        <SettingsEditor />
      </div>
  </div>
</template>

<script setup>
import SettingsEditor from '~/components/moderation/SettingsEditor.vue'

definePageMeta({
  layout: 'admin'
})
</script>

<style lang="scss" scoped>
.moderation-page {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  padding-bottom: 40px;
}

.moderation-content {
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
}
</style>

