import { PrismaClient } from '@prisma/client'
import { SupabaseClient } from '@supabase/supabase-js'
import { seedProducaoDados } from './producaoDados'

export async function seedTests(prisma: PrismaClient, supabase: SupabaseClient) {
  console.log('Seeding tests (Produção de Dados em Larga Escala)...')
  
  await seedProducaoDados(prisma)
  
  console.log('\nTest seed finished.')
}
