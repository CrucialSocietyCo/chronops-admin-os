<template>
  <div
    class="desktop"
    :class="[borderStyleClass, colorThemeClass, rootThemeClass]"
    :data-theme="currentTheme"
    :data-border-style="currentBorderStyle"
    :data-color-theme="currentTheme"
    :data-admin-badge="currentAdminBadge"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  borderStyleClassName,
  colorThemeClassName,
  normalizeAdminBadge,
  normalizeBorderStyle,
  normalizeColorTheme,
  rootThemeClassName,
  rootThemeClassNames
} from '~/utils/aesthetics'

const currentTheme = ref('teal_base')
const currentBorderStyle = ref('system95')
const currentAdminBadge = ref('star_icon')

const colorThemeClass = computed(() => colorThemeClassName(currentTheme.value))
const borderStyleClass = computed(() => borderStyleClassName(currentBorderStyle.value))
const rootThemeClass = computed(() => rootThemeClassName(currentTheme.value))
let stopThemeWatch: (() => void) | null = null

const syncBodyThemeClass = () => {
  if (!import.meta.client) return

  document.body.classList.remove(...rootThemeClassNames())
  if (rootThemeClass.value) {
    document.body.classList.add(rootThemeClass.value)
  }
  document.body.dataset.theme = currentTheme.value
}

const fetchPublicTheme = async () => {
  try {
    const data = await $fetch('/api/chat/context')
    currentTheme.value = normalizeColorTheme(data?.color_theme)
    currentBorderStyle.value = normalizeBorderStyle(data?.window_border_style)
    currentAdminBadge.value = normalizeAdminBadge(data?.admin_badge_style)
  } catch (error) {
    console.error('Failed to load public theme settings', error)
  }
}

onMounted(() => {
  fetchPublicTheme()
  stopThemeWatch = watch(currentTheme, syncBodyThemeClass, { immediate: true })
})

onUnmounted(() => {
  stopThemeWatch?.()
  if (import.meta.client) {
    document.body.classList.remove(...rootThemeClassNames())
    delete document.body.dataset.theme
  }
})
</script>

<style lang="scss">
.desktop {
  min-height: 100vh;
  background-color: var(--retro-desktop-bg, #008080);
  color: var(--retro-text, #000000);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
</style>
