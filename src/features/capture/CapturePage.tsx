import { useEffect, useRef, useState } from 'react'
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
  const formRef = useRef<HTMLFormElement>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [openModal, setOpenModal] = useState<'recorder' | 'guestbook' | 'terms' | null>(null)
  const [isCardCaption, setIsCardCaption] = useState(false)
  const closeModal = () => setOpenModal(null)

  const { guestUser, isSigningIn, signIn, signOut } = useGuestAuth()
  const media = useMediaSelection(setErrorMessage)
  const draft = usePostDraft(preselectedChallengeId)
  const { isSubmitting, submit } = usePostSubmit(media, draft, setErrorMessage)
  const { previewUrl, isVideo } = media

  // On phones the form starts below the fold
  useEffect(() => {
    if (!previewUrl || window.innerWidth >= 1024) return
    const timer = setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(timer)
  }, [previewUrl])

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

  const handleCardGenerated = (file: File, message: string) => {
    setErrorMessage('')
    media.selectCard(file)
    draft.setCaption(message)
    setIsCardCaption(true)
  }

  const handleReset = () => {
    setErrorMessage('')
    media.clear()
    draft.setShowOnProjector(true)
    if (isCardCaption) {
      draft.setCaption('')
      setIsCardCaption(false)
    }
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
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

      <CaptureHeader
        media={media}
        canPost={guestUser !== null && previewUrl !== null}
        isSubmitting={isSubmitting}
        onReset={handleReset}
        onPost={() => formRef.current?.requestSubmit()}
      />

      {!guestUser ? (
        <SignInGate
          isSigningIn={isSigningIn}
          errorMessage={errorMessage}
          onSignIn={() => void handleSignIn()}
        />
      ) : !previewUrl ? (
        <div className="max-w-xl mx-auto space-y-5 pt-2">
          <GuestProfileBar guestUser={guestUser} onSignOut={() => void signOut()} />
          <CaptureChoices
            errorMessage={errorMessage}
            onOpenCamera={() => cameraInputRef.current?.click()}
            onOpenRecorder={() => setOpenModal('recorder')}
            onOpenGallery={() => galleryInputRef.current?.click()}
            onOpenGuestbook={() => setOpenModal('guestbook')}
          />
          {preselectedChallengeId && <ChallengeHint />}
        </div>
      ) : (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="lg:grid lg:grid-cols-12 lg:gap-8 items-start space-y-6 lg:space-y-0">
          <MediaPreview
            media={media}
            previewUrl={previewUrl}
            isSubmitting={isSubmitting}
            onReset={handleReset}
          />
          <div className="lg:col-span-6 space-y-6">
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
        onCardGenerated={handleCardGenerated}
      />
      <TermsModal isOpen={openModal === 'terms'} onClose={closeModal} />
    </div>
  )
}
