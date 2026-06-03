'use client'

import React from 'react'
import { DataTable, Column } from '@/components/ui/DataTable'

export interface AdminProducaoRow {
  id_contrato: string
  data: Date | string
  id_casa: string
  cadastros: string
  ftds: string
  valor_depositos: string
  redepositos: string
  valor_redepositos: string
  cpas: string
  ngr: string
  // Influencer
  receita_total_calculada?: string
  // Gerente
  repasse_pago_total?: string
  // Intermediario
  custo_repassado_total?: string
  // Gerente & Intermediario
  lucro_liquido_total?: string
  // Geral
  receita_bruta?: string
  // Joined info
  casa_nome: string
  usuario_nome?: string
}

export interface AdminProducaoTotals {
  cadastros: number
  ftds: number
  valor_depositos: number
  redepositos: number
  valor_redepositos: number
  cpas: number
  ngr: number
  receita_total_calculada?: number
  repasse_pago_total?: number
  custo_repassado_total?: number
  lucro_liquido_total?: number
  receita_bruta?: number
}

interface Props {
  visao: string
  rows: AdminProducaoRow[]
  totals: AdminProducaoTotals
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

export function AdminProducaoTable({ visao, rows, totals }: Props) {
  // Base columns (always present)
  const columns: Column<AdminProducaoRow>[] = [
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
      header: 'Usuário',
      className: 'text-sm text-[var(--color-on-surface-variant)] truncate max-w-[150px]',
      cell: (row) => row.usuario_nome ?? '—'
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
      cell: (row) => <span style={{ color: n(row.ftds) > 0 ? '#22D3A5' : undefined }}>{fmtNum(n(row.ftds))}</span>
    },
    {
      header: 'Val. Dep.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right text-[var(--color-on-surface-variant)]',
      cell: (row) => fmt(n(row.valor_depositos))
    },
    {
      header: 'CPAs',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right text-[var(--color-on-surface)] font-medium',
      cell: (row) => <span style={{ color: n(row.cpas) > 0 ? '#22D3A5' : undefined }}>{fmtNum(n(row.cpas))}</span>
    },
    {
      header: 'NGR',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-medium',
      cell: (row) => <span style={{ color: '#8b5cf6' }}>{fmt(n(row.ngr))}</span>
    },
  ]

  // Conditional columns based on visao
  if (visao === 'geral') {
    columns.push({
      header: 'Receita Bruta',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-bold',
      cell: (row) => <span style={{ color: '#c084fc' }}>{fmt(n(row.receita_bruta))}</span>
    })
  }

  if (visao === 'influenciador') {
    columns.push({
      header: 'Rec. Calc.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-bold',
      cell: (row) => <span style={{ color: '#22D3A5' }}>{fmt(n(row.receita_total_calculada))}</span>
    })
  }

  if (visao === 'gerente') {
    columns.push({
      header: 'Repasse Pago',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-medium',
      cell: (row) => <span style={{ color: '#F43F5E' }}>{fmt(n(row.repasse_pago_total))}</span>
    })
    columns.push({
      header: 'Lucro Líq.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-bold',
      cell: (row) => <span style={{ color: '#22D3A5' }}>{fmt(n(row.lucro_liquido_total))}</span>
    })
  }

  if (visao === 'intermediario') {
    columns.push({
      header: 'Custo Rep.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-medium',
      cell: (row) => <span style={{ color: '#F43F5E' }}>{fmt(n(row.custo_repassado_total))}</span>
    })
    columns.push({
      header: 'Lucro Líq.',
      headerClassName: 'text-right',
      className: 'text-sm tabular-nums text-right font-bold',
      cell: (row) => <span style={{ color: '#22D3A5' }}>{fmt(n(row.lucro_liquido_total))}</span>
    })
  }

  const footer = (
    <tr>
      <td colSpan={3} className="px-5 py-4 text-label-md font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">TOTAL</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right text-[var(--color-on-surface)]">{fmtNum(totals.cadastros)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#22D3A5' }}>{fmtNum(totals.ftds)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right text-[var(--color-on-surface-variant)]">{fmt(totals.valor_depositos)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#22D3A5' }}>{fmtNum(totals.cpas)}</td>
      <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#8b5cf6' }}>{fmt(totals.ngr)}</td>
      
      {visao === 'geral' && (
        <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#c084fc' }}>{fmt(totals.receita_bruta ?? 0)}</td>
      )}
      {visao === 'influenciador' && (
        <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#22D3A5' }}>{fmt(totals.receita_total_calculada ?? 0)}</td>
      )}
      {visao === 'gerente' && (
        <>
          <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#F43F5E' }}>{fmt(totals.repasse_pago_total ?? 0)}</td>
          <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#22D3A5' }}>{fmt(totals.lucro_liquido_total ?? 0)}</td>
        </>
      )}
      {visao === 'intermediario' && (
        <>
          <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#F43F5E' }}>{fmt(totals.custo_repassado_total ?? 0)}</td>
          <td className="px-5 py-4 text-sm font-bold tabular-nums text-right" style={{ color: '#22D3A5' }}>{fmt(totals.lucro_liquido_total ?? 0)}</td>
        </>
      )}
    </tr>
  )

  const emptyMessage = 'Nenhuma produção encontrada para este período'

  return (
    <DataTable
      title={`Produção — Visão ${visao.charAt(0).toUpperCase() + visao.slice(1)}`}
      columns={columns}
      data={rows}
      emptyMessage={emptyMessage}
      footer={footer}
      minWidth="900px"
    />
  )
}
