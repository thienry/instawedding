import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { TermsModal } from '@/components/common/TermsModal'
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
  getGuestName,
  getGuestSession,
  getTermsAcceptedAt,
  setGuestName,
  setTermsAccepted,
} from '@/utils/session'

import type { Challenge } from '@/types/domain'
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('none')
  const [selectedFrame, setSelectedFrame] = useState<PhotoFrameId>('none')
  const [studioTab, setStudioTab] = useState<'filters' | 'frames'>('filters')

  const [authorName, setAuthorName] = useState(getGuestName())
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalAuthor = authorName.trim()

    if (!finalAuthor) {
      setErrorMessage(
        'Por favor, informe seu nome ou apelido para assinar a foto.'
      )
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
            weddingTitle: 'Thiago & Noiva',
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
      // Persist author name and terms consent
      setGuestName(finalAuthor)
      setTermsAccepted(true)
      const session = getGuestSession()

      // 1. Check if device is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(fileToUpload)
        })

        OfflineQueueService.enqueue({
          authorName: finalAuthor,
          mediaUrl: base64Url,
          caption: caption.trim() || null,
          challengeId: selectedChallengeId,
          clientSessionId: session.sessionId,
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
        authorName: finalAuthor,
        mediaUrl,
        caption: caption.trim() || null,
        challengeId: selectedChallengeId,
        clientSessionId: session.sessionId,
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
    <div className="p-4 space-y-5">
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
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs text-sage-800 hover:text-sage-900 transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao feed</span>
        </button>
        <span className="font-serif text-sm font-bold text-sage-900">
          Compartilhar Foto
        </span>
      </div>

      {!previewUrl ? (
        /* Capture Choice Cards */
        <div className="space-y-4 pt-4">
          <div className="bg-white rounded-3xl p-6 border border-sage-200 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-sage-900">
                Registre o Momento
              </h2>
              <p className="text-xs text-sage-800/70 max-w-xs mx-auto">
                Tire uma foto agora com a câmera do seu celular ou escolha uma
                imagem da sua galeria.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-sage-900 text-white hover:bg-sage-800 active:scale-95 transition-all shadow-sm space-y-1.5"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs font-semibold">Abrir Câmera</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-sage-100 text-sage-900 hover:bg-sage-200 active:scale-95 transition-all border border-sage-200/80 space-y-1.5"
              >
                <ImageIcon className="w-6 h-6 text-sage-800" />
                <span className="text-xs font-semibold">Galeria</span>
              </button>
            </div>
          </div>

          {/* Scavenger Hunt Hint */}
          {preselectedChallengeId && (
            <div className="p-3.5 bg-gold-400/10 border border-gold-400/30 rounded-2xl flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-gold-500 shrink-0" />
              <p className="text-xs text-sage-900">
                Você iniciou o desafio especial! A foto será vinculada
                automaticamente após o envio.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Preview & Details Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Preview Container */}
          <div
            className={`relative rounded-2xl overflow-hidden transition-all shadow-xs ${
              selectedFrame === 'polaroid'
                ? 'bg-white p-3 pb-7 border border-sage-200'
                : 'border border-sage-200 bg-black/5'
            }`}
          >
            <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-black/10">
              <img
                src={previewUrl}
                alt="Prévia da foto"
                className="w-full h-full object-cover transition-all duration-150"
                style={{ filter: getFilterById(selectedFilter).cssFilter }}
              />

              {/* Overlays for Frame preview */}
              {selectedFrame === 'cinema' && (
                <>
                  <div className="absolute top-0 inset-x-0 h-6 bg-[#05070a] pointer-events-none" />
                  <div className="absolute bottom-0 inset-x-0 h-6 bg-[#05070a] flex items-center justify-between px-3 text-[9px] text-white/80 font-mono pointer-events-none">
                    <span className="font-semibold text-white">
                      ● REC THIAGO & NOIVA
                    </span>
                    <span>{CURRENT_DATE_STR}</span>
                  </div>
                </>
              )}

              {selectedFrame === 'golden-border' && (
                <div className="absolute inset-2 border-2 border-amber-400 rounded-lg pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                  <div className="absolute inset-1 border border-amber-200/60 rounded-md" />
                </div>
              )}

              {selectedFrame === 'minimal-floral' && (
                <div className="absolute bottom-0 inset-x-0 h-9 bg-gradient-to-t from-black/75 to-transparent flex items-end justify-center pb-2 pointer-events-none">
                  <span className="font-serif italic text-white text-[11px] drop-shadow-xs">
                    💍 Thiago & Noiva • {CURRENT_YEAR}
                  </span>
                </div>
              )}

              {/* Change Photo Button */}
              <button
                type="button"
                onClick={handleResetPhoto}
                disabled={isSubmitting}
                className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-xs transition-colors z-10"
              >
                Trocar Foto
              </button>

              {isCompressing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs text-white text-xs font-medium space-x-2 z-20">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando imagem...</span>
                </div>
              )}
            </div>

            {/* Bottom text for Polaroid Frame */}
            {selectedFrame === 'polaroid' && (
              <div className="pt-3 text-center space-y-0.5 pointer-events-none">
                <p className="font-serif italic font-bold text-sm text-slate-800">
                  Thiago & Noiva
                </p>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Nosso Grande Dia • InstaWedding
                </p>
              </div>
            )}
          </div>

          {/* Studio Controls: Filters & Frames */}
          <div className="bg-white rounded-2xl p-3 border border-sage-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-sage-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sage-900">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Efeitos & Molduras</span>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-sage-100/90 p-0.5 rounded-xl text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setStudioTab('filters')}
                  className={`px-3 py-1 rounded-lg transition-all ${
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
                  className={`px-3 py-1 rounded-lg transition-all ${
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
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {PHOTO_FILTERS.map((f) => {
                  const isSelected = selectedFilter === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFilter(f.id)}
                      className={`shrink-0 flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'ring-2 ring-sage-900 bg-sage-50'
                          : 'hover:bg-sage-50/50'
                      }`}
                    >
                      <div className="w-13 h-13 rounded-lg overflow-hidden border border-sage-200 relative shadow-xs">
                        <img
                          src={previewUrl}
                          alt={f.label}
                          className="w-full h-full object-cover"
                          style={{ filter: f.cssFilter }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-sage-800 text-center max-w-[68px] truncate">
                        {f.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {PHOTO_FRAMES.map((fr) => {
                  const isSelected = selectedFrame === fr.id
                  return (
                    <button
                      key={fr.id}
                      type="button"
                      onClick={() => setSelectedFrame(fr.id)}
                      className={`shrink-0 flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'ring-2 ring-gold-600 bg-gold-50/40'
                          : 'hover:bg-sage-50/50'
                      }`}
                    >
                      <div className="w-13 h-13 rounded-lg bg-sage-100 flex items-center justify-center border border-sage-200 text-base shadow-xs">
                        {fr.id === 'none' && '🚫'}
                        {fr.id === 'polaroid' && '📷'}
                        {fr.id === 'golden-border' && '✨'}
                        {fr.id === 'cinema' && '🎬'}
                        {fr.id === 'minimal-floral' && '💍'}
                      </div>
                      <span className="text-[10px] font-semibold text-sage-800 text-center max-w-[72px] truncate">
                        {fr.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Author Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-sage-900">
              Seu Nome ou Apelido <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ex: Tio Roberto & Família"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sage-800/20"
            />
          </div>

          {/* Caption */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-sage-900">
              Legenda{' '}
              <span className="text-sage-800/50 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Deixe um recado carinhoso para os noivos..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sage-800/20 resize-none"
            />
          </div>

          {/* Challenge Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-sage-900 flex items-center justify-between">
              <span>Vincular a um Desafio</span>
              <span className="text-sage-800/50 font-normal">(opcional)</span>
            </label>
            <select
              value={selectedChallengeId ?? ''}
              onChange={(e) =>
                setSelectedChallengeId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sage-800/20"
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
          <div className="pt-1 pb-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none text-left">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAcceptedState(e.target.checked)
                  if (errorMessage) setErrorMessage('')
                }}
                className="mt-0.5 w-4 h-4 rounded border-sage-300 text-sage-900 focus:ring-sage-800/20"
              />
              <span className="text-[11px] text-sage-800/80 leading-snug">
                Concordo com os{' '}
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
                . Autorizo a exibição da foto no telão da festa e álbum dos
                noivos.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold text-sage-900">
                <span>Enviando foto...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-sage-200 rounded-full overflow-hidden">
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
            className="w-full py-3.5 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-md flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Publicar no Telão</span>
              </>
            )}
          </button>
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
