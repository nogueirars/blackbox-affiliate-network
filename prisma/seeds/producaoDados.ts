import { PrismaClient } from '@prisma/client'

const HOUSES = [
  { name: 'Betano', id: 'ec640729-847b-4139-8821-bc86adf447f0' },
  { name: 'UpBet', id: '84293816-e0ac-4a05-ab45-4d4ee0c21ac4' },
  { name: 'LotoGreen', id: '1ea32608-6f48-4c76-8db1-0f0419a24583' },
]

function generateAFP() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export async function seedProducaoDados(prisma: PrismaClient) {
  console.log('\n--- Inciando Seed de Produção e Contratos ---')

  const intermediario = await prisma.public_users.findUnique({ where: { email: 'intermediario@orbit.dev' } })
  const gerente = await prisma.public_users.findUnique({ where: { email: 'gerente@orbit.dev' } })
  const influencer1 = await prisma.public_users.findUnique({ where: { email: 'influencer@orbit.dev' } })
  const influencer2 = await prisma.public_users.findUnique({ where: { email: 'influencer2@orbit.dev' } })

  if (!intermediario || !gerente || !influencer1 || !influencer2) {
    console.error('Usuários não encontrados. Rode o seed de users primeiro.')
    return
  }

  const roleInt = await prisma.user_roles.findFirst({ where: { id_usuario: intermediario.id, role: 'INTERMEDIARIO' } })
  const roleGer = await prisma.user_roles.findFirst({ where: { id_usuario: gerente.id, role: 'GERENTE' } })
  const roleInf1 = await prisma.user_roles.findFirst({ where: { id_usuario: influencer1.id, role: 'AFILIADO' } })
  const roleInf2 = await prisma.user_roles.findFirst({ where: { id_usuario: influencer2.id, role: 'AFILIADO' } })

  if (!roleInt || !roleGer || !roleInf1 || !roleInf2) {
    console.error('Roles de usuários não encontradas.')
    return
  }

  // 1. Criar Contratos em Cascata para cada Casa
  console.log('\nGerando Contratos e Históricos...')
  const startDate = new Date('2025-01-01')

  const targetContracts = [] // Guardar os contratos dos influencers para gerar os dados depois

  for (const house of HOUSES) {
    // Intermediario Contract
    let cInt = await prisma.contratos.findFirst({ where: { id_user_role: roleInt.id, id_casa: house.id } })
    if (!cInt) {
      cInt = await prisma.contratos.create({
        data: {
          id_casa: house.id,
          id_user_role: roleInt.id,
          afp: generateAFP(),
          tipo_contrato: 'MISTO',
          ativo: true,
          historico_contratos: {
            create: {
              id_casa: house.id,
              data_inicio: startDate,
              cpa_bruto: 100,
              revshare_percentual: 50,
              aliquota_imposto: 10,
              revshare_repasse: 0
            }
          }
        }
      })
    }

    // Gerente Contract
    let cGer = await prisma.contratos.findFirst({ where: { id_user_role: roleGer.id, id_casa: house.id } })
    if (!cGer) {
      cGer = await prisma.contratos.create({
        data: {
          id_casa: house.id,
          id_user_role: roleGer.id,
          id_contrato_pai: cInt.id,
          afp: generateAFP(),
          tipo_contrato: 'MISTO',
          ativo: true,
          historico_contratos: {
            create: {
              id_casa: house.id,
              data_inicio: startDate,
              cpa_bruto: 80,
              revshare_percentual: 40,
              aliquota_imposto: 10,
              revshare_repasse: 40
            }
          }
        }
      })
    }

    // Influencer 1 Contract
    let cInf1 = await prisma.contratos.findFirst({ where: { id_user_role: roleInf1.id, id_casa: house.id } })
    if (!cInf1) {
      cInf1 = await prisma.contratos.create({
        data: {
          id_casa: house.id,
          id_user_role: roleInf1.id,
          id_contrato_pai: cGer.id,
          afp: generateAFP(),
          tipo_contrato: 'MISTO',
          ativo: true,
          historico_contratos: {
            create: {
              id_casa: house.id,
              data_inicio: startDate,
              cpa_bruto: 60,
              revshare_percentual: 30,
              aliquota_imposto: 10,
              revshare_repasse: 30
            }
          }
        }
      })
    }
    targetContracts.push(cInf1)

    // Influencer 2 Contract
    let cInf2 = await prisma.contratos.findFirst({ where: { id_user_role: roleInf2.id, id_casa: house.id } })
    if (!cInf2) {
      cInf2 = await prisma.contratos.create({
        data: {
          id_casa: house.id,
          id_user_role: roleInf2.id,
          id_contrato_pai: cGer.id,
          afp: generateAFP(),
          tipo_contrato: 'MISTO',
          ativo: true,
          historico_contratos: {
            create: {
              id_casa: house.id,
              data_inicio: startDate,
              cpa_bruto: 60,
              revshare_percentual: 30,
              aliquota_imposto: 10,
              revshare_repasse: 30
            }
          }
        }
      })
    }
    targetContracts.push(cInf2)
  }

  // 2. Gerar 90 dias de dados de produção para os Contratos dos Influencers
  console.log('\nGerando 90 dias de dados de produção...')
  const today = new Date()
  let totalRows = 0

  for (let i = 0; i < 90; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() - i)
    targetDate.setHours(0, 0, 0, 0)

    for (const contract of targetContracts) {
      const existing = await prisma.producao_dados.findUnique({
        where: {
          data_id_casa_id_contrato: {
            data: targetDate,
            id_casa: contract.id_casa,
            id_contrato: contract.id
          }
        }
      })

      if (!existing) {
        const cadastros = Math.floor(Math.random() * 40) + 10 // 10 a 50
        const ftds = Math.floor(Math.random() * 15) + 5 // 5 a 20
        const valorDepositos = (Math.random() * 4500) + 500 // 500 a 5000

        const cpas = Math.floor(ftds * 0.8) // 80% convertem CPA
        const ngr = valorDepositos * 0.4 // margem de 40% da casa
        const receita_cpa = cpas * 60 // R$ 60 por CPA (do contrato do inf)
        const receita_rev = ngr * 0.3 // 30% do NGR (do contrato do inf)
        const receita_bruta = receita_cpa + receita_rev

        await prisma.producao_dados.create({
          data: {
            data: targetDate,
            id_casa: contract.id_casa,
            id_contrato: contract.id,
            cadastros,
            ftds,
            valor_depositos: valorDepositos,
            redepositos: Math.floor(ftds * 1.5),
            valor_redepositos: valorDepositos * 0.6,
            total_depositos: ftds + Math.floor(ftds * 1.5),
            cpas,
            ngr,
            receita_cpa,
            receita_rev,
            receita_bruta,
            origem: 'API_MOCK'
          }
        })
        totalRows++
      }
    }
  }

  console.log(`\nConcluído! ${totalRows} novos registros de produção foram inseridos.`)
}
