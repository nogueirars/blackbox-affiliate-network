/**
 * Main seed entry point.
 * Run default (users): npx tsx prisma/seed.ts
 * Run tests seed:      npx tsx prisma/seed.ts tests
 */

import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

import { seedUsers } from './seeds/users'
import { seedTests } from './seeds/tests'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const args = process.argv.slice(2)
  const type = args[0] || 'users'

  console.log(`=========================================`)
  console.log(`Starting seed type: ${type}`)
  console.log(`=========================================`)

  if (type === 'tests') {
    await seedTests(prisma, supabase)
  } else if (type === 'users') {
    await seedUsers(prisma, supabase)
  } else if (type === 'clean') {
    const { seedClean } = require('./seeds/clean')
    await seedClean(prisma)
  } else {
    console.error(`Unknown seed type: ${type}`)
    console.error(`Available options: users, tests, clean`)
    process.exit(1)
  }

  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
