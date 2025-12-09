<template>
  <div class="retro-input-wrapper">
    <label v-if="label" :for="id">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="retro-input"
      :placeholder="placeholder"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  id?: string
  label?: string
  type?: string
  modelValue?: string | number
  placeholder?: string
}>()

defineEmits(['update:modelValue'])
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.retro-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;

  label {
    font-size: 14px;
  }
}

.retro-input {
  @include retro-input;
}
</style>
