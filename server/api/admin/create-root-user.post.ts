import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)

  const email = 'superadmin@chronops.com'
  const password = 'ChronOps_Secure_99!'

  try {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: 'System Admin'
      }
    })

    if (error) {
      if (error.message.includes('already registered') || error.status === 422) {
        return { message: 'Admin user already exists.' }
      }
      throw error
    }

    return { message: 'Admin user created successfully.', user: data.user }
  } catch (err: any) {
    console.error('Error creating admin user:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create admin user: ' + err.message
    })
  }
})
