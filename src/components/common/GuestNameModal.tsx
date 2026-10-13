import { ExternalLink, ShieldCheck, UserCheck } from 'lucide-react'
import { useState } from 'react'

import {
  getTermsAcceptedAt,
  setGuestName,
  setTermsAccepted,
} from '@/utils/session'

import { TermsModal } from './TermsModal'

interface GuestNameModalProps {
  readonly isOpen: boolean
  readonly initialName?: string
  readonly onClose: () => void
  readonly onSaved: (name: string) => void
}

export function GuestNameModal({
  isOpen,
  initialName = '',
  onClose,
  onSaved,
}: GuestNameModalProps) {
  const [name, setName] = useState(initialName)
  const [termsAccepted, setTermsAcceptedState] = useState(() =>
    Boolean(getTermsAcceptedAt())
  )
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Por favor, informe seu nome ou apelido.')
      return
    }
    if (!termsAccepted) {
      setError('É necessário aceitar os termos de uso para continuar.')
      return
    }

    setGuestName(trimmed)
    setTermsAccepted(true)
    setError('')
    onSaved(trimmed)
    onClose()
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-name-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-sage-200 space-y-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2
              id="guest-name-modal-title"
              className="font-serif text-xl font-bold text-sage-900"
            >
              Identifique-se
            </h2>
            <p className="text-xs text-sage-800/70">
              Como você gostaria de aparecer nas publicações e curtidas?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Ex: Tio Roberto & Família"
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-800/30 text-sm placeholder:text-sage-800/40"
              />
            </div>

            {/* LGPD Consent Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-left">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAcceptedState(e.target.checked)
                    if (error) setError('')
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-sage-300 text-sage-900 focus:ring-sage-800/20"
                />
                <span className="text-[11px] text-sage-800/80 leading-snug">
                  Li e concordo com os{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setIsTermsModalOpen(true)
                    }}
                    className="font-semibold text-sage-900 underline hover:text-gold-600 inline-flex items-center gap-0.5"
                  >
                    <span>Termos de Uso & Privacidade</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  . Suas fotos serão exibidas no telão e no álbum dos noivos.
                </span>
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!termsAccepted || !name.trim()}
              className="w-full py-3 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors shadow-sm"
            >
              Continuar
            </button>
          </form>
        </div>
      </div>

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setTermsAcceptedState(true)
          if (error) setError('')
        }}
      />
    </>
  )
}
