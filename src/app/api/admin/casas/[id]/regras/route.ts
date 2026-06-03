import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const { data, error } = await db
      .from('casas_regras')
      .select('*')
      .eq('casa_id', id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const body = await request.json()

    // Check if rule already exists
    const { data: existing } = await db
      .from('casas_regras')
      .select('id')
      .eq('casa_id', id)
      .maybeSingle()

    const payload = {
      casa_id: id,
      regras_cpa: body.regras_cpa || null,
      tempo_atualizacao: body.tempo_atualizacao || null,
      exige_documentacao: body.exige_documentacao || null,
      deposito_minimo: body.deposito_minimo || null,
      observacoes: body.observacoes || null,
    }

    if (existing) {
      const { data, error } = await db
        .from('casas_regras')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    } else {
      const { data, error } = await db
        .from('casas_regras')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
