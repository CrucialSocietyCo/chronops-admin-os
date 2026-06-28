<template>
  <div class="window-frame" :class="{ closing: isClosing }" :style="{ width: width, height: height }">
    <div class="title-bar">
      <div class="title-bar-text">{{ title }}</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize" @click="$emit('minimize')">_</button>
        <button aria-label="Maximize" @click="$emit('maximize')">□</button>
        <button v-if="!isDashboard" aria-label="Close" @click="handleClose">X</button>
      </div>
    </div>
    <div class="window-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps<{
  title: string
  width?: string
  height?: string
}>()

defineEmits(['minimize', 'maximize', 'close'])

const router = useRouter()
const route = useRoute()
const isClosing = ref(false)

const isDashboard = computed(() => route.path === '/admin/dashboard')

const handleClose = () => {
  isClosing.value = true
  setTimeout(() => {
    router.push('/admin/dashboard')
  }, 300) // Match animation duration
}
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.window-frame {
  @include retro-window;
  width: 100%;
  width: 100%;
  border: var(--retro-frame-border);
  border-radius: var(--retro-frame-radius);
  /* height: 100% removed to allow varying heights for masonry/grid */
  transition: all 0.3s ease-in-out;
  transform-origin: center;

  &.closing {
    transform: scale(0.1);
    opacity: 0;
  }
}

.title-bar {
  @include retro-title-bar;
  margin-bottom: 2px;
}

.title-bar-controls {
  display: flex;
  gap: 2px;

  button {
    @include retro-button;
    padding: 0;
    width: 16px;
    height: 14px;
    font-size: 9px;
    line-height: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--retro-surface);
    color: var(--retro-text);
  }
}

.window-body {
  flex: 1;
  padding: 8px;
  overflow: auto;
}
</style>
