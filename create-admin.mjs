import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://flllhvfjdfzlpmhywilt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { error } = await supabase.auth.admin.createUser({
  email: 'admin@itri-academy.dz',
  password: 'Admin123!',
  email_confirm: true,
  user_metadata: { firstName: 'Admin', lastName: 'ITRI', role: 'admin' }
})

if (error) console.error(error)
else console.log('Admin created!')
