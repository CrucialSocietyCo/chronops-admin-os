<template>
  <div style="display: none;">
    <!-- Shared SVG Definitions -->
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 1. Tape Icon (Pixel Art Style) -->
        <symbol id="icon-tape" viewBox="0 0 24 24">
          <!-- Body -->
          <rect x="2" y="4" width="20" height="14" rx="1" fill="#333" stroke="#000" stroke-width="2"/>
          <!-- Label Area -->
          <rect x="4" y="6" width="16" height="8" fill="#5BC8C4" stroke="#000" stroke-width="1"/>
          <!-- Spools -->
          <circle cx="8" cy="10" r="2" fill="#D6B26A" stroke="#000" stroke-width="1"/>
          <circle cx="16" cy="10" r="2" fill="#D6B26A" stroke="#000" stroke-width="1"/>
          <!-- Bottom details -->
          <rect x="6" y="15" width="12" height="2" fill="#111"/>
        </symbol>

        <!-- 2. Play Button (Pixel Triangle) -->
        <symbol id="icon-play-pixel" viewBox="0 0 12 12">
           <path d="M3 2 L10 6 L3 10 Z" fill="currentColor" stroke="none" />
        </symbol>

        <!-- 3. Waveform Bar (Single Unit) -->
        <symbol id="icon-wave-bar" viewBox="0 0 4 12">
           <rect x="0" y="2" width="4" height="8" rx="1" fill="currentColor" />
        </symbol>
      </defs>
    </svg>
  </div>
</template>

<script setup>
// This component just holds global SVG defs or can be used to export specific icons
</script>

<style scoped>
/* Utility if needed */
</style>
