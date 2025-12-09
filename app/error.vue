<template>
  <div class="error-page">
    <WindowFrame title="Error" width="30%" height="30%">
      <div class="error-content">
        <div class="error-icon">
          <img src="https://win98icons.alexmeub.com/icons/png/msg_error-0.png" alt="error" />
        </div>
        <div class="error-details">
          <h2>{{ error.statusCode }}</h2>
          <p>{{ error.message || 'An unexpected error occurred.' }}</p>
          
          <div class="actions">
            <RetroButton @click="handleError">
              {{ isAuthenticated ? 'Go to Dashboard' : 'Go to Login' }}
            </RetroButton>
          </div>
        </div>
      </div>
    </WindowFrame>
  </div>
</template>

<script setup>
import { useError, clearError } from '#app'
import { useSupabaseUser } from '#imports'
import { computed } from 'vue'
import WindowFrame from '~/components/WindowFrame.vue'
import RetroButton from '~/components/RetroButton.vue'

const error = useError()
const user = useSupabaseUser()

const isAuthenticated = computed(() => !!user.value)

const handleError = () => {
  const redirectPath = isAuthenticated.value ? '/admin/dashboard' : '/login'
  clearError({ redirect: redirectPath })
}
</script>

<style lang="scss" scoped>
.error-page {
  height: 100vh;
  background-color: #008080;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-content {
  padding: 15px;
  display: flex;
  gap: 15px;
  align-items: flex-start;
  height: 100%;
}

.error-icon img {
  width: 32px;
  height: 32px;
}

.error-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  h2 {
    margin: 0 0 10px 0;
    font-size: 24px;
  }
  
  p {
    margin-bottom: 20px;
    flex: 1;
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
