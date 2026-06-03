'use client'

import React, { useState } from 'react'
import { StatCard } from '@/components/ui/StatCard'

export default function PagamentosClient() {
  const [activeTab, setActiveTab] = useState('recebidos')

  // Mock data for UI scaffolding based on the image
  const totaisRede = {
    total: 251180.19,
    influenciadores: 191225.33,
    gerente: 59954.85
  }

  const totaisHistorico = {
    totalPaga: 57947.97,
    estornosPaga: 18341.00,
    subsReceberam: 171390.63,
    estornosSubs: 156158.00,
    saldoRecebido: -113442.66,
    pendente: 174891.22
  }

  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="flex flex-col gap-8">
      
      {/* Bloco 1: Comissões da Rede */}
      <div className="flex flex-col gap-4">
        <h2 className="text-headline-sm text-[var(--color-on-surface)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)]">groups</span>
          Comissões da Rede
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Comissão Total da Rede"       value={fmt(totaisRede.total)}          icon="groups"            accent="#0275F3" sub="Produção de toda a rede" />
          <StatCard label="Comissão dos Influenciadores" value={fmt(totaisRede.influenciadores)} icon="arrow_upward"      accent="#F59E0B" sub="Parte dos influenciadores(as)" />
          <StatCard label="Sua Comissão (Gerente)"       value={fmt(totaisRede.gerente)}         icon="workspace_premium" accent="#22D3A5" sub="Total da Rede − Parte dos Influenciadores(as)" />
        </div>
      </div>

      {/* Bloco 2: Histórico de Pagamentos */}
      <div className="flex flex-col gap-4">
        <h2 className="text-headline-sm text-[var(--color-on-surface)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)]">payments</span>
          Histórico de Pagamentos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Comissão Paga" value={fmt(totaisHistorico.totalPaga)}    icon="arrow_downward"         accent="#0275F3" sub={`Da BLACKBOX (estornos: ${fmt(-totaisHistorico.estornosPaga)})`} />
          <StatCard label="Subs Receberam"      value={fmt(totaisHistorico.subsReceberam)} icon="arrow_upward"           accent="#F59E0B" sub={`Pagos aos Influenciadores (estornos: ${fmt(-totaisHistorico.estornosSubs)})`} />
          <StatCard label="Saldo Recebido"      value={fmt(totaisHistorico.saldoRecebido)} icon="account_balance_wallet" accent="#22D3A5" sub="Recebido − Repassado" />
          <StatCard label="Pendente BLACKBOX"   value={fmt(totaisHistorico.pendente)}      icon="schedule"               accent="#F59E0B" sub="Ainda não pago" />
        </div>
      </div>

      {/* Tabs e Tabelas */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex gap-2 p-1 bg-[var(--color-surface-container-high)] rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab('recebidos')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'recebidos' ? 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] shadow-sm' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span> Recebidos (13)
          </button>
          <button 
            onClick={() => setActiveTab('repassados')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'repassados' ? 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] shadow-sm' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span> Repassados (159)
          </button>
        </div>

        <div className="glass-card rounded-xl border border-[var(--color-outline-variant)] overflow-hidden flex-1 mt-2">
          <div className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)] px-6 py-4 flex items-center justify-between">
            <h3 className="text-headline-sm text-[var(--color-on-surface)] font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-success)]">payments</span>
              Pagamentos {activeTab === 'recebidos' ? 'Recebidos da BLACKBOX' : 'Repassados aos Influenciadores'}
            </h3>
            {activeTab === 'repassados' && (
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] text-[18px]">search</span>
                <input 
                  type="text"
                  placeholder="Buscar influenciador..."
                  className="w-full sm:w-auto bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            )}
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] custom-scrollbar">
            <table className="orbit-table w-full relative">
              <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)] sticky top-0 z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Data</th>
                  {activeTab === 'repassados' && (
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Influenciador(a)</th>
                  )}
                  <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Status</th>
                  <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Valor</th>
                  <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] min-w-[300px]">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-outline-variant)]">
                {activeTab === 'recebidos' ? (
                  <>
                    <tr className="hover:bg-[var(--color-surface-container-high)] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-on-surface)] whitespace-nowrap">14/04/2026</td>
                      <td className="px-6 py-4">
                        <span className="badge badge-green">Pago</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--color-success)] whitespace-nowrap">R$ 1.859,00</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">50% final da antecipação da Betano realizada no dia 31/03/2026</td>
                    </tr>
                    <tr className="hover:bg-[var(--color-surface-container-high)] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-on-surface)] whitespace-nowrap">14/04/2026</td>
                      <td className="px-6 py-4">
                        <span className="badge badge-green">Pago</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--color-success)] whitespace-nowrap">R$ 1.427,20</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">Saque na BLACKBOX Digital no dia 14/04.</td>
                    </tr>
                    <tr className="hover:bg-[var(--color-surface-container-high)] transition-colors group bg-[var(--color-error)]/5">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-on-surface)] whitespace-nowrap">12/04/2026</td>
                      <td className="px-6 py-4">
                        <span className="badge badge-red">Estornado</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--color-error)] whitespace-nowrap">-R$ 800,00</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">4 CPA(s) invalidado(s) pela SuperBet</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="hover:bg-[var(--color-surface-container-high)] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-on-surface)] whitespace-nowrap">15/04/2026</td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-[var(--color-on-surface)]">João Silva</span>
                        <div className="text-xs text-[var(--color-on-surface-variant)]">joao@email.com</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge badge-green">Pago</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--color-success)] whitespace-nowrap">R$ 500,00</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">Repasse semanal</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
