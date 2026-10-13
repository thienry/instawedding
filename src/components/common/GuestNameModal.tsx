import { UserCheck } from 'lucide-react'
import { useState } from 'react'

import { setGuestName } from '@/utils/session'

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
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Por favor, informe seu nome ou apelido.')
      return
    }
    setGuestName(trimmed)
    setError('')
    onSaved(trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-sage-200 space-y-4">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center mx-auto mb-2">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-sage-900">
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
            {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 text-white font-medium text-sm transition-colors shadow-sm"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  )
}
