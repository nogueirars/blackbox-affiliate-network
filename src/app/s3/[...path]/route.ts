import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  
  // Reconstrói o caminho. Ex: ['casas', '123', 'icon.png'] -> 'casas/123/icon.png'
  const s3Path = path.join('/')

  try {
    // Busca a URL assinada temporária pelo StorageProvider
    const signedUrl = await storage.getUrl(s3Path)
    
    // Redireciona o navegador para a URL oficial do Supabase/S3 (rápido e aproveita o cache)
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error(`S3 Proxy Error for /${s3Path}:`, error)
    return new NextResponse('File Not Found', { status: 404 })
  }
}
