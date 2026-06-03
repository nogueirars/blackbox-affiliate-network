import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tsavvhlrnvzzmxjgrkot.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXZ2aGxybnZ6em14amdya290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQwMTMxNSwiZXhwIjoyMDk0OTc3MzE1fQ.4HFIGBdBCnUi3OMu7apdnea6zkAtm9SQ20msOlTbzPI'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PUBLIC_USER_ID = '73985b5a-e22f-4bda-9b7c-af46aaf77755'
const AUTH_ID = '520ae335-6ed9-4652-a56b-52409645ad20'
const WANTED_ROLES = ['ADMIN', 'INFLUENCER', 'INTERMEDIARIO'] as const

async function main() {
  const { data: existing, error: fetchErr } = await supabase
    .from('user_roles')
    .select('*')
    .eq('id_usuario', PUBLIC_USER_ID)

  if (fetchErr) throw fetchErr
  console.log('Existing rows:', JSON.stringify(existing))

  const activeRoles = (existing ?? [])
    .filter((r: Record<string, unknown>) => r.ativo)
    .map((r: Record<string, unknown>) => r.role as string)

  const needed = WANTED_ROLES.filter(r => !activeRoles.includes(r))

  if (needed.length === 0) {
    console.log('All roles already present.')
  } else {
    const rows = needed.map(role => ({ id_usuario: PUBLIC_USER_ID, role, ativo: true }))
    const { data: inserted, error: insertErr } = await supabase
      .from('user_roles')
      .insert(rows)
      .select()
    if (insertErr) throw insertErr
    console.log('Inserted:', JSON.stringify(inserted))
  }

  // Sync JWT claim
  const { error: rpcErr } = await supabase.rpc('sync_user_role_claim', {
    user_auth_id: AUTH_ID,
  })
  if (rpcErr) {
    console.error('RPC sync failed (run manually):', rpcErr.message)
  } else {
    console.log('JWT synced.')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
