'use client'

import { useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Influenciador {
  id: string
  nome_completo: string
}

interface ProducaoFiltersProps {
  influenciadores: Influenciador[]
  casas: [string, string][]
  periodo: string
  filterInfluenciador?: string
  filterCasa?: string
  agrupamento?: string
  dataInicio?: string
  dataFim?: string
}

export function ProducaoFilters({
  influenciadores,
  casas,
  periodo,
  filterInfluenciador,
  filterCasa,
  agrupamento = 'diaria',
  dataInicio,
  dataFim,
}: ProducaoFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateQuery(key: string, val: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set(key, val)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function handleAgrupamentoChange(val: string) {
    updateQuery('agrupamento', val)
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateQuery(e.target.name, e.target.value)
  }

  function handleRadioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(e.target.name, e.target.value)
    params.delete('dataInicio')
    params.delete('dataFim')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set(e.target.name, e.target.value)
    } else {
      params.delete(e.target.name)
    }
    params.delete('periodo')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <form ref={formRef} onSubmit={e => e.preventDefault()} className="glass-card flex flex-col gap-4 rounded-2xl p-5 border border-[var(--color-outline-variant)]">
      
      {/* Top Row: Period Selection */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2 text-[var(--color-primary)]">
          <span className="material-symbols-outlined text-[20px]">filter_alt</span>
          <span className="font-bold text-xs tracking-[0.1em] uppercase">PERÍODO</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Radio Buttons styled as chips */}
          <div className="flex items-center bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg p-1">
            <label className="cursor-pointer">
              <input type="radio" name="periodo" value="7" className="hidden peer" checked={periodo === '7'} onChange={handleRadioChange} />
              <span className="px-3 py-1 rounded-md text-xs font-medium transition-colors peer-checked:bg-[var(--color-primary)] peer-checked:text-[var(--color-on-primary)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
                7 dias
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="periodo" value="30" className="hidden peer" checked={periodo === '30'} onChange={handleRadioChange} />
              <span className="px-3 py-1 rounded-md text-xs font-medium transition-colors peer-checked:bg-[var(--color-primary)] peer-checked:text-[var(--color-on-primary)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
                30 dias
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="periodo" value="90" className="hidden peer" checked={periodo === '90'} onChange={handleRadioChange} />
              <span className="px-3 py-1 rounded-md text-xs font-medium transition-colors peer-checked:bg-[var(--color-primary)] peer-checked:text-[var(--color-on-primary)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
                90 dias
              </span>
            </label>
          </div>
        </div>

        <div className="w-[1px] h-5 bg-[var(--color-outline-variant)] mx-1 hidden sm:block" />

        {/* Date pickers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg px-2 py-1 focus-within:border-[var(--color-primary)] transition-colors">
            <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">calendar_today</span>
            <input 
              type="date" 
              name="dataInicio" 
              value={dataInicio ?? ''} 
              onChange={handleDateChange}
              className="bg-transparent border-none text-xs font-medium text-[var(--color-on-surface)] outline-none cursor-pointer" 
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <span className="text-xs text-[var(--color-on-surface-variant)]">até</span>
          <div className="flex items-center gap-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg px-2 py-1 focus-within:border-[var(--color-primary)] transition-colors">
            <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">calendar_today</span>
            <input 
              type="date" 
              name="dataFim" 
              value={dataFim ?? ''} 
              onChange={handleDateChange}
              className="bg-transparent border-none text-xs font-medium text-[var(--color-on-surface)] outline-none cursor-pointer" 
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Toggles and Dropdowns */}
      <div className="flex items-center gap-3 flex-wrap">
        
        {/* Toggle Acumulado / Diario */}
        <div className="flex items-center bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg p-1 h-9">
          <input type="hidden" name="agrupamento" value={agrupamento} />
          <button 
            type="button"
            onClick={() => handleAgrupamentoChange('diaria')}
            className={`flex items-center gap-2 px-3 h-full rounded-md text-xs font-medium transition-colors ${agrupamento === 'diaria' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
          >
            <span className="material-symbols-outlined text-[16px]">calendar_view_day</span>
            Diária
          </button>
          <button 
            type="button"
            onClick={() => handleAgrupamentoChange('acumulada')}
            className={`flex items-center gap-2 px-3 h-full rounded-md text-xs font-medium transition-colors ${agrupamento === 'acumulada' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            Acumulada
          </button>
        </div>

        {/* Casa Dropdown */}
        <div className="relative">
          <select
            name="casa"
            value={filterCasa ?? ''}
            onChange={handleSelectChange}
            className="appearance-none bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-0 h-9 text-xs font-medium text-[var(--color-on-surface)] outline-none cursor-pointer pr-9 min-w-[150px] focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="">Todas as Casas</option>
            {casas.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)] pointer-events-none">
            expand_more
          </span>
        </div>

        {/* Influenciador Dropdown */}
        <div className="relative">
          <select
            name="influenciador"
            value={filterInfluenciador ?? ''}
            onChange={handleSelectChange}
            className="appearance-none bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-0 h-9 text-xs font-medium text-[var(--color-on-surface)] outline-none cursor-pointer pr-9 min-w-[180px] focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="">Todos os Influenciadores</option>
            {influenciadores.map(g => (
              <option key={g.id} value={g.id}>{g.nome_completo}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)] pointer-events-none">
            expand_more
          </span>
        </div>

        {/* Limpar filtros */}
        {(filterInfluenciador || filterCasa) && (
          <button 
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('casa');
              params.delete('influenciador');
              params.delete('dataInicio');
              params.delete('dataFim');
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className="text-xs text-[var(--color-error)] hover:text-[var(--color-error-container)] transition-colors font-medium ml-2"
          >
            Limpar
          </button>
        )}
      </div>
      
    </form>
  )
}
