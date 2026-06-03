import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const { data, error } = await db
      .from('casas_materiais_publicidade')
      .select('*')
      .eq('casa_id', id)
      .order('created_at', { ascending: false })

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

    const payload = {
      casa_id: id,
      nome: body.nome,
      descricao: body.descricao || null,
      file_path: body.file_path || '/placeholder/path.png', // Since storage is mocked for now
      file_size: body.file_size || null,
      file_type: body.file_type || null,
    }

    const { data, error } = await db
      .from('casas_materiais_publicidade')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
