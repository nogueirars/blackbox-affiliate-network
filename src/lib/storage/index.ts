import { createClient } from '@supabase/supabase-js'

export interface StorageProvider {
  upload(file: File, path: string): Promise<string>
  delete(path: string): Promise<void>
  getUrl(path: string): Promise<string>
}

// Cria um cliente de administração que ignora as políticas de RLS.
// Como isso roda APENAS do lado do servidor nas rotas de API, é seguro.
function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('As variáveis de ambiente do Supabase não estão configuradas corretamente.')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export class SupabaseStorageProvider implements StorageProvider {
  private bucket = 'archives'

  async upload(file: File, path: string): Promise<string> {
    const supabase = getAdminClient()
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file, { upsert: true })

    if (error) {
      console.error('S3 Upload Error:', error)
      throw new Error(`Falha ao fazer upload: ${error.message}`)
    }

    return data.path
  }

  async delete(path: string): Promise<void> {
    const supabase = getAdminClient()
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([path])

    if (error) {
      console.error('S3 Delete Error:', error)
      throw new Error(`Falha ao remover arquivo: ${error.message}`)
    }
  }

  async getUrl(path: string): Promise<string> {
    const supabase = getAdminClient()
    // Usa signedUrl por padrão para proteção. Expira em 1 hora.
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, 60 * 60)

    if (error || !data) {
      console.error('S3 Signed URL Error:', error)
      throw new Error(`Falha ao gerar URL de acesso: ${error?.message}`)
    }

    return data.signedUrl
  }
}

// Exporta uma instância única pronta para uso.
// Caso no futuro troquemos o provedor S3, basta alterar essa instância.
export const storage = new SupabaseStorageProvider()
