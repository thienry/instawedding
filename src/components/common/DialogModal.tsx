import { AlertTriangle, Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export interface DialogOptions {
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  /** Shows a cancel button. Omit for plain notices. */
  readonly cancelLabel?: string
  readonly isDestructive?: boolean
  /** Text the user must type before confirming. */
  readonly requiredText?: string
}

interface DialogModalProps extends DialogOptions {
  readonly onClose: (confirmed: boolean) => void
}

export function DialogModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  requiredText,
  onClose,
}: DialogModalProps) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [typed, setTyped] = useState('')
  const isBlocked = requiredText !== undefined && typed !== requiredText
  const Icon = isDestructive ? AlertTriangle : Info

  // Focus the safest control and give the focus back when closing
  useEffect(() => {
    const previous = document.activeElement
    formRef.current
      ?.querySelector<HTMLElement>('input, button[type=button], button')
      ?.focus()
    return () => {
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose(false)
      return
    }
    if (event.key !== 'Tab') return
    const controls = formRef.current?.querySelectorAll<HTMLElement>(
      'input, button:not(:disabled)'
    )
    const first = controls?.[0]
    const last = controls?.[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div
      role={isDestructive ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault()
          if (!isBlocked) onClose(true)
        }}
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-sage-200 space-y-4"
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            isDestructive
              ? 'bg-rose-100 text-rose-600'
              : 'bg-sage-100 text-sage-800'
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1.5">
          <h3
            id={`${id}-title`}
            className="font-serif text-lg font-bold text-sage-900"
          >
            {title}
          </h3>
          <p
            id={`${id}-message`}
            className="text-sm text-sage-800/75 leading-relaxed break-words"
          >
            {message}
          </p>
        </div>
        {requiredText !== undefined && (
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label={`Digite ${requiredText} para confirmar`}
            placeholder={requiredText}
            autoComplete="off"
            className="w-full px-4 py-3 rounded-xl border border-sage-300 bg-white text-center text-base font-bold text-sage-900 placeholder:text-sage-800/30 focus:outline-none focus:ring-2 focus:ring-sage-800/30"
          />
        )}
        <div className="flex items-center gap-2.5 pt-1">
          {cancelLabel && (
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 py-3 px-4 rounded-xl border border-sage-200 text-sm font-semibold text-sage-800 hover:bg-sage-100 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={isBlocked}
            className={`flex-1 py-3 px-4 rounded-xl text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-sage-900 hover:bg-sage-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
