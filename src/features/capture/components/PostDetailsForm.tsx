import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'

import { AuthorSummary } from '@/features/capture/components/AuthorSummary'
import { ChallengeSelect } from '@/features/capture/components/ChallengeSelect'
import { ProjectorToggle } from '@/features/capture/components/ProjectorToggle'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'
import type { PostDraft } from '@/features/capture/hooks/usePostDraft'
import type { GuestUser } from '@/types/domain'

interface PostDetailsFormProps {
  readonly guestUser: GuestUser
  readonly draft: PostDraft
  readonly media: MediaSelection
  readonly isSubmitting: boolean
  readonly errorMessage: string
  readonly onSignOut: () => void
  readonly onOpenTerms: () => void
}

/** Caption, challenge and projector options, with the submit button. */
export function PostDetailsForm({
  guestUser,
  draft,
  media,
  isSubmitting,
  errorMessage,
  onSignOut,
  onOpenTerms,
}: PostDetailsFormProps) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sage-200/80 shadow-xs space-y-4">
      <AuthorSummary guestUser={guestUser} onSignOut={onSignOut} />

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-sage-900 block">
          Legenda{' '}
          <span className="text-sage-800/50 font-normal">(opcional)</span>
        </label>
        <textarea
          rows={2}
          value={draft.caption}
          onChange={(e) => draft.setCaption(e.target.value)}
          placeholder="Deixe um recado carinhoso para os noivos..."
          className="w-full px-4 py-3 rounded-xl border border-sage-200 bg-sage-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-800/20 resize-none"
        />
      </div>

      <ChallengeSelect draft={draft} />

      <ProjectorToggle draft={draft} />

      {/* Implicit Terms & LGPD Consent Notice */}
      <p className="pt-1 text-xs text-sage-800/75 leading-relaxed">
        Ao utilizar o aplicativo e publicar fotos ou vídeos, você concorda com
        os{' '}
        <button
          type="button"
          onClick={onOpenTerms}
          className="font-bold text-sage-900 underline hover:text-gold-500 inline-flex items-center gap-1"
        >
          <span>Termos de Uso &amp; Privacidade</span>
          <ExternalLink className="w-3 h-3" />
        </button>{' '}
        e autoriza a exibição no telão da festa e no álbum dos noivos.
      </p>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || media.isProcessing}
        className="w-full py-4 px-5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide uppercase transition-all shadow-md flex items-center justify-center space-x-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Postando...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>{media.isVideo ? 'Postar Vídeo' : 'Postar Foto'}</span>
          </>
        )}
      </button>
    </div>
  )
}
