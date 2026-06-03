'use client'

import { useState } from 'react'
import Drawer from '@/components/ui/Drawer'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function NewUsuarioDrawer({ open, onClose, onCreated }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_completo: nomeCompleto,
          email,
          password,
          telefone,
          data_nascimento: dataNascimento,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar administrador.')
        return
      }

      // Reset form states
      setNomeCompleto('')
      setEmail('')
      setPassword('')
      setTelefone('')
      setDataNascimento('')

      onCreated()
    } catch {
      setError('Erro de conexão ao criar administrador.')
    } finally {
      setLoading(false)
    }
  }

  const titleNode = (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
        }}
      >
        <span className="material-symbols-outlined text-[18px]">person_add</span>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-white leading-none">Novo Administrador</h2>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1">
          Cadastre um novo usuário com acesso administrativo
        </p>
      </div>
    </div>
  )

  const footerNode = (
    <div className="flex justify-end gap-3 p-6 bg-[var(--color-surface-container-high)]">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-5 py-2.5 rounded-full border border-[var(--color-outline-variant)] text-xs font-semibold bg-transparent text-white hover:bg-[var(--color-surface-container-high)] disabled:opacity-50 transition-colors cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="new-admin-form"
        disabled={loading}
        className="px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
      >
        {loading ? 'Criando...' : 'Criar Administrador'}
      </button>
    </div>
  )

  const labelStyle = {
    color: 'var(--color-on-surface-variant)',
  }

  const inputStyle = `w-full outline-none bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl text-sm px-4 py-2.5 mt-1.5 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)] transition-colors`

  return (
    <Drawer open={open} onClose={onClose} title={titleNode} size="sm" footer={footerNode}>
      <form id="new-admin-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        {/* Error Alert */}
        {error && (
          <div
            className="p-3.5 rounded-xl text-xs font-semibold border"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            {error}
          </div>
        )}

        {/* Nome Completo */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
            Nome Completo *
          </label>
          <input
            type="text"
            required
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            className={inputStyle}
            placeholder="Ex: Carlos Eduardo Rodrigues"
          />
        </div>

        {/* E-mail */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
            E-mail *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyle}
            placeholder="Ex: carloseduardo@empresa.com"
          />
        </div>

        {/* Senha */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
            Senha *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputStyle}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {/* Telefone */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
            Telefone *
          </label>
          <input
            type="text"
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className={inputStyle}
            placeholder="Ex: 11 99999-9999"
          />
        </div>

        {/* Data de Nascimento */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
            Data de Nascimento *
          </label>
          <input
            type="date"
            required
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className={inputStyle}
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </form>
    </Drawer>
  )
}
