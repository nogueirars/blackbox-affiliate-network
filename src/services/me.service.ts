import { RoleKey } from '@/types'
import { getProfileById } from './profiles.service'
import { getSaldoInfluenciador, getSaldoGerente, getSaldoIntermediario } from './saldo.service'

export async function getMe(userId: string, role: RoleKey) {
  const [profile, saldo] = await Promise.all([
    getProfileById(userId),
    role === 'influenciador'
      ? getSaldoInfluenciador(userId)
      : role === 'gerente'
        ? getSaldoGerente(userId)
        : role === 'intermediario'
          ? getSaldoIntermediario(userId)
          : null,
  ])

  return { profile, saldo }
}
