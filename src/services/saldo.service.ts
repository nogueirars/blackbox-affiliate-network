/**
 * saldo.service.ts
 * Schema blackbox_influencers — sem commission_ledger/pagamentos_afiliados/producao_incentivo.
 * Saldo calculado via saques (valores em aberto) + stubs zeros até lógica financeira ser mapeada.
 */
import { SaldoGerente, SaldoInfluenciador, SaldoIntermediario } from '@/types'
import { prisma } from '@/lib/prisma'
import { saque_status } from '@prisma/client'

const SAQUES_ATIVOS_STATUS: saque_status[] = ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO']

async function resolveUserId(authId: string): Promise<string | null> {
  const u = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })
  return u?.id ?? null
}

async function getSaquesAtivosSum(userId: string) {
  const result = await prisma.saques.aggregate({
    where: {
      id_usuario: userId,
      status: { in: SAQUES_ATIVOS_STATUS },
    },
    _sum: { montante: true },
  })
  return Number(result._sum.montante ?? 0)
}

export async function getSaldoInfluenciador(authId: string): Promise<SaldoInfluenciador> {
  const userId = await resolveUserId(authId)
  const saquesAtivos = userId ? await getSaquesAtivosSum(userId) : 0

  return {
    influenciador_id: authId,
    comissao_bruta: 0,      // sem commission_ledger no novo schema
    pag_recebidos: 0,       // sem pagamentos_afiliados no novo schema
    estornos: 0,
    saques_ativos: saquesAtivos,
    saldo_disponivel: -saquesAtivos,
  }
}

export async function getSaldoGerente(authId: string): Promise<SaldoGerente> {
  const userId = await resolveUserId(authId)
  const saquesAtivos = userId ? await getSaquesAtivosSum(userId) : 0

  return {
    gerente_id: authId,
    comissao_propria: 0,
    lucro_rede: 0,
    incentivo: 0,
    consumido: 0,
    saques_ativos: saquesAtivos,
    saldo_disponivel: -saquesAtivos,
  }
}

export async function getSaldoIntermediario(authId: string): Promise<SaldoIntermediario> {
  const userId = await resolveUserId(authId)
  const saquesAtivos = userId ? await getSaquesAtivosSum(userId) : 0

  return {
    intermediario_id: authId,
    comissao_bruta: 0,
    repasse_devido: 0,
    consumido: 0,
    saques_ativos: saquesAtivos,
    saldo_disponivel: -saquesAtivos,
  }
}
