import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTransparenciaData } from '@/services/transparencia.service'
import { PortalTransparencia } from '@/components/transparencia/PortalTransparencia'
import { prisma } from '@/lib/prisma'

export default async function GerenteTransparenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true }
  })
  if (!publicUser) redirect('/login')

  const data = await getTransparenciaData(publicUser.id, 'gerente')

  return (
    <PortalTransparencia profile="gerente" data={data} />
  )
}
