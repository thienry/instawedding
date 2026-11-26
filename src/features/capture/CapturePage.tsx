import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { GuestbookModal } from '@/components/capture/GuestbookModal'
import { VideoRecorderModal } from '@/components/capture/VideoRecorderModal'
import { TermsModal } from '@/components/common/TermsModal'
import { CaptureChoices } from '@/features/capture/components/CaptureChoices'
import { CaptureHeader } from '@/features/capture/components/CaptureHeader'
import { ChallengeHint } from '@/features/capture/components/ChallengeHint'
import { GuestProfileBar } from '@/features/capture/components/GuestProfileBar'
import { MediaPreview } from '@/features/capture/components/MediaPreview'
import { PostDetailsForm } from '@/features/capture/components/PostDetailsForm'
import { SignInGate } from '@/features/capture/components/SignInGate'
import { StudioControls } from '@/features/capture/components/StudioControls'
import { VideoSummary } from '@/features/capture/components/VideoSummary'
import { useMediaSelection } from '@/features/capture/hooks/useMediaSelection'
import { usePostDraft } from '@/features/capture/hooks/usePostDraft'
import { usePostSubmit } from '@/features/capture/hooks/usePostSubmit'
import { useGuestAuth } from '@/hooks/useGuestAuth'

import type { ChangeEvent, FormEvent } from 'react'

/** Studio where guests take or choose media and post it. */
export function CapturePage() {
  const [searchParams] = useSearchParams()
  const challengeParam = searchParams.get('challengeId')
  const preselectedChallengeId = challengeParam ? Number(challengeParam) : null

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [openModal, setOpenModal] = useState<'recorder' | 'guestbook' | 'terms' | null>(null)
  const closeModal = () => setOpenModal(null)

  const { guestUser, isSigningIn, signIn, signOut } = useGuestAuth()
  const media = useMediaSelection(setErrorMessage)
  const draft = usePostDraft(preselectedChallengeId)
  const { isSubmitting, submit, submitCard } = usePostSubmit(media, draft, setErrorMessage)
  const { previewUrl, isVideo } = media

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setErrorMessage('')
    void media.selectFile(file)
  }

  const handleVideoRecorded = (file: File, durationSeconds: number) => {
    setErrorMessage('')
    media.selectRecording(file, durationSeconds)
  }

  const handleSendCard = async (file: File, showOnProjector: boolean) => {
    // Signed out in another tab: the rejection keeps the message on screen
    if (!guestUser) throw new Error('Not signed in')
    await submitCard(guestUser, file, showOnProjector)
  }

  const handleReset = () => {
    setErrorMessage('')
    media.clear()
    draft.setShowOnProjector(true)
  }

  const handleSignIn = async () => {
    setErrorMessage('')
    try {
      const result = await signIn(
        preselectedChallengeId ? `/capture?challengeId=${preselectedChallengeId}` : '/capture'
      )
      if (!result.success && result.message) setErrorMessage(result.message)
    } catch {
      setErrorMessage('Não foi possível iniciar o login com Google. Tente novamente.')
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!guestUser) return
    setErrorMessage('')
    void submit(guestUser)
  }

  return (
    <div
      data-fill-height
      className="flex-1 flex flex-col px-4 py-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Always mounted, so the file survives a login change behind the camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
      />

      <CaptureHeader canPost={guestUser !== null && previewUrl !== null} onReset={handleReset} />

      {!guestUser ? (
        <SignInGate
          isSigningIn={isSigningIn}
          errorMessage={errorMessage}
          onSignIn={() => void handleSignIn()}
        />
      ) : !previewUrl ? (
        <>
          <div className="w-full max-w-xl mx-auto">
            <GuestProfileBar guestUser={guestUser} onSignOut={() => void signOut()} />
          </div>
          <div className="w-full max-w-xl m-auto space-y-3 sm:space-y-5">
            <CaptureChoices
              errorMessage={errorMessage}
              onOpenCamera={() => cameraInputRef.current?.click()}
              onOpenRecorder={() => setOpenModal('recorder')}
              onOpenGallery={() => galleryInputRef.current?.click()}
              onOpenGuestbook={() => setOpenModal('guestbook')}
            />
            {draft.moment && draft.challengeId === draft.moment.id ? (
              <ChallengeHint moment={draft.moment} />
            ) : (
              preselectedChallengeId && <ChallengeHint />
            )}
          </div>
        </>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="lg:grid lg:grid-cols-2 lg:gap-8 items-start space-y-3 sm:space-y-5 lg:space-y-0">
          <MediaPreview
            media={media}
            previewUrl={previewUrl}
            isSubmitting={isSubmitting}
            onReset={handleReset}
          />
          <div className="min-w-0 space-y-3 sm:space-y-5">
            {isVideo ? (
              <VideoSummary durationSeconds={media.videoDuration} />
            ) : (
              <StudioControls media={media} previewUrl={previewUrl} />
            )}
            <PostDetailsForm
              guestUser={guestUser}
              draft={draft}
              media={media}
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              onSignOut={() => void signOut()}
              onOpenTerms={() => setOpenModal('terms')}
            />
          </div>
        </form>
      )}

      <VideoRecorderModal
        isOpen={openModal === 'recorder'}
        onClose={closeModal}
        onVideoRecorded={handleVideoRecorded}
      />
      <GuestbookModal
        isOpen={openModal === 'guestbook'}
        onClose={closeModal}
        authorName={guestUser?.name ?? ''}
        onSend={handleSendCard}
      />
      <TermsModal isOpen={openModal === 'terms'} onClose={closeModal} />
    </div>
  )
}
