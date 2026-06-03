import { PrismaClient } from '@prisma/client'

export async function seedClean(prisma: PrismaClient) {
  console.log('\n--- Limpando Dados de Produção e Contratos (Seed) ---')

  // Buscar os usuários de teste
  const users = await prisma.public_users.findMany({
    where: { 
      email: { 
        in: ['intermediario@orbit.dev', 'gerente@orbit.dev', 'influencer@orbit.dev', 'influencer2@orbit.dev'] 
      } 
    }
  })
  const userIds = users.map(u => u.id)

  // Buscar as roles deles
  const roles = await prisma.user_roles.findMany({
    where: { id_usuario: { in: userIds } }
  })
  const roleIds = roles.map(r => r.id)

  // Buscar os contratos atrelados a eles
  const contratos = await prisma.contratos.findMany({
    where: { id_user_role: { in: roleIds } }
  })
  const contratoIds = contratos.map(c => c.id)

  if (contratoIds.length === 0) {
    console.log('Nenhum contrato encontrado para os usuários de teste. O banco já está limpo.')
    return
  }

  // 1. Deletar os dados de produção
  const delProducao = await prisma.producao_dados.deleteMany({
    where: { id_contrato: { in: contratoIds } }
  })
  console.log(`- ${delProducao.count} registros de producao_dados deletados.`)

  // 2. Deletar os históricos de contratos
  const delHistorico = await prisma.historico_contratos.deleteMany({
    where: { id_contrato: { in: contratoIds } }
  })
  console.log(`- ${delHistorico.count} registros de historico_contratos deletados.`)

  // 3. Deletar os contratos em si
  const delContratos = await prisma.contratos.deleteMany({
    where: { id: { in: contratoIds } }
  })
  console.log(`- ${delContratos.count} registros de contratos deletados.`)

  console.log('\nLimpeza concluída com sucesso.')
}
