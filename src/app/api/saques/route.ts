import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSaldoInfluenciador } from '@/lib/finance/saldo-influenciador'
import { getSaldoGerente } from '@/lib/finance/saldo-gerente'
import { getSaldoIntermediario } from '@/lib/finance/saldo-intermediario'
import { createSaque, getSaquesByAfiliado, getSaquesAdmin } from '@/services/saques.service'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth-helpers'

const VALOR_MINIMO = 50

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Admin não pode solicitar saque' }, { status: 400 })
  }

  const role = (user.app_metadata?.role ?? 'influenciador') as string

  let body: {
    cnpj: string
    razao_social: string
    telefone: string
    pix_key: string
    pix_key_type?: string
    montante: number
    itens: Array<{ id_casa: string; montante: number }>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { cnpj, razao_social, telefone, pix_key, pix_key_type, montante, itens } = body

  if (!cnpj?.trim())
    return NextResponse.json({ error: 'CNPJ obrigatório' }, { status: 400 })
  if (!razao_social?.trim())
    return NextResponse.json({ error: 'Razão social obrigatória' }, { status: 400 })
  if (!telefone?.trim())
    return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
  if (!pix_key?.trim())
    return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })
  if (!pix_key_type)
    return NextResponse.json({ error: 'Tipo de chave PIX obrigatório' }, { status: 400 })
  if (!montante || montante < VALOR_MINIMO)
    return NextResponse.json({ error: `Valor mínimo de saque é R$${VALOR_MINIMO}` }, { status: 400 })
  if (!Array.isArray(itens) || itens.length === 0)
    return NextResponse.json({ error: 'Selecione pelo menos uma casa' }, { status: 400 })

  // H3: validar que soma dos itens bate com montante declarado
  const somaItens = itens.reduce((acc, i) => acc + Number(i.montante), 0)
  if (Math.abs(somaItens - montante) > 0.01)
    return NextResponse.json({ error: 'Soma dos itens não confere com o montante total' }, { status: 400 })

  let saldoDisponivel = 0
  try {
    const r = role.toUpperCase()
    if (r === 'INFLUENCER' || r === 'INFLUENCIADOR') {
      const s = await getSaldoInfluenciador(user.id)
      saldoDisponivel = s.saldo_disponivel
    } else if (r === 'GERENTE') {
      const s = await getSaldoGerente(user.id)
      saldoDisponivel = s.saldo_disponivel
    } else if (r === 'INTERMEDIARIO') {
      const s = await getSaldoIntermediario(user.id)
      saldoDisponivel = s.saldo_disponivel
    }
  } catch (err) {
    console.error('[saques] saldo error', err)
    return NextResponse.json({ error: 'Erro ao calcular saldo' }, { status: 500 })
  }

  if (montante > saldoDisponivel) {
    return NextResponse.json(
      { error: 'Saldo insuficiente', saldo_disponivel: saldoDisponivel, valor_solicitado: montante },
      { status: 400 }
    )
  }

  try {
    const saque = await createSaque({
      afiliado_id: user.id,
      cnpj,
      razao_social,
      telefone,
      pix_key,
      pix_key_type,
      montante,
      itens,
    })
    return NextResponse.json(saque, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[saques] create error', err)
    return NextResponse.json({ error: 'Erro ao criar saque', detail: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  if (isAdmin(user.app_metadata)) {
    const result = await getSaquesAdmin({ limit, offset })
    return NextResponse.json(result)
  }

  const data = await getSaquesByAfiliado(user.id, { limit, offset })
  return NextResponse.json({ data, total: data.length, limit, offset })
}
