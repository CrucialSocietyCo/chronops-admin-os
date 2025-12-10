<template>
  <div class="login-container">
    <WindowFrame :title="isSignUp ? 'System Registration' : 'System Login'">
      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="isSignUp" class="form-group">
          <RetroInput
            id="name"
            label="Full Name"
            type="text"
            v-model="name"
            placeholder="Admin User"
          />
        </div>
        <div class="form-group">
          <RetroInput
            id="email"
            label="Email"
            type="email"
            v-model="email"
            placeholder="admin@chronops.com"
          />
        </div>
        <div class="form-group">
          <RetroInput
            id="password"
            label="Password"
            type="password"
            v-model="password"
            placeholder="********"
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        <div v-if="message" class="success-message">
          {{ message }}
        </div>

        <div class="actions">
          <a href="#" @click.prevent="toggleMode" class="toggle-link">
            {{ isSignUp ? 'Back to Login' : 'Create Account' }}
          </a>
          <RetroButton :disabled="loading">
            {{ loading ? 'Processing...' : (isSignUp ? 'Register' : 'Login') }}
          </RetroButton>
        </div>
      </form>
    </WindowFrame>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const name = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')
const isSignUp = ref(false)

const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
  message.value = ''
}

const handleSubmit = async () => {
  if (isSignUp.value) {
    await handleSignUp()
  } else {
    await handleLogin()
  }
}

const handleSignUp = async () => {
  try {
    loading.value = true
    error.value = ''
    message.value = ''
    
    console.log('Attempting signup with:', { email: email.value, name: name.value })

    if (!name.value) throw new Error('Name is required')

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          name: name.value
        }
      }
    })

    if (authError) {
      console.error('Supabase Auth Error:', authError)
      throw authError
    }

    console.log('Signup successful:', data)
    message.value = 'Registration successful! Please check your email to confirm, or if auto-confirm is on, login now.'
    isSignUp.value = false
  } catch (e: any) {
    console.error('Signup Exception:', e)
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (authError) throw authError

    // Wait for state update
    const user = useSupabaseUser()
    if (user.value) {
        navigateTo('/admin/dashboard')
    } else {
        // Watch for change
        const unwatch = watch(user, (newUser) => {
            if (newUser) {
                unwatch()
                navigateTo('/admin/dashboard')
            }
        })
        // Fallback if it never updates (rare)
        setTimeout(() => {
             if (useSupabaseUser().value) navigateTo('/admin/dashboard')
        }, 1000)
    }

  } catch (e: any) {
    error.value = e.message
    loading.value = false // Ensure we stop loading on error
  }
  // Do not stop loading on success to prevent flashes
}
</script>

<style lang="scss" scoped>
@use '~/assets/scss/mixins' as *;

.login-container {
  width: 400px;
  margin: 0 auto;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.error-message {
  color: red;
  font-family: $font-family;
  font-size: 12px;
  text-align: center;
  padding: 4px;
  border: 1px dotted red;
}

.success-message {
  color: green;
  font-family: $font-family;
  font-size: 12px;
  text-align: center;
  padding: 4px;
  border: 1px dotted green;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.toggle-link {
  font-family: $font-family;
  font-size: 12px;
  color: blue;
  text-decoration: underline;
  cursor: pointer;
}
</style>
