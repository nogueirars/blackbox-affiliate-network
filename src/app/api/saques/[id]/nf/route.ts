import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { submitNotaFiscal } from '@/services/saques.service'
import { validateNotaFiscal } from '@/lib/nf-validator'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/saques/[id]/nf ──────────────────────────────────────────────────
// Proxies the NF PDF through the API so the URL stays at localhost.
// Works for both the owner and admin users.
export async function GET(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const role = (user.app_metadata?.role ?? '') as string
  const isAdminUser = role === 'ADMIN' || role === 'admin'

  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: {
      id: true,
      user_roles: { where: { ativo: true }, select: { role: true } },
    },
  })

  const isAdminByDB = publicUser?.user_roles.some(r => r.role === 'ADMIN') ?? false
  const canViewAll  = isAdminUser || isAdminByDB

  // Admins can view any saque's NF; users only their own
  const saque = await prisma.saques.findFirst({
    where: canViewAll
      ? { id }
      : { id, id_usuario: publicUser?.id ?? '' },
    select: { nota_fiscal: true },
  })

  if (!saque?.nota_fiscal) {
    return NextResponse.json({ error: 'NF não encontrada' }, { status: 404 })
  }

  try {
    const signedUrl = await storage.getUrl(saque.nota_fiscal)

    // Proxy the PDF — keeps URL at localhost, avoids preview/CSP redirect blocks
    const upstream = await fetch(signedUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Erro ao buscar NF no storage' }, { status: 502 })
    }

    const buffer = await upstream.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="nf-${id}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST /api/saques/[id]/nf ─────────────────────────────────────────────────
// Accepts multipart/form-data with a "file" field (PDF).
// Uploads via lib/storage (server-side, service role), stores path in DB.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[nf/route POST] user:', user?.id ?? null, '| authError:', authError?.message ?? null)
    if (!user) return NextResponse.json({ error: 'Unauthorized', detail: authError?.message ?? 'no user' }, { status: 401 })

    const { id } = await params

    const [publicUser, saque] = await Promise.all([
      prisma.public_users.findUnique({
        where: { auth_id: user.id },
        select: { id: true },
      }),
      prisma.saques.findFirst({
        where: { id, status: 'AGUARDANDO_NF' },
        select: { id: true, montante: true, id_usuario: true },
      }),
    ])

    if (!publicUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    if (!saque) return NextResponse.json({ error: 'Saque não encontrado ou não está aguardando NF' }, { status: 404 })
    if (saque.id_usuario !== publicUser.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Campo "file" obrigatório' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 10 MB)' }, { status: 400 })
    }

    // ── Validação de conteúdo da NF ────────────────────────────────────────
    const montante = Number(saque.montante)
    const nfResult = await validateNotaFiscal(file, montante)
    if (!nfResult.valid) {
      return NextResponse.json({ error: nfResult.reason }, { status: 422 })
    }

    const safeName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    const storagePath = await storage.upload(file, `saques/${id}/${Date.now()}_${safeName}`)
    const updated = await submitNotaFiscal(id, publicUser.id, storagePath)
    return NextResponse.json(updated)

  } catch (err) {
    // Top-level catch: always return JSON so clients never see HTML 500 pages
    console.error('[POST /api/saques/nf] unhandled error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro interno ao processar NF: ${msg}` }, { status: 500 })
  }
}
