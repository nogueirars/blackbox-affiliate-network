import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string // 'icon' ou 'material'
    
    if (!file) {
      return new NextResponse('File is required', { status: 400 })
    }

    const ext = file.name.split('.').pop()
    
    // Define a estrutura de pastas /casas/[id]/...
    let uploadPath = ''
    if (type === 'icon') {
      uploadPath = `casas/${id}/icon.${ext}`
    } else {
      // Para materiais de publicidade, adiciona um timestamp para não sobrepor arquivos de mesmo nome
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const fileName = `${Date.now()}_${safeName}`
      uploadPath = `casas/${id}/materiais/${fileName}`
    }

    // 1. Upload via Lib de Storage abstrata (que roda no Supabase)
    const s3Path = await storage.upload(file, uploadPath) 
    
    // O banco de dados guarda estritamente a raiz da string ("/casas/...").
    const dbPath = `/${s3Path}`

    // 2. Persistir no banco de dados
    if (type === 'icon') {
      await prisma.casas_aposta.update({
        where: { id },
        data: { icone_url: dbPath }
      })
      return NextResponse.json({ success: true, path: dbPath })
    } else {
      const nome = formData.get('nome') as string || file.name
      const descricao = formData.get('descricao') as string | null
      
      const newMaterial = await prisma.casas_materiais_publicidade.create({
        data: {
          casa_id: id,
          nome,
          descricao,
          file_path: dbPath,
          file_size: file.size,
          file_type: file.type
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        path: dbPath, 
        material: {
          ...newMaterial,
          file_size: newMaterial.file_size?.toString() || null
        } 
      })
    }

  } catch (error: any) {
    console.error('Upload Error API:', error)
    return new NextResponse(error?.message || 'Internal Server Error', { status: 500 })
  }
}
