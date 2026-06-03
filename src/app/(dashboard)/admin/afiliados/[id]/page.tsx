import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContratosSection from './ContratosSection'
import ProfileCardActions from './ProfileCardActions'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const roleLabel: Record<string, string> = {
  INFLUENCER: 'Influenciador', GERENTE: 'Gerente',
  INTERMEDIARIO: 'Intermediário', ADMIN: 'Admin',
}
const roleBadge: Record<string, string> = {
  INFLUENCER: 'badge-gray', GERENTE: 'badge-blue',
  INTERMEDIARIO: 'badge-orange', ADMIN: 'badge-red',
}
const statusMap: Record<string, { label: string; bc: string; dc: string }> = {
  AGUARDANDO_NF: { label: 'Aguardando NF', bc: 'badge-yellow', dc: 'status-dot-yellow' },
  PROCESSANDO:   { label: 'Processando',   bc: 'badge-blue',   dc: 'status-dot-green'  },
  CONCLUIDO:     { label: 'Concluído',     bc: 'badge-green',  dc: 'status-dot-green'  },
  FALHA:         { label: 'Falha',         bc: 'badge-red',    dc: 'status-dot-red'    },
  MANUAL:        { label: 'Manual',        bc: 'badge-orange', dc: 'status-dot-yellow' },
}

const approvalBadge: Record<string, { label: string; color: string; bg: string; border: string }> = {
  APROVADO:                  { label: 'Aprovado',    color: '#22D3A5', bg: 'rgba(34,211,165,0.12)',  border: 'rgba(34,211,165,0.3)'  },
  PENDENTE:                  { label: 'Pendente',    color: '#facc15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.3)'  },
  REPROVADO:                 { label: 'Reprovado',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
  BLOQUEADO:                 { label: 'Bloqueado',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
  BLOQUEADO_TEMPORARIAMENTE: { label: 'Bloq. temp.', color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)'  },
}

function InfoChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
      style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)' }}
    >
      <span className="material-symbols-outlined text-[14px] opacity-50">{icon}</span>
      <span className="text-[var(--color-on-surface-variant)] text-xs opacity-70">{label}:</span>
      <span className="text-[var(--color-on-surface)] font-medium text-xs">{value}</span>
    </div>
  )
}

