'use client'

import Link from 'next/link'
import Drawer from '@/components/ui/Drawer'
import ActivityLogSection from '@/components/ui/ActivityLogSection'

interface Contrato {
  id: string
  id_user_role: string
  id_casa: string
  afp: string
  tipo_contrato: string
  ativo: boolean
  created_at: string
}

interface Props {
  contrato: Contrato | null
  open: boolean
  onClose: () => void
  userMap: Record<string, string>       // id_user_role → nome
  casaMap: Record<string, string>       // id_casa → nome
  roleToUserMap: Record<string, string> // id_user_role → user_id
}

function tipoBadgeStyle(tipo: string) {
  switch (tipo) {
    case 'CPA':      return { background: 'rgba(34,211,165,0.12)', color: '#22D3A5' }
    case 'REVSHARE': return { background: 'rgba(2,117,243,0.12)',  color: '#0275F3' }
    case 'MISTO':    return { background: 'rgba(192,132,252,0.12)', color: '#c084fc' }
    default:         return { background: 'rgba(120,120,120,0.12)', color: '#888' }
  }
}

export default function ContratoDetailDrawer({ contrato, open, onClose, userMap, casaMap, roleToUserMap }: Props) {
  if (!contrato) return null

  const afiliadoNome = userMap[contrato.id_user_role] ?? '—'
  const casaNome     = casaMap[contrato.id_casa]      ?? '—'
  const userId       = roleToUserMap[contrato.id_user_role]
  const cadastroData = new Date(contrato.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const titleNode = (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
      >
        <span className="material-symbols-outlined text-[18px]">description</span>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[var(--color-on-surface)] leading-none">Detalhes do Contrato</h2>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 font-mono opacity-70">
          {contrato.afp ?? contrato.id.slice(0, 12) + '…'}
        </p>
      </div>
    </div>
  )

  return (
    <Drawer open={open} onClose={onClose} title={titleNode} size="sm">
      <div className="flex flex-col animate-fade-in">

        {/* Hero */}
        <div
          className="px-6 py-5 flex flex-col gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(2,117,243,0.06) 0%, rgba(99,102,241,0.04) 100%)',
            borderBottom: '1px solid var(--color-outline-variant)',
          }}
        >
          {/* AFP + Status */}
          <div className="flex items-center justify-between gap-3">
            <span
              className="font-mono text-lg font-bold tracking-wider"
              style={{ color: 'var(--color-on-surface)' }}
            >
              {contrato.afp ?? '—'}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={tipoBadgeStyle(contrato.tipo_contrato)}
              >
                {contrato.tipo_contrato}
              </span>
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1"
                style={{
                  background: contrato.ativo ? 'rgba(34,211,165,0.12)' : 'rgba(239,68,68,0.12)',
                  color:      contrato.ativo ? '#22D3A5'                : '#EF4444',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: contrato.ativo ? '#22D3A5' : '#EF4444' }}
                />
                {contrato.ativo ? 'Ativo' : 'Encerrado'}
              </span>
            </div>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap gap-2">
            <div
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs"
              style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--color-outline)' }}>home</span>
              <span style={{ color: 'var(--color-on-surface-variant)' }}>Casa:</span>
              <span className="font-semibold" style={{ color: 'var(--color-on-surface)' }}>{casaNome}</span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs"
              style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--color-outline)' }}>calendar_today</span>
              <span style={{ color: 'var(--color-on-surface-variant)' }}>Criado:</span>
              <span className="font-semibold" style={{ color: 'var(--color-on-surface)' }}>{cadastroData}</span>
            </div>
          </div>
        </div>

        {/* Afiliado */}
        <div className="px-6 py-5">
          <p className="text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest mb-3">Afiliado</p>
          <div
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(2,117,243,0.15)', color: 'var(--color-primary)' }}
              >
                {afiliadoNome[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium truncate" style={{ color: 'var(--color-on-surface)' }}>
                {afiliadoNome}
              </span>
            </div>
            {userId && (
              <Link
                href={`/admin/afiliados/${userId}`}
                onClick={onClose}
                className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-75"
                style={{ color: 'var(--color-primary)' }}
              >
                Ver perfil
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </Link>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--color-outline-variant)', margin: '0 24px' }} />

        {/* Histórico de ações */}
        <ActivityLogSection entityType="contrato" entityId={contrato.id} />

      </div>
    </Drawer>
  )
}
