import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CsvUploadClient from './CsvUploadClient'

export default async function EditarProducaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const casas = await prisma.casas_aposta.findMany({
    where: { ativo: true },
    select: { id: true, nome_exibicao: true },
    orderBy: { nome_exibicao: 'asc' },
  })

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Editar Produção</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
            Importe dados de produção via CSV
          </p>
        </div>
        <Link
          href="/admin/producao"
          className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-surface-container-high)',
            color: 'var(--color-on-surface-variant)',
            border: '1px solid var(--color-outline-variant)',
          }}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar
        </Link>
      </div>

      {/* Upload card */}
      <div className="glass-card rounded-xl p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-primary)', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-on-surface)]">Upload de CSV</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Selecione a casa e o arquivo CSV com os dados de produção
            </p>
          </div>
        </div>

        <CsvUploadClient casas={casas} />
      </div>

      {/* Format reference */}
      <div className="glass-card rounded-xl p-6 max-w-2xl">
        <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-3">Formato esperado do CSV</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                {['Coluna', 'Obrigatório', 'Formato', 'Exemplo'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[var(--color-on-surface-variant)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[var(--color-on-surface)]">
              {[
                ['data', 'Sim', 'dd/mm/aaaa ou aaaa-mm-dd', '23/05/2026'],
                ['affcustomid', 'Sim', 'Código AFP do contrato', 'NICK001'],
                ['cadastros', 'Não', 'Número inteiro', '10'],
                ['ftds', 'Não', 'Número inteiro', '3'],
                ['cpas', 'Não', 'Número inteiro', '2'],
                ['valor_depositado', 'Não', 'Decimal (ponto ou vírgula)', '1500.00'],
                ['ngr', 'Não', 'Decimal', '320.50'],
                ['receita_cpa', 'Não', 'Decimal', '200.00'],
                ['receita_rev', 'Não', 'Decimal', '120.50'],
              ].map(([col, req, fmt, ex]) => (
                <tr key={col} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                  <td className="px-3 py-2"><code className="font-mono">{col}</code></td>
                  <td className="px-3 py-2" style={{ color: req === 'Sim' ? '#ef4444' : 'var(--color-on-surface-variant)' }}>{req}</td>
                  <td className="px-3 py-2 text-[var(--color-on-surface-variant)]">{fmt}</td>
                  <td className="px-3 py-2 text-[var(--color-on-surface-variant)]">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
