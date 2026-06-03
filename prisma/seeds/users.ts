import { PrismaClient } from '@prisma/client'
import { SupabaseClient } from '@supabase/supabase-js'

const TEST_PASSWORD = 'Orbit@2026'

type SeedRole = 'AFILIADO' | 'INTERMEDIARIO' | 'GERENTE' | 'ADMIN'

const USERS: {
  email: string
  nome_completo: string
  cpf: string
  data_nascimento: Date
  telefone: string
  roles: SeedRole[]
}[] = [
  {
    email: 'influencer@orbit.dev',
    nome_completo: 'Test Influencer',
    cpf: '123.456.789-09',
    data_nascimento: new Date('1990-01-01'),
    telefone: '11900000001',
    roles: ['AFILIADO'],
  },
  {
    email: 'influencer2@orbit.dev',
    nome_completo: 'Test Influencer 2',
    cpf: '223.456.789-09',
    data_nascimento: new Date('1990-01-01'),
    telefone: '11900000005',
    roles: ['AFILIADO'],
  },
  {
    email: 'intermediario@orbit.dev',
    nome_completo: 'Test Intermediario',
    cpf: '987.654.321-00',
    data_nascimento: new Date('1990-01-02'),
    telefone: '11900000002',
    roles: ['INTERMEDIARIO'],
  },
  {
    email: 'gerente@orbit.dev',
    nome_completo: 'Test Gerente',
    cpf: '112.233.445-17',
    data_nascimento: new Date('1990-01-03'),
    telefone: '11900000003',
    roles: ['GERENTE'],
  },
  {
    email: 'test@orbit.dev',
    nome_completo: 'Test Admin',
    cpf: '000.000.001-91',
    data_nascimento: new Date('1990-01-04'),
    telefone: '11900000004',
    roles: ['ADMIN', 'AFILIADO', 'INTERMEDIARIO', 'GERENTE'],
  },
]

export async function seedUsers(prisma: PrismaClient, supabase: SupabaseClient) {
  console.log('Seeding users...')
  
  // Load all existing auth users once
  const { data: existingAuth, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw listErr
  const authByEmail = new Map(existingAuth.users.map(u => [u.email, u.id]))

  for (const user of USERS) {
    console.log(`\n[${user.roles.join('+')}] ${user.email}`)

    // 1. Auth user — skip creation if already exists
    let authId = authByEmail.get(user.email)

    if (authId) {
      console.log(`  auth: already exists (${authId})`)
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      })
      if (error) throw error
      authId = data.user.id
      console.log(`  auth: created (${authId})`)
    }

    // 2. public_users — upsert by email
    const publicUser = await prisma.public_users.upsert({
      where: { email: user.email },
      create: {
        auth_id: authId,
        nome_completo: user.nome_completo,
        cpf: user.cpf,
        data_nascimento: user.data_nascimento,
        telefone: user.telefone,
        email: user.email,
      },
      update: { auth_id: authId },
    })
    console.log(`  public_users: ${publicUser.id}`)

    // 3. user_roles — create each role if not already present
    for (const role of user.roles) {
      const existingRole = await prisma.user_roles.findFirst({
        where: { id_usuario: publicUser.id, role },
      })

      if (existingRole) {
        console.log(`  user_role(${role}): already exists (${existingRole.id})`)
      } else {
        const ur = await prisma.user_roles.create({
          data: { id_usuario: publicUser.id, role, ativo: true },
        })
        console.log(`  user_role(${role}): created (${ur.id})`)
      }
    }
  }

  // Set hierarchy: Influencer -> Gerente -> Intermediario
  console.log('\nSetting user hierarchy...')
  
  const intermediario = await prisma.public_users.findUnique({ where: { email: 'intermediario@orbit.dev' } })
  const gerente = await prisma.public_users.findUnique({ where: { email: 'gerente@orbit.dev' } })
  const influencer1 = await prisma.public_users.findUnique({ where: { email: 'influencer@orbit.dev' } })
  const influencer2 = await prisma.public_users.findUnique({ where: { email: 'influencer2@orbit.dev' } })

  if (intermediario && gerente) {
    await prisma.public_users.update({
      where: { id: gerente.id },
      data: { id_intermediario: intermediario.id, id_gerente: null }
    })
    console.log(`  Gerente vinculado ao Intermediário`)
  }

  if (gerente && influencer1 && influencer2) {
    await prisma.public_users.update({
      where: { id: influencer1.id },
      data: { id_gerente: gerente.id, id_intermediario: null }
    })
    await prisma.public_users.update({
      where: { id: influencer2.id },
      data: { id_gerente: gerente.id, id_intermediario: null }
    })
    console.log(`  Influencers 1 e 2 vinculados ao Gerente`)
  }

  console.log('\nUsers seeded successfully.')
}
