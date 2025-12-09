<template>
  <button class="retro-button" :disabled="disabled">
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.retro-button {
  @include retro-button;
}
</style>
