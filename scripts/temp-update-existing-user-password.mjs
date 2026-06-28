import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config()

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TARGET_EMAIL', 'NEW_PASSWORD']
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    error: 'Missing required environment variables',
    missing
  }, null, 2))
  process.exit(1)
}

const targetEmail = process.env.TARGET_EMAIL.trim().toLowerCase()

const timeoutFetch = async (url, options = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: timeoutFetch
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function listMatchingUsers(email) {
  const matches = []
  const perPage = 1000

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }

    const users = data?.users || []
    matches.push(...users.filter((user) => user.email?.toLowerCase() === email))

    if (users.length < perPage) {
      break
    }
  }

  return matches
}

try {
  const matches = await listMatchingUsers(targetEmail)

  if (matches.length !== 1) {
    console.error(JSON.stringify({
      ok: false,
      error: 'Expected exactly one matching Auth user',
      targetEmail,
      matchCount: matches.length
    }, null, 2))
    process.exit(1)
  }

  const user = matches[0]

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: process.env.NEW_PASSWORD,
    email_confirm: true
  })

  if (updateError) {
    console.error(JSON.stringify({
      ok: false,
      matchedEmail: user.email,
      matchedUserId: user.id,
      passwordUpdated: false,
      error: updateError.message
    }, null, 2))
    process.exit(1)
  }

  const { data: authCheck, error: authCheckError } = await supabase.auth.admin.getUserById(user.id)
  if (authCheckError) {
    throw new Error(`Password updated, but failed to verify Auth user: ${authCheckError.message}`)
  }

  const { data: publicUser, error: publicUserError } = await supabase
    .from('users')
    .select('id, email, supabase_user_id, is_admin')
    .eq('supabase_user_id', user.id)
    .maybeSingle()

  if (publicUserError) {
    throw new Error(`Password updated, but failed to verify public.users row: ${publicUserError.message}`)
  }

  console.log(JSON.stringify({
    ok: true,
    matchedEmail: user.email,
    matchedUserId: user.id,
    passwordUpdated: true,
    authUserStillExists: Boolean(authCheck?.user),
    publicUsersRowExists: Boolean(publicUser),
    publicUsersIsAdmin: publicUser ? Boolean(publicUser.is_admin) : null
  }, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error.message
  }, null, 2))
  process.exit(1)
}
