import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { TermsModal } from '@/components/common/TermsModal'
import { getGuestAuthService } from '@/services/guest-auth.factory'
import { OfflineQueueService } from '@/services/offline-queue.service'
import {
  getChallengeRepository,
  getPostRepository,
} from '@/services/repositories.factory'
import { getStorageService } from '@/services/storage.factory'
import { compressPhoto } from '@/utils/compressor'
import {
  getFilterById,
  PHOTO_FILTERS,
  PHOTO_FRAMES,
  renderFilteredAndFramedPhoto,
} from '@/utils/photo-filters'
import {
  getGuestSession,
  getTermsAcceptedAt,
  setTermsAccepted,
} from '@/utils/session'

import type { Challenge, GuestUser } from '@/types/domain'
import type { PhotoFilterId, PhotoFrameId } from '@/utils/photo-filters'

const CURRENT_DATE_STR = new Date().toLocaleDateString('pt-BR')
const CURRENT_YEAR = new Date().getFullYear()

export function CapturePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedChallengeId = searchParams.get('challengeId')
    ? Number(searchParams.get('challengeId'))
    : null

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const guestAuthService = getGuestAuthService()
  const [guestUser, setGuestUser] = useState<GuestUser | null>(() =>
    guestAuthService.getCurrentGuest()
  )
  const [isSigningIn, setIsSigningIn] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('none')
  const [selectedFrame, setSelectedFrame] = useState<PhotoFrameId>('none')
  const [studioTab, setStudioTab] = useState<'filters' | 'frames'>('filters')

  const [caption, setCaption] = useState('')
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(
    preselectedChallengeId
  )
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [termsAccepted, setTermsAcceptedState] = useState(() =>
    Boolean(getTermsAcceptedAt())
  )
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const storageService = getStorageService()
  const postRepo = getPostRepository()
  const challengeRepo = getChallengeRepository()

  useEffect(() => {
    setGuestUser(guestAuthService.getCurrentGuest())
    const unsubscribe = guestAuthService.onAuthStateChange((user) => {
      setGuestUser(user)
      if (user && getTermsAcceptedAt()) {
        setTermsAcceptedState(true)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [guestAuthService])

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const list = await challengeRepo.getChallenges()
        setChallenges(list)
      } catch {
        // Failed to load challenges
      }
    }
    fetchChallenges()
  }, [challengeRepo])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage('')
    setSelectedFile(file)

    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    // Compress in background
    setIsCompressing(true)
    try {
      const compressed = await compressPhoto(file)
      setCompressedFile(compressed)
    } catch {
      // Fallback to original file if compression encounters an edge case
      setCompressedFile(file)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleResetPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setCompressedFile(null)
    setSelectedFilter('none')
    setSelectedFrame('none')
    setUploadProgress(null)
    setErrorMessage('')
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage('')
    setIsSigningIn(true)
    try {
      const redirectPath = preselectedChallengeId
        ? `/capture?challengeId=${preselectedChallengeId}`
        : '/capture'
      const result = await guestAuthService.signInWithGoogle(redirectPath)
      if (!result.success && result.message) {
        setErrorMessage(result.message)
      }
      if (result.user) {
        setGuestUser(result.user)
      }
    } catch {
      setErrorMessage(
        'Não foi possível iniciar o login com Google. Tente novamente.'
      )
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleLogoutGuest = async () => {
    await guestAuthService.logout()
    setGuestUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!guestUser) {
      void handleGoogleSignIn()
      return
    }

    if (!termsAccepted) {
      setErrorMessage(
        'É necessário aceitar os termos de uso e privacidade para publicar no telão.'
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setUploadProgress(0)

    try {
      let fileToUpload: File
      if (
        previewUrl &&
        (selectedFilter !== 'none' || selectedFrame !== 'none')
      ) {
        setIsCompressing(true)
        fileToUpload = await renderFilteredAndFramedPhoto(
          previewUrl,
          selectedFile?.name || 'wedding-photo.jpg',
          {
            filterId: selectedFilter,
            frameId: selectedFrame,
            weddingTitle: 'Thiago & Priscila',
          }
        )
        setIsCompressing(false)
      } else {
        const fallback = compressedFile || selectedFile
        if (!fallback) {
          setErrorMessage('Nenhuma foto selecionada.')
          setIsSubmitting(false)
          return
        }
        fileToUpload = fallback
      }

      setTermsAccepted(true)
      const session = getGuestSession()
      const effectiveSessionId = guestUser.id || session.sessionId

      // 1. Check if device is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(fileToUpload)
        })

        OfflineQueueService.enqueue({
          authorName: guestUser.name,
          authorAvatarUrl: guestUser.avatarUrl,
          mediaUrl: base64Url,
          caption: caption.trim() || null,
          challengeId: selectedChallengeId,
          clientSessionId: effectiveSessionId,
        })

        alert(
          'Você está offline no momento. Sua foto foi salva no aparelho e será publicada automaticamente assim que a conexão voltar!'
        )
        navigate('/')
        return
      }

      // 2. Upload to storage (Mock or R2)
      const mediaUrl = await storageService.uploadFile(fileToUpload, (pct) => {
        setUploadProgress(pct)
      })

      // 3. Persist post
      await postRepo.createPost({
        authorName: guestUser.name,
        authorAvatarUrl: guestUser.avatarUrl,
        mediaUrl,
        caption: caption.trim() || null,
        challengeId: selectedChallengeId,
        clientSessionId: effectiveSessionId,
      })

      // 4. Navigate back to feed
      navigate('/')
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Falha ao enviar a foto. Tente novamente.'
      )
      setUploadProgress(null)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hidden file inputs */}
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
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-sage-200 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao feed</span>
        </button>
        <h2 className="font-serif text-lg sm:text-xl font-bold text-sage-900">
          Estúdio Fotográfico
        </h2>
      </div>

      {!guestUser ? (
        /* Authentication Gate before capturing/publishing */
        <div className="max-w-xl mx-auto space-y-5 pt-2">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-sage-200/90 text-center space-y-5 shadow-xs">
            <img
              src="/favicon.svg"
              alt="Logo Thiago & Priscila"
              className="w-16 h-16 rounded-2xl mx-auto shadow-xs"
            />
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-sage-900">
                Entre para Publicar Fotos
              </h3>
              <p className="text-sm text-sage-800/75 max-w-md mx-auto leading-relaxed">
                Conecte sua conta Google para enviar fotos ao mural e telão ao
                vivo. Sua foto de perfil e nome serão usados automaticamente na
                assinatura!
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-2 text-rose-700 text-xs sm:text-sm max-w-xs mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => void handleGoogleSignIn()}
              className="w-full max-w-xs mx-auto py-3.5 px-5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              ) : (
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2.1H12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1l-3.3 2.6C4.8 19.9 8.1 22 12 22z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.1 7.5C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z"
                  />
                  <path
                    fill="#4285F4"
                    d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.1 3.1 7.5l3.3 2.6c.8-2.3 3-4.2 5.6-4.2z"
                  />
                </svg>
              )}
              <span>
                {isSigningIn ? 'Redirecionando...' : 'Continuar com Google'}
              </span>
            </button>
          </div>
        </div>
      ) : !previewUrl ? (
        /* Capture Choice Cards */
        <div className="max-w-xl mx-auto space-y-5 pt-2">
          {/* Connected Guest Profile Bar */}
          <div className="bg-white rounded-2xl px-4 py-3 border border-sage-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AuthorAvatar
                name={guestUser.name}
                avatarUrl={guestUser.avatarUrl}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-xs text-sage-800/65 font-medium">
                  Publicando como
                </p>
                <p className="text-sm font-bold text-sage-900 truncate">
                  {guestUser.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutGuest}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-colors shrink-0"
              title="Desconectar conta Google"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-sage-200/90 text-center space-y-5 shadow-xs">
            <div className="w-20 h-20 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center mx-auto shadow-2xs">
              <Camera className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-sage-900">
                Registre o Momento
              </h3>
              <p className="text-sm text-sage-800/75 max-w-md mx-auto leading-relaxed">
                Tire uma foto agora com a câmera ou escolha uma imagem especial
                da sua galeria para personalizar e enviar ao mural ao vivo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-sage-900 text-white hover:bg-sage-800 active:scale-95 transition-all shadow-md space-y-2"
              >
                <Camera className="w-7 h-7 text-gold-400" />
                <span className="text-sm font-bold">Abrir Câmera</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-sage-100 text-sage-900 hover:bg-sage-200 active:scale-95 transition-all border border-sage-200 space-y-2"
              >
                <ImageIcon className="w-7 h-7 text-sage-800" />
                <span className="text-sm font-bold">Escolher da Galeria</span>
              </button>
            </div>
          </div>

          {/* Scavenger Hunt Hint */}
          {preselectedChallengeId && (
            <div className="p-4 bg-gold-400/15 border border-gold-400/35 rounded-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-gold-500 shrink-0" />
              <p className="text-sm text-sage-900 font-medium">
                Você iniciou um desafio especial! Sua foto será vinculada
                automaticamente após a publicação.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Preview & Details Form (2 Columns on Notebook/Desktop) */
        <form
          onSubmit={handleSubmit}
          className="lg:grid lg:grid-cols-12 lg:gap-8 items-start space-y-6 lg:space-y-0"
        >
          {/* Left Column: Photo Preview Container */}
          <div className="lg:col-span-6 lg:sticky lg:top-6">
            <div
              className={`relative rounded-3xl overflow-hidden transition-all shadow-sm ${
                selectedFrame === 'polaroid'
                  ? 'bg-white p-4 pb-8 border border-sage-200'
                  : 'border border-sage-200 bg-black/5'
              }`}
            >
              <div className="relative rounded-2xl overflow-hidden bg-slate-950/95 flex items-center justify-center max-h-[65vh]">
                <img
                  src={previewUrl}
                  alt="Prévia da foto"
                  className="w-full max-h-[65vh] object-contain transition-all duration-150"
                  style={{ filter: getFilterById(selectedFilter).cssFilter }}
                />

                {/* Overlays for Frame preview */}
                {selectedFrame === 'cinema' && (
                  <>
                    <div className="absolute top-0 inset-x-0 h-7 bg-[#05070a] pointer-events-none" />
                    <div className="absolute bottom-0 inset-x-0 h-7 bg-[#05070a] flex items-center justify-between px-4 text-[11px] text-white/85 font-mono pointer-events-none">
                      <span className="font-semibold text-white">
                        ● REC THIAGO &amp; PRISCILA
                      </span>
                      <span>{CURRENT_DATE_STR}</span>
                    </div>
                  </>
                )}

                {selectedFrame === 'golden-border' && (
                  <div className="absolute inset-2.5 border-2 border-amber-400 rounded-xl pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    <div className="absolute inset-1 border border-amber-200/60 rounded-lg" />
                  </div>
                )}

                {selectedFrame === 'minimal-floral' && (
                  <div className="absolute bottom-0 inset-x-0 h-11 bg-gradient-to-t from-black/75 to-transparent flex items-end justify-center pb-2.5 pointer-events-none">
                    <span className="font-serif italic text-white text-xs sm:text-sm drop-shadow-xs">
                      💍 Thiago &amp; Priscila • {CURRENT_YEAR}
                    </span>
                  </div>
                )}

                {/* Change Photo Button */}
                <button
                  type="button"
                  onClick={handleResetPhoto}
                  disabled={isSubmitting}
                  className="absolute top-3 right-3 bg-black/65 hover:bg-black/85 text-white text-xs font-semibold px-3.5 py-2 rounded-full backdrop-blur-xs transition-colors z-10 shadow-sm"
                >
                  Trocar Foto
                </button>

                {isCompressing && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-xs text-white text-sm font-semibold space-x-2 z-20">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando imagem...</span>
                  </div>
                )}
              </div>

              {/* Bottom text for Polaroid Frame */}
              {selectedFrame === 'polaroid' && (
                <div className="pt-4 text-center space-y-0.5 pointer-events-none">
                  <p className="font-serif italic font-bold text-base text-slate-800">
                    Thiago &amp; Priscila
                  </p>
                  <p className="text-xs text-slate-500 font-medium tracking-wide">
                    Nosso Grande Dia • InstaWedding
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Studio Controls & Details Form */}
          <div className="lg:col-span-6 space-y-5">
            {/* Studio Controls: Filters & Frames */}
            <div className="bg-white rounded-3xl p-5 border border-sage-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-sage-900">
                  <Sparkles className="w-4 h-4 text-gold-500" />
                  <span>Efeitos &amp; Molduras</span>
                </div>

                {/* Tab Selector */}
                <div className="flex bg-sage-100/90 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStudioTab('filters')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      studioTab === 'filters'
                        ? 'bg-white text-sage-900 shadow-xs font-bold'
                        : 'text-sage-700 hover:text-sage-900'
                    }`}
                  >
                    Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioTab('frames')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      studioTab === 'frames'
                        ? 'bg-white text-sage-900 shadow-xs font-bold'
                        : 'text-sage-700 hover:text-sage-900'
                    }`}
                  >
                    Molduras
                  </button>
                </div>
              </div>

              {/* Carousel Content */}
              {studioTab === 'filters' ? (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {PHOTO_FILTERS.map((f) => {
                    const isSelected = selectedFilter === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f.id)}
                        className={`shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                          isSelected
                            ? 'ring-2 ring-sage-900 bg-sage-50'
                            : 'hover:bg-sage-50/60'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-sage-200 relative shadow-2xs">
                          <img
                            src={previewUrl}
                            alt={f.label}
                            className="w-full h-full object-cover"
                            style={{ filter: f.cssFilter }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-sage-800 text-center max-w-[80px] truncate">
                          {f.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {PHOTO_FRAMES.map((fr) => {
                    const isSelected = selectedFrame === fr.id
                    return (
                      <button
                        key={fr.id}
                        type="button"
                        onClick={() => setSelectedFrame(fr.id)}
                        className={`shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                          isSelected
                            ? 'ring-2 ring-gold-500 bg-gold-400/15'
                            : 'hover:bg-sage-50/60'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl bg-sage-100 flex items-center justify-center border border-sage-200 text-2xl shadow-2xs">
                          {fr.id === 'none' && '🚫'}
                          {fr.id === 'polaroid' && '📷'}
                          {fr.id === 'golden-border' && '✨'}
                          {fr.id === 'cinema' && '🎬'}
                          {fr.id === 'minimal-floral' && '💍'}
                        </div>
                        <span className="text-xs font-semibold text-sage-800 text-center max-w-[84px] truncate">
                          {fr.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sage-200/80 shadow-xs space-y-4">
              {/* Connected Author Profile Summary */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-sage-50/80 border border-sage-200/80">
                <div className="flex items-center gap-3 min-w-0">
                  <AuthorAvatar
                    name={guestUser.name}
                    avatarUrl={guestUser.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-800/60 block">
                      Assinado por
                    </span>
                    <p className="text-sm font-bold text-sage-900 truncate">
                      {guestUser.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutGuest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-sage-200 hover:border-rose-200 text-xs font-semibold text-sage-800 hover:text-rose-700 transition-colors shrink-0"
                  title="Sair ou trocar conta Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Trocar conta</span>
                </button>
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-sage-900 block">
                  Legenda{' '}
                  <span className="text-sage-800/50 font-normal">
                    (opcional)
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Deixe um recado carinhoso para os noivos..."
                  className="w-full px-4 py-3 rounded-xl border border-sage-200 bg-sage-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-800/20 resize-none"
                />
              </div>

              {/* Challenge Selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-sage-900 flex items-center justify-between">
                  <span>Vincular a um Desafio</span>
                  <span className="text-sage-800/50 font-normal text-xs">
                    (opcional)
                  </span>
                </label>
                <select
                  value={selectedChallengeId ?? ''}
                  onChange={(e) =>
                    setSelectedChallengeId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-sage-200 bg-sage-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-800/20"
                >
                  <option value="">Nenhum desafio (Foto livre)</option>
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Terms & LGPD Consent Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none text-left">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAcceptedState(e.target.checked)
                      if (errorMessage) setErrorMessage('')
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-sage-300 text-sage-900 focus:ring-sage-800/20"
                  />
                  <span className="text-xs sm:text-sm text-sage-800/85 leading-relaxed">
                    Concordo com os{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setIsTermsModalOpen(true)
                      }}
                      className="font-bold text-sage-900 underline hover:text-gold-500 inline-flex items-center gap-1"
                    >
                      <span>Termos de Uso &amp; Privacidade</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    . Autorizo a exibição da foto no telão da festa e álbum dos
                    noivos.
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-sage-900">
                    <span>Enviando foto...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-sage-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage-800 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isCompressing || !termsAccepted}
                className="w-full py-4 px-5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide uppercase transition-all shadow-md flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Publicar no Telão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setTermsAcceptedState(true)
          if (errorMessage) setErrorMessage('')
        }}
      />
    </div>
  )
}
