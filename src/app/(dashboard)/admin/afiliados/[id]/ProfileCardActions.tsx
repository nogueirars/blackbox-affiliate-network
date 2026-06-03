'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Drawer from '@/components/ui/Drawer'

interface ProfileCardActionsProps {
  afiliadoId: string
  initialRoles: string[]
  nomeCompleto: string
}

const ROLE_OPTIONS = [
  {
    value: 'INFLUENCER',
    label: 'Influenciador(a)',
    description: 'Acesso ao painel de influenciador(a) com produção própria',
  },
  {
    value: 'GERENTE',
    label: 'Gerente',
    description: 'Gerencia sua própria rede de influenciadores(as)',
  },
  {
    value: 'INTERMEDIARIO',
    label: 'Intermediário',
    description: 'Indica Gerentes e recebe comissão da BLACKBOX',
  },
  {
    value: 'ADMIN',
    label: 'Administrador',
    description: 'Acesso completo ao painel de gestão',
  },
]

export default function ProfileCardActions({
  afiliadoId,
  initialRoles,
  nomeCompleto,
}: ProfileCardActionsProps) {
  const router = useRouter()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [resetLoading, setResetLoading] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<{ success: boolean; message: string } | null>(null)

  const toggleRole = (roleVal: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleVal) ? prev.filter((r) => r !== roleVal) : [...prev, roleVal]
    )
  }

  async function handleSaveRoles() {
    setSaveLoading(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRoles }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? 'Erro ao salvar perfis')
        return
      }
      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => {
        setIsDrawerOpen(false)
        setSaveSuccess(false)
      }, 1500)
    } catch {
      setSaveError('Erro de conexão ao salvar perfis')
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleResetPassword() {
    const confirmReset = window.confirm(
      `Deseja enviar um e-mail de recuperação de senha para ${nomeCompleto}?`
    )
    if (!confirmReset) return

    setResetLoading(true)
    setResetFeedback(null)
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliadoId}/reset-password`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setResetFeedback({ success: false, message: data.error ?? 'Erro ao solicitar reset' })
        return
      }
      setResetFeedback({ success: true, message: 'E-mail de recuperação enviado!' })
      setTimeout(() => setResetFeedback(null), 5000)
    } catch {
      setResetFeedback({ success: false, message: 'Erro de conexão ao solicitar reset de senha' })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleResetPassword}
          disabled={resetLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">lock_reset</span>
          {resetLoading ? 'Enviando...' : 'Resetar Senha'}
        </button>



      </div>

      {resetFeedback && (
        <p
          className={`text-xs font-medium animate-fade-in ${
            resetFeedback.success ? 'text-[#22D3A5]' : 'text-red-500'
          }`}
        >
          {resetFeedback.message}
        </p>
      )}

      <Drawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSaveError('')
          setSaveSuccess(false)
        }}
        title={
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--color-primary-container)',
                color: 'var(--color-on-primary-container)',
              }}
            >
              <span className="material-symbols-outlined text-[18px]">shield</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white leading-none">Gerenciar Perfis</h2>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1">
                Alterar as funções de {nomeCompleto}
              </p>
            </div>
          </div>
        }
        size="sm"
        footer={
          <div className="p-6 bg-[var(--color-surface-container-high)] flex justify-end gap-3">
            <button
              onClick={() => setIsDrawerOpen(false)}
              disabled={saveLoading}
              className="px-5 py-2.5 rounded-full border border-[var(--color-outline-variant)] text-xs font-semibold bg-transparent text-white hover:bg-[var(--color-surface-container-high)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveRoles}
              disabled={saveLoading}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {saveLoading ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Perfis'}
            </button>
          </div>
        }
      >
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {ROLE_OPTIONS.map((option) => {
              const isChecked = selectedRoles.includes(option.value)
              return (
                <div
                  key={option.value}
                  onClick={() => toggleRole(option.value)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                    isChecked
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]'
                      : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container-high)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                      isChecked
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                        : 'border-[var(--color-outline)] bg-transparent'
                    }`}
                  >
                    {isChecked && (
                      <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white leading-tight">
                      {option.label}
                    </p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5 leading-normal">
                      {option.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {saveError && (
            <p className="text-xs text-red-500 font-medium text-center">
              {saveError}
            </p>
          )}

          {saveSuccess && (
            <p className="text-xs text-[#22D3A5] font-medium text-center">
              Perfis atualizados com sucesso!
            </p>
          )}
        </div>
      </Drawer>
    </div>
  )
}
