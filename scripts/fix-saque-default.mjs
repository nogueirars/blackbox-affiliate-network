/**
 * Corrige o DEFAULT da coluna status em public.saques
 * Uso: node --env-file=.env.local scripts/fix-saque-default.mjs
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

try {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE public.saques ALTER COLUMN status SET DEFAULT 'AGUARDANDO_LIBERACAO'`
  )
  console.log('✓ DEFAULT de saques.status corrigido para AGUARDANDO_LIBERACAO')
} catch (err) {
  console.error('Erro:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
