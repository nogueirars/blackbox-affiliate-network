import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://tsavvhlrnvzzmxjgrkot.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXZ2aGxybnZ6em14amdya290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQwMTMxNSwiZXhwIjoyMDk0OTc3MzE1fQ.4HFIGBdBCnUi3OMu7apdnea6zkAtm9SQ20msOlTbzPI',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '520ae335-6ed9-4652-a56b-52409645ad20',
    { app_metadata: { roles: ['ADMIN', 'INFLUENCER', 'INTERMEDIARIO'] } }
  )
  if (error) throw error
  console.log('Updated app_metadata:', JSON.stringify(data.user.app_metadata))
}

main().catch(e => { console.error(e); process.exit(1) })
