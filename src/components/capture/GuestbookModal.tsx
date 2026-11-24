import { AlertCircle, Loader2, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { GuestbookPreview } from '@/components/capture/GuestbookPreview'
import { useDialog } from '@/hooks/useDialog'
import {
  generateGuestbookCardFile,
  GUESTBOOK_THEMES,
  MESSAGE_MAX_LENGTH,
} from '@/utils/guestbook-card'

const MIN_LENGTH = 8
const PLACEHOLDER = 'Sua mensagem aparece aqui…'

const SUGGESTIONS = [
  {
    label: 'Amor',
    text: 'Que o amor de vocês cresça a cada amanhecer e que nunca faltem motivos para sorrir juntos.',
  },
  {
    label: 'Bênção',
    text: 'Que Deus abençoe cada passo dessa nova família. Muita paz, saúde e união!',
  },
  {
    label: 'Divertida',
    text: 'Regra número um do casamento: quem cozinha não lava a louça. Sejam muito felizes!',
  },
  {
    label: 'Família',
    text: 'Ver vocês dois realizando esse sonho enche nosso coração. Contem sempre com a gente!',
  },
] as const

interface GuestbookModalProps {
  readonly isOpen: boolean
  readonly authorName: string
  readonly onClose: () => void
  /** Sends the card. A rejection keeps the message on screen. */
  readonly onSend: (file: File, showOnProjector: boolean) => Promise<void>
}

/** Editor of a card for the couple. */
export function GuestbookModal({ isOpen, ...props }: GuestbookModalProps) {
  return isOpen ? <GuestbookEditor {...props} /> : null
}

function GuestbookEditor({ authorName, onClose, onSend }: Omit<GuestbookModalProps, 'isOpen'>) {
  const [theme, setTheme] = useState(GUESTBOOK_THEMES[0]!)
  const [message, setMessage] = useState('')
  const [showOnProjector, setShowOnProjector] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const { confirm, dialog } = useDialog()
  const panelRef = useRef<HTMLDivElement>(null)
  const text = message.trim()
  const isTyped = text !== '' && !SUGGESTIONS.some((suggestion) => suggestion.text === text)

  useEffect(() => {
    const previousFocus = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  const requestClose = async () => {
    if (isSending) return
    const canClose =
      !isTyped ||
      (await confirm({
        title: 'Descartar recado?',
        message: 'O que você escreveu será perdido.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar escrevendo',
        isDestructive: true,
      }))
    if (canClose) onClose()
  }

  const applySuggestion = async (suggestion: string) => {
    const canReplace =
      !isTyped ||
      (await confirm({
        title: 'Trocar a mensagem?',
        message: 'A sugestão substitui o que você escreveu.',
        confirmLabel: 'Trocar',
        cancelLabel: 'Manter a minha',
      }))
    if (!canReplace) return
    setMessage(suggestion)
    setError('')
  }

  const send = async () => {
    if (isSending) return
    if (text.length < MIN_LENGTH) {
      setError('Escreva uma mensagem um pouquinho maior.')
      return
    }
    setError('')
    setIsSending(true)
    try {
      const file = await generateGuestbookCardFile({ theme, message: text, authorName })
      await onSend(file, showOnProjector)
    } catch {
      setError('Não foi possível enviar o recado. Tente novamente.')
      setIsSending(false)
    }
  }

  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') void requestClose()
    if (event.key !== 'Tab') return
    const controls = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), textarea, input'
    )
    const first = controls?.[0]
    const last = controls?.[controls.length - 1]
    if (event.shiftKey && (document.activeElement === first || event.target === panelRef.current)) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[55] bg-sage-950/60 lg:p-6 flex items-center justify-center animate-in fade-in duration-150">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guestbook-title"
        onKeyDown={trapFocus}
        className="w-full h-full lg:h-auto lg:max-h-full lg:max-w-5xl lg:rounded-3xl bg-sage-50 flex flex-col overflow-hidden outline-none">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-white border-b border-sage-200">
          <h2
            id="guestbook-title"
            className="font-serif text-lg sm:text-xl font-bold text-sage-900 truncate">
            Recado para os noivos
          </h2>
          <button
            type="button"
            onClick={() => void requestClose()}
            aria-label="Fechar"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-sage-800 hover:bg-sage-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto grid content-start sm:grid-cols-2 gap-5 sm:gap-8 p-4 sm:p-6">
          <div className="sm:sticky sm:top-0 self-start flex justify-center">
            <GuestbookPreview
              theme={theme}
              message={text || PLACEHOLDER}
              authorName={authorName}
              label={`Prévia do cartão: ${text || 'sem mensagem'}`}
              className="w-auto max-w-full max-h-[42dvh] sm:max-h-[68dvh] aspect-4/5 rounded-xl shadow-lg"
            />
          </div>

          <div className="space-y-5 min-w-0">
            <fieldset>
              <legend className="text-sm font-bold text-sage-900 mb-2">Papel</legend>
              <div className="grid grid-cols-4 gap-2">
                {GUESTBOOK_THEMES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={option.id === theme.id}
                    onClick={() => setTheme(option)}
                    className={`rounded-xl p-1 min-w-0 transition-all ${
                      option.id === theme.id
                        ? 'bg-white ring-2 ring-gold-500'
                        : 'hover:bg-white ring-1 ring-sage-200'
                    }`}>
                    <GuestbookPreview
                      theme={option}
                      message="Com amor"
                      authorName={authorName}
                      className="w-full aspect-4/5 rounded-lg"
                    />
                    <span className="block py-1 text-xs font-semibold text-sage-800 leading-tight">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="guestbook-message" className="text-sm font-bold text-sage-900">
                  Mensagem
                </label>
                <span className="text-xs text-sage-700 tabular-nums">
                  {message.length}/{MESSAGE_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="guestbook-message"
                rows={4}
                maxLength={MESSAGE_MAX_LENGTH}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setError('')
                }}
                placeholder="Escreva com o coração…"
                className="w-full p-3.5 rounded-2xl bg-white border border-sage-300 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 text-base text-sage-900 placeholder:text-sage-600 resize-none"
              />
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-sage-700">Sem ideia?</span>
                {SUGGESTIONS.map(({ label, text: suggestion }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => void applySuggestion(suggestion)}
                    className="min-h-11 px-4 rounded-full bg-white border border-sage-200 text-sm font-semibold text-sage-800 hover:bg-sage-100 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 min-h-11 text-sm text-sage-900">
              <input
                type="checkbox"
                checked={showOnProjector}
                onChange={(event) => setShowOnProjector(event.target.checked)}
                className="w-5 h-5 accent-sage-900"
              />
              Mostrar também no telão da festa
            </label>
          </div>
        </div>

        <footer className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-sage-200 space-y-2">
          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={isSending || text === ''}
            onClick={() => void send()}
            className="w-full min-h-13 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-base font-bold flex items-center justify-center gap-2 transition-colors">
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isSending ? 'Enviando...' : 'Enviar recado'}
          </button>
        </footer>
      </div>
      {dialog}
    </div>
  )
}