export default async function AfiliadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const db = createAdminClient()

  // Profile + role via Prisma (role removed from public_users, now in user_roles)
  const [profileRaw, contratosRaw, saquesRes, casasRes] = await Promise.all([
    prisma.public_users.findUnique({
      where: { id },
      select: {
        id: true,
        auth_id: true,
        nome_completo: true,
        email: true,
        cpf: true,
        telefone: true,
        pix_key_type: true,
        pix_key: true,
        created_at: true,
        status_aprovacao: true,
        user_roles: {
          where:   { ativo: true },
          select:  { id: true, role: true, ref_code: true },
          orderBy: { created_at: 'desc' },
        },
        addresses: {
          select: {
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            estado: true,
            cep: true,
          },
        },
        socials: {
          select: {
            instagram: true,
            tiktok: true,
            facebook: true,
            whatsapp_canal: true,
            telegram_canal: true,
          },
        },
      },
    }),
    // contratos FK → user_roles → public_users (no direct id_usuario on contratos)
    prisma.contratos.findMany({
      where:   { user_roles: { id_usuario: id } },
      select:  {
        id: true,
        afp: true,
        tipo_contrato: true,
        ativo: true,
        created_at: true,
        link_afiliacao: true,
        casas_aposta: { select: { id: true, nome_exibicao: true, icone_url: true } },
        historico_contratos: {
          orderBy: { data_inicio: 'desc' },
          select: {
            id: true,
            data_inicio: true,
            data_fim: true,
            cpa_bruto: true,
            aliquota_imposto: true,
            revshare_percentual: true,
            revshare_repasse: true,
            ativo: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    db.from('saques')
      .select('id, montante, status, pix_key, nota_fiscal, created_at, efetivado_at, saque_valido')
      .eq('id_usuario', id)
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('casas_aposta').select('id, nome_exibicao').eq('ativo', true).order('nome_exibicao'),
  ])

  if (!profileRaw) redirect('/admin/afiliados')

  const profile   = profileRaw
  const role      = profile.user_roles[0]?.role ?? ''
  const saques    = saquesRes.data ?? []
  const contratos = contratosRaw
  const casas     = (casasRes.data ?? []) as { id: string; nome_exibicao: string }[]

  const saquesAtivosValor = saques
    .filter((s) => ['AGUARDANDO_NF', 'PROCESSANDO'].includes(s.status))
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const concluidos = saques.filter(s => s.status === 'CONCLUIDO').length

  const statCards = [
    { label: 'Saques em aberto', value: fmt(saquesAtivosValor), icon: 'pending_actions',        color: saquesAtivosValor > 0 ? 'var(--color-tertiary)' : 'var(--color-primary)' },
    { label: 'Total de saques',  value: String(saques.length),  icon: 'receipt_long',           color: 'var(--color-primary)' },
    { label: 'Contratos',        value: String(contratos.length), icon: 'description',          color: 'var(--color-primary)' },
    { label: 'Concluídos',       value: String(concluidos),     icon: 'task_alt',               color: concluidos > 0 ? 'var(--color-success, #22D3A5)' : 'var(--color-primary)' },
  ]

  const initials = (profile.nome_completo ?? profile.email ?? 'A')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label-md text-[var(--color-on-surface-variant)]">
        <Link href="/admin/afiliados" className="hover:text-[var(--color-primary)] transition-colors">
          Afiliados
        </Link>
        <span className="material-symbols-outlined text-[14px] opacity-40">chevron_right</span>
        <span className="text-[var(--color-on-surface)]">{profile.nome_completo ?? profile.email}</span>
      </div>

      {/* Profile card */}
      {(() => {
        const approval = approvalBadge[profile.status_aprovacao ?? 'PENDENTE'] ?? approvalBadge.PENDENTE
        return (
          <div
            className="glass-card rounded-xl overflow-hidden"
            style={{ borderColor: 'var(--color-outline-variant)' }}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--color-primary), transparent)' }} />

            <div className="p-6 flex flex-col gap-5">
              {/* Row 1: Avatar + name + badges + Actions */}
              <div className="flex items-center justify-between gap-4 flex-wrap w-full">
                <div className="flex items-center gap-4 flex-wrap">
                  <div
                    className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg font-bold"
                    style={{
                      background: 'var(--color-primary-container)',
                      color: 'var(--color-on-primary-container)',
                    }}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-headline-lg text-[var(--color-on-surface)] leading-tight">
                        {profile.nome_completo ?? '—'}
                      </h1>
                      <span className={`badge ${roleBadge[role] ?? 'badge-gray'}`}>
                        {roleLabel[role] ?? role}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ color: approval.color, background: approval.bg, border: `1px solid ${approval.border}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: approval.color }} />
                        {approval.label}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5 opacity-70">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <ProfileCardActions
                  afiliadoId={id}
                  initialRoles={profile.user_roles.map((ur) => ur.role)}
                  nomeCompleto={profile.nome_completo}
                />
              </div>

              {/* Row 2: Info chips */}
              <div
                className="flex flex-wrap gap-2 pt-4 border-t"
                style={{ borderColor: 'var(--color-outline-variant)' }}
              >
                {profile.cpf && (
                  <InfoChip icon="badge" label="CPF" value={profile.cpf} />
                )}
                {profile.telefone && (
                  <InfoChip icon="phone" label="Telefone" value={profile.telefone} />
                )}
                {profile.pix_key && (
                  <InfoChip icon="qr_code" label={`PIX (${profile.pix_key_type})`} value={profile.pix_key} />
                )}
                <InfoChip
                  icon="calendar_today"
                  label="Cadastro"
                  value={new Date(profile.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                />
              </div>

              {/* Row 3: Address & Socials */}
              {(profile.addresses || profile.socials) && (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t"
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                >
                  {/* Address */}
                  {profile.addresses ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold text-[var(--color-outline)] uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">home</span>
                        Endereço Residencial
                      </span>
                      <p className="text-xs text-[var(--color-on-surface)] leading-relaxed">
                        {profile.addresses.logradouro}, {profile.addresses.numero}
                        {profile.addresses.complemento ? ` (${profile.addresses.complemento})` : ''} <br />
                        {profile.addresses.bairro} — {profile.addresses.cidade}/{profile.addresses.estado} <br />
                        CEP: {profile.addresses.cep}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold text-[var(--color-outline)] uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">home</span>
                        Endereço Residencial
                      </span>
                      <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60 italic">
                        Não informado
                      </p>
                    </div>
                  )}

                  {/* Socials */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-[var(--color-outline)] uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">share</span>
                      Redes Sociais
                    </span>
                    <div className="flex flex-wrap gap-2 items-center">
                      {profile.socials?.instagram && (
                        <a
                          href={`https://instagram.com/${profile.socials.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border border-[#e1306c]/30 hover:bg-[#e1306c]/10 text-[var(--color-on-surface)]"
                          title="Instagram"
                        >
                          <InstagramIcon />
                          <span className="font-medium">
                            {profile.socials.instagram.startsWith('@')
                              ? profile.socials.instagram
                              : `@${profile.socials.instagram}`}
                          </span>
                        </a>
                      )}
                      {profile.socials?.tiktok && (
                        <a
                          href={`https://tiktok.com/@${profile.socials.tiktok.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]"
                          title="TikTok"
                        >
                          <TikTokIcon />
                          <span className="font-medium">
                            {profile.socials.tiktok.startsWith('@')
                              ? profile.socials.tiktok
                              : `@${profile.socials.tiktok}`}
                          </span>
                        </a>
                      )}
                      {profile.socials?.facebook && (
                        <a
                          href={
                            profile.socials.facebook.startsWith('http')
                              ? profile.socials.facebook
                              : `https://facebook.com/${profile.socials.facebook}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border border-[#1877f2]/30 hover:bg-[#1877f2]/10 text-[var(--color-on-surface)]"
                          title="Facebook"
                        >
                          <FacebookIcon />
                          <span className="font-medium truncate max-w-[120px]">
                            {profile.socials.facebook}
                          </span>
                        </a>
                      )}
                      {profile.socials?.telegram_canal && (
                        <a
                          href={
                            profile.socials.telegram_canal.startsWith('http')
                              ? profile.socials.telegram_canal
                              : `https://t.me/${profile.socials.telegram_canal.replace('@', '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border border-[#0088cc]/30 hover:bg-[#0088cc]/10 text-[var(--color-on-surface)]"
                          title="Telegram Canal"
                        >
                          <TelegramIcon />
                          <span className="font-medium truncate max-w-[120px]">
                            {profile.socials.telegram_canal.startsWith('@')
                              ? profile.socials.telegram_canal
                              : profile.socials.telegram_canal}
                          </span>
                        </a>
                      )}
                      {profile.socials?.whatsapp_canal && (
                        <a
                          href={
                            profile.socials.whatsapp_canal.startsWith('http')
                              ? profile.socials.whatsapp_canal
                              : profile.socials.whatsapp_canal
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border border-[#25d366]/30 hover:bg-[#25d366]/10 text-[var(--color-on-surface)]"
                          title="WhatsApp Canal"
                        >
                          <WhatsAppIcon />
                          <span className="font-medium truncate max-w-[120px]">
                            {profile.socials.whatsapp_canal.startsWith('http') ? 'WhatsApp Canal' : profile.socials.whatsapp_canal}
                          </span>
                        </a>
                      )}
                      {!profile.socials?.instagram &&
                        !profile.socials?.tiktok &&
                        !profile.socials?.facebook &&
                        !profile.socials?.telegram_canal &&
                        !profile.socials?.whatsapp_canal && (
                          <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60 italic">
                            Nenhuma rede social informada
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="glass-card rounded-xl p-5 flex flex-col gap-1 group hover:border-[var(--color-primary)] transition-colors duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-md text-[var(--color-on-surface-variant)] uppercase tracking-wider text-xs">
                {c.label}
              </span>
              <span className="material-symbols-outlined text-[20px]" style={{ color: c.color }}>
                {c.icon}
              </span>
            </div>
            <div className="text-headline-lg text-[var(--color-on-surface)]">{c.value}</div>
            <div
              className="h-px rounded-full mt-2"
              style={{ background: `linear-gradient(90deg, ${c.color}, transparent)`, opacity: 0.4 }}
            />
          </div>
        ))}
      </div>

      {/* Saques */}
      <div className="glass-card rounded-xl flex flex-col overflow-hidden">
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}
        >
          <h2 className="text-headline-md text-[var(--color-on-surface)]">Saques</h2>
          <span
            className="text-label-md px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}
          >
            {saques.length}
          </span>
        </div>

        {saques.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-14"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            <span className="material-symbols-outlined text-[36px] opacity-30">receipt_long</span>
            <p className="text-sm opacity-60">Nenhum saque registrado</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-80">
            <table className="orbit-table w-full">
              <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Valor</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Data</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-outline-variant)' }}>
                {saques.map((s) => {
                  const st = statusMap[s.status] ?? { label: s.status, bc: 'badge-gray', dc: 'status-dot-gray' }
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-[var(--color-surface-container-high)]"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                          {Number(s.montante).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {s.nota_fiscal && (
                          <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60">
                            NF: {s.nota_fiscal}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${st.bc}`}>
                          <span className={`status-dot ${st.dc}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contratos — seção completa de gerenciamento */}
      <ContratosSection
        contratos={contratos.map(c => ({
          ...c,
          casas_aposta: c.casas_aposta,
          historico_contratos: c.historico_contratos.map(h => ({
            ...h,
            data_inicio: h.data_inicio.toISOString(),
            data_fim: h.data_fim ? h.data_fim.toISOString() : null,
            cpa_bruto: h.cpa_bruto != null ? Number(h.cpa_bruto) : null,
            aliquota_imposto: h.aliquota_imposto != null ? Number(h.aliquota_imposto) : null,
            revshare_percentual: h.revshare_percentual != null ? Number(h.revshare_percentual) : null,
            revshare_repasse: h.revshare_repasse != null ? Number(h.revshare_repasse) : null,
          })),
        }))}
        userRoles={profile.user_roles}
        casas={casas}
        afiliadoId={id}
      />
    </div>
  )
}

/* ── Brand Icons ── */

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
