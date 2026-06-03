/**
 * Simulates DashboardLayout + DashboardShell logic for test@orbit.dev.
 * Run: npx tsx scripts/test-roles-logic.ts
 */
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SUPABASE_URL = 'https://tsavvhlrnvzzmxjgrkot.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXZ2aGxybnZ6em14amdya290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQwMTMxNSwiZXhwIjoyMDk0OTc3MzE1fQ.4HFIGBdBCnUi3OMu7apdnea6zkAtm9SQ20msOlTbzPI'
const DIRECT_URL =
  'postgresql://postgres.tsavvhlrnvzzmxjgrkot:Blackbox@33225640@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'

const AUTH_ID = '520ae335-6ed9-4652-a56b-52409645ad20'

const DB_ROLE_MAP: Record<string, string> = {
  ADMIN: 'admin',
  INFLUENCER: 'influenciador',
  INTERMEDIARIO: 'intermediario',
  GERENTE: 'gerente',
}

const ROLE_HIERARCHY = ['admin', 'intermediario', 'gerente', 'influenciador']

type ViewKey = 'admin' | 'gestor' | 'influenciador'

function deriveAvailableViews(roles: string[]): ViewKey[] {
  const views: ViewKey[] = []
  if (roles.includes('admin')) views.push('admin')
  if (roles.includes('intermediario') || roles.includes('gerente')) views.push('gestor')
  if (roles.includes('influenciador')) views.push('influenciador')
  return views
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const adapter = new PrismaPg({ connectionString: DIRECT_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    // --- Step 1: Read JWT (what layout.tsx gets from supabase.auth.getUser) ---
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(AUTH_ID)
    if (authErr) throw authErr
    const appMeta = authData.user.app_metadata as Record<string, unknown>
    console.log('\n[1] JWT app_metadata:', JSON.stringify(appMeta))

    // --- Step 2: Replicate layout.tsx role extraction ---
    const metaRoles: string[] = Array.isArray(appMeta?.roles)
      ? (appMeta.roles as string[]).map(r => r.toUpperCase())
      : appMeta?.role
        ? [(appMeta.role as string).toUpperCase()]
        : []

    console.log('[2] metaRoles from JWT:', metaRoles)

    const isAdminByMeta = metaRoles.includes('ADMIN')
    let roles: string[] = isAdminByMeta ? ['admin'] : []

    // --- Step 3: DB lookup ---
    const publicUser = await prisma.public_users.findUnique({
      where: { auth_id: AUTH_ID },
      select: { id: true },
    })
    console.log('[3] public_users.id:', publicUser?.id)

    if (publicUser) {
      const userRolesData = await prisma.user_roles.findMany({
        where: { id_usuario: publicUser.id, ativo: true },
        select: { role: true },
      })
      const dbRoles = userRolesData
        .map(r => DB_ROLE_MAP[r.role] ?? r.role.toLowerCase())
        .filter(r => r !== 'admin')
      roles.push(...dbRoles)
    }

    if (roles.length === 0) roles.push('influenciador')
    console.log('[4] Final roles[]:', roles)

    // --- Step 4: DashboardShell view derivation ---
    const availableViews = deriveAvailableViews(roles)
    console.log('[5] Available views (switcher tabs):', availableViews)

    const primaryRole = ROLE_HIERARCHY.find(r => roles.includes(r)) ?? 'influenciador'
    console.log('[6] Primary role (badge):', primaryRole)

    // --- Assertions ---
    const ok = (label: string, cond: boolean) => {
      console.log(`${cond ? '✅' : '❌'} ${label}`)
      return cond
    }

    console.log('\n--- Assertions ---')
    const passed = [
      ok('roles contains admin', roles.includes('admin')),
      ok('roles contains intermediario', roles.includes('intermediario')),
      ok('roles contains influenciador', roles.includes('influenciador')),
      ok('views has admin', availableViews.includes('admin')),
      ok('views has gestor', availableViews.includes('gestor')),
      ok('views has influenciador', availableViews.includes('influenciador')),
      ok('3 switcher tabs shown', availableViews.length === 3),
      ok('primaryRole is admin', primaryRole === 'admin'),
    ]

    const allPass = passed.every(Boolean)
    console.log(allPass ? '\n✅ All assertions passed.' : '\n❌ Some assertions failed.')
    process.exit(allPass ? 0 : 1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
