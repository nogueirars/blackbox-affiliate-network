import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type ActivityAction =
  // Afiliados
  | 'APROVACAO_CADASTRO'
  | 'REPROVACAO_CADASTRO'
  | 'BLOQUEIO_USUARIO'
  | 'BLOQUEIO_TEMPORARIO'
  | 'DESBLOQUEIO_USUARIO'
  | 'RESET_SENHA'
  | 'ALTERACAO_ROLES'
  // Saques
  | 'SAQUE_LIBERADO'
  | 'SAQUE_APROVADO'
  | 'SAQUE_FALHA'
  | 'SAQUE_MANUAL'
  | 'SAQUE_CORRECAO_NF'
  | 'SAQUE_REPROCESSADO'
  // Contratos
  | 'CONTRATO_CRIADO'
  | 'CONTRATO_ATUALIZADO'
  | 'CONTRATO_REAJUSTE'
  // Casas
  | 'CASA_CRIADA'
  | 'CASA_ATUALIZADA'
  // Genérico
  | (string & {})

export type EntityType =
  | 'usuario'
  | 'saque'
  | 'contrato'
  | 'casa'
  | 'entidade'

export interface LogActivityParams {
  actorId: string
  actorName?: string | null
  actorEmail?: string | null
  action: ActivityAction
  entityType: EntityType
  entityId: string
  details?: Record<string, unknown>
}

/**
 * Registra uma ação de auditoria. Nunca lança exceção — falha silenciosamente
 * para não bloquear a operação principal.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activity_log.create({
      data: {
        actor_id:    params.actorId,
        actor_name:  params.actorName  ?? null,
        actor_email: params.actorEmail ?? null,
        action:      params.action,
        entity_type: params.entityType,
        entity_id:   params.entityId,
        details:     (params.details ?? {}) as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    console.error('[logActivity] failed to write log:', err)
  }
}
