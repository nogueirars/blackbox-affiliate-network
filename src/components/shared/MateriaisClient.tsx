'use client'

import { useState } from 'react'

interface Material {
  id: string
  nome: string
  descricao: string | null
  file_path: string | null
  file_size: number | null
  file_type: string | null
}

interface Casa {
  id: string
  nome_exibicao: string
  icone_url: string | null
  materiais: Material[]
}

interface Props {
  casas: Casa[]
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function isImage(m: Material) {
  return (
    m.file_type?.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|svg)$/i.test(m.file_path ?? '')
  )
}

export default function MateriaisClient({ casas }: Props) {
  const casasComMateriais = casas.filter(c => c.materiais.length > 0)
  const [activeCasa, setActiveCasa] = useState(casasComMateriais[0]?.id ?? '')

  const current = casasComMateriais.find(c => c.id === activeCasa)

  if (casasComMateriais.length === 0) {
    return (
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">folder_open</span>
        <p className="text-sm font-medium opacity-60">Nenhum material disponível</p>
        <p className="text-xs opacity-40">Materiais de divulgação serão disponibilizados em breve.</p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header Premium */}
      <div className="relative px-6 py-6 border-b border-[var(--color-outline-variant)] bg-gradient-to-r from-[var(--color-surface-container-low)] to-[var(--color-surface)] overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--color-primary)] opacity-10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[var(--color-primary)] to-[#6366f1] relative group">
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <span className="material-symbols-outlined text-white text-[24px]">campaign</span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--color-on-surface)] tracking-tight">Materiais de Publicidade</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">Acesse, baixe e utilize os ativos oficiais das casas de apostas</p>
          </div>
        </div>
      </div>

      {/* Casa tabs */}
      <div
        className="flex items-center gap-1 px-4 py-3 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}
      >
        {casasComMateriais.map(c => {
          const active = c.id === activeCasa
          return (
              <button
                key={c.id}
                onClick={() => setActiveCasa(c.id)}
                className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${active ? 'shadow-md scale-105' : 'hover:bg-[var(--color-surface-container)]'}`}
                style={{
                  background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: active ? '#fff' : 'var(--color-on-surface-variant)',
                  border: active ? '1px solid transparent' : '1px solid var(--color-outline-variant)',
                }}
              >
                {c.icone_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icone_url.startsWith('http') ? c.icone_url : `/s3${c.icone_url}`} alt="" className="w-5 h-5 rounded object-contain bg-white/10" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                )}
                <span>{c.nome_exibicao}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
                  style={{
                    background: active ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-container-high)',
                    color: active ? '#fff' : 'var(--color-on-surface-variant)',
                  }}
                >
                  {c.materiais.length}
                </span>
              </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="p-5">
        {current && current.materiais.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {current.materiais.map(m => {
              const img = isImage(m) && m.file_path && m.file_path !== '/placeholder/path.png'
              return (
                <div
                  key={m.id}
                  className="group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-default"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)' }}
                >
                  {/* Image Preview Container */}
                  <div className="w-full relative overflow-hidden" style={{ height: '200px', background: 'var(--color-surface-container-low)' }}>
                    {img ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.file_path!.startsWith('http') ? m.file_path! : `/s3${m.file_path!}`}
                          alt={m.nome}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {/* Gradient overlay on hover for better button visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-on-surface-variant)] opacity-40 group-hover:opacity-60 transition-opacity duration-300">
                        <span className="material-symbols-outlined text-[64px]">
                          {isImage(m) ? 'image' : 'insert_drive_file'}
                        </span>
                      </div>
                    )}
                    
                    {/* Floating Download Button (Visible on Hover for Images) */}
                    {img && (
                      <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <a
                          href={m.file_path!.startsWith('http') ? m.file_path! : `/s3${m.file_path!}`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                          title="Baixar material"
                        >
                          <span className="material-symbols-outlined text-[20px]">download</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="px-5 py-4 flex flex-col gap-1 z-10 bg-[var(--color-surface)] border-t border-[var(--color-outline-variant)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-bold text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors">{m.nome}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {m.file_size && (
                            <span className="text-[11px] font-semibold tracking-wide text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md">
                              {fmtSize(m.file_size)}
                            </span>
                          )}
                          {m.descricao && (
                            <span className="text-xs text-[var(--color-on-surface-variant)] truncate" title={m.descricao}>
                              {m.descricao}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Fallback button for non-image files or easy access */}
                      {!img && (
                        <a
                          href={m.file_path && m.file_path !== '/placeholder/path.png' ? (m.file_path.startsWith('http') ? m.file_path : `/s3${m.file_path}`) : '#'}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-[var(--color-primary)] hover:text-white group-hover:border-[var(--color-primary)]"
                          style={{
                            background: 'var(--color-surface-container)',
                            border: '1px solid var(--color-outline-variant)',
                            color: 'var(--color-on-surface)',
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center gap-2 text-[var(--color-on-surface-variant)] opacity-50">
            <span className="material-symbols-outlined text-[40px]">imagesmode</span>
            <p className="text-sm">Nenhum material para esta casa.</p>
          </div>
        )}
      </div>
    </div>
  )
}
