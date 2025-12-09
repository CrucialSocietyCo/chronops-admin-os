<template>
  <div class="desktop">
    <slot />
  </div>
</template>

<style lang="scss">
.desktop {
  min-height: 100vh;
  background-color: #008080; // Classic teal desktop background
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
</style>
