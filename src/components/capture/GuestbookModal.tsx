import { Heart, Loader2, PenTool, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

import { generateGuestbookCardFile, GUESTBOOK_THEMES } from '@/utils/guestbook-card'

import type { GuestbookThemeId } from '@/utils/guestbook-card'

const QUICK_WISHES: readonly string[] = [
  'Que a felicidade deste dia tão esperado se multiplique a cada novo amanhecer! Viva Thiago & Priscila! 💍✨',
  'Parabéns pelo casamento lindo! Que a vida a dois seja repleta de amor, cumplicidade, paciência e bênçãos!',
  'Uma noite inesquecível para um casal extraordinário! Amamos celebrar o amor de vocês! Parabéns! ❤️🥂',
  'Que Deus ilumine cada passo dessa nova família que se inicia hoje. Chuva de bênçãos para Thiago & Priscila!',
] as const

interface GuestbookModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly authorName: string
  readonly onCardGenerated: (file: File, message: string) => void
}

export function GuestbookModal({
  isOpen,
  onClose,
  authorName,
  onCardGenerated,
}: GuestbookModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<GuestbookThemeId>('emerald')
  const [message, setMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleApplyQuickWish = (wish: string) => {
    setMessage(wish)
    setError('')
  }

  const handleGenerate = async () => {
    const trimmed = message.trim()
    if (!trimmed) {
      setError('Por favor, escreva uma mensagem ou voto de felicitações.')
      return
    }

    if (trimmed.length < 8) {
      setError('A mensagem deve ter pelo menos 8 caracteres.')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const file = await generateGuestbookCardFile({
        authorName,
        message: trimmed,
        themeId: selectedTheme,
      })
      onCardGenerated(file, trimmed)
      onClose()
    } catch {
      setError('Não foi possível gerar o cartão. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] text-sage-900 rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-gold-400/40 flex flex-col gap-5 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sage-200 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold-400/20 text-gold-600">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600 block">
                Livro de Recados Digital
              </span>
              <h2 className="font-serif text-xl font-bold text-sage-900">
                Escrever Votos aos Noivos
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-sage-100 hover:bg-sage-200 text-sage-700 transition-colors"
            title="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-sage-800 uppercase tracking-wider block">
            Escolha o Estilo do Cartão:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GUESTBOOK_THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  style={{
                    background: `linear-gradient(135deg, ${theme.bgGradient[0]}, ${theme.bgGradient[1]})`,
                  }}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-gold-500 scale-102 shadow-md'
                      : 'opacity-85 hover:opacity-100'
                  }`}>
                  <div
                    className="w-4 h-4 rounded-full border border-white/40"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                  <span
                    className="text-[11px] font-bold truncate max-w-full"
                    style={{ color: theme.textColor }}>
                    {theme.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="guestbook-message"
              className="text-xs font-bold text-sage-800 uppercase tracking-wider">
              Sua Mensagem para Thiago &amp; Priscila:
            </label>
            <span
              className={`text-xs font-mono ${
                message.length > 300 ? 'text-rose-600 font-bold' : 'text-sage-500'
              }`}>
              {message.length}/320
            </span>
          </div>

          <textarea
            id="guestbook-message"
            rows={4}
            maxLength={320}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              if (error) setError('')
            }}
            placeholder="Escreva seus votos de amor, alegria e bênçãos para os noivos..."
            className="w-full p-3.5 rounded-2xl bg-white border border-sage-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 text-sm font-serif italic text-sage-900 placeholder:text-sage-400 placeholder:font-sans placeholder:not-italic resize-none transition-all shadow-2xs"
          />
        </div>

        {/* Quick Wishes Chips */}
        <div className="space-y-2">
          <span className="text-xs text-sage-600 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold-500" />
            <span>Sugestões rápidas de felicitações:</span>
          </span>
          <div className="flex flex-col gap-1.5">
            {QUICK_WISHES.map((wish, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleApplyQuickWish(wish)}
                className="text-left text-xs p-2.5 rounded-xl bg-sage-100/80 hover:bg-sage-200/80 text-sage-800 transition-colors border border-sage-200/70 line-clamp-1">
                &ldquo;{wish}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 px-4 rounded-xl bg-sage-200 hover:bg-sage-300 text-sage-800 text-sm font-semibold transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            disabled={isGenerating || !message.trim()}
            onClick={() => void handleGenerate()}
            className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-sage-900 to-sage-800 hover:from-sage-800 hover:to-sage-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] border border-gold-400/40">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Cartão...</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>Criar Cartão de Votos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
