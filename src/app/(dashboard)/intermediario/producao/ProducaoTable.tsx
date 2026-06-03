'use client'

import React from 'react'
import { DataTable, Column } from '@/components/ui/DataTable'

export interface ProducaoRow {
  id_contrato: string
  data: Date | string
  id_casa: string
  cadastros: string
  ftds: string
  cpas: string
  ngr: string
  custo_repassado_cpa: string
  custo_repassado_revshare: string
  custo_repassado_total: string
  lucro_liquido_cpa: string
  lucro_liquido_revshare: string
  lucro_liquido_total: string
  casa_nome: string
}

export interface ProducaoTotals {
  cadastros: number
  ftds: number
  cpas: number
  ngr: number
  custo_repassado_total: number
  lucro_cpa: number
  lucro_rev: number
  lucro_total: number
}

interface ProducaoTableProps {
  rows: ProducaoRow[]
  totals: ProducaoTotals
  myId: string | null
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}

function n(v: unknown) {
  return Number(v ?? 0)
}

export function ProducaoTable({ rows, totals, myId }: ProducaoTableProps) {
  const columns: Column<ProducaoRow>[] = [
    {
      header: 'Data',
      className: 'text-xs whitespace-nowrap',
      cell: (row) => new Date(row.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
    },
    {
      header: 'Casa',
      className: 'text-sm text-[var(--color-on-surface)]',
      cell: (row) => row.casa_nome ?? '—'
    },
    {
      header: 'Regs',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right text-[var(--color-on-surface)]',
      cell: (row) => <span className="bg-[var(--color-surface-container-highest)] px-2 py-0.5 rounded-md">{fmtNum(n(row.cadastros))}</span>
    },
    {
      header: 'FTDs',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right text-[var(--color-on-surface)] font-medium',
      cell: (row) => fmtNum(n(row.ftds))
    },
    {
      header: 'CPAs',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right text-[var(--color-on-surface)] font-medium',
      cell: (row) => fmtNum(n(row.cpas))
    },
    {
      header: 'NGR',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-medium',
      cell: (row) => <span style={{ color: '#8b5cf6' }}>{fmt(n(row.ngr))}</span>
    },
    {
      header: 'Custo Rep.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-medium',
      cell: (row) => <span style={{ color: '#F43F5E' }}>{fmt(n(row.custo_repassado_total))}</span>
    },
    {
      header: 'Lucro Líq.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-bold',
      cell: (row) => <span style={{ color: '#22D3A5' }}>{fmt(n(row.lucro_liquido_total))}</span>
    }
  ]

  const footer = (
    <tr>
      <td colSpan={2} className="px-5 py-4 text-label-md font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">TOTAL</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right text-[var(--color-on-surface)]">{fmtNum(totals.cadastros)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right text-[var(--color-on-surface)]">{fmtNum(totals.ftds)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right text-[var(--color-on-surface)]">{fmtNum(totals.cpas)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#8b5cf6' }}>{fmt(totals.ngr)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#F43F5E' }}>{fmt(totals.custo_repassado_total)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#22D3A5' }}>{fmt(totals.lucro_total)}</td>
    </tr>
  )

  const emptyMessage = !myId ? 'Perfil não configurado' : 'Sem dados no período selecionado'

  return (
    <DataTable
      title="Detalhamento"
      columns={columns}
      data={rows}
      emptyMessage={emptyMessage}
      footer={footer}
      minWidth="800px"
    />
  )
}
