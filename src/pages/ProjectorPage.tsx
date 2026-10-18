import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import {
  getPostRepository,
  getRealtimeService,
} from '@/services/repositories.factory'

import type { Post } from '@/types/domain'

const SLIDESHOW_INTERVAL_MS = 8000
const FALLBACK_POLL_INTERVAL_MS = 30000

export function ProjectorPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'Telão Ao Vivo | Casamento de Thiago & Priscila'
  }, [])
  const [newPostAlert, setNewPostAlert] = useState<Post | null>(null)

  const controlsTimeoutRef = useRef<number | null>(null)
  const postRepo = getPostRepository()
  const realtimeService = getRealtimeService()

  const captureUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/capture`
      : 'https://casamento-thiago-e-priscila.vercel.app/capture'

  // Initial load & fallback polling
  useEffect(() => {
    let isCancelled = false

    const fetchLatestPosts = () => {
      postRepo
        .getPosts()
        .then((fetched) => {
          if (!isCancelled && fetched.length > 0) {
            setPosts(fetched)
          }
        })
        .catch(() => {
          // Keep displaying current posts on error
        })
    }

    fetchLatestPosts()

    const pollInterval = window.setInterval(
      fetchLatestPosts,
      FALLBACK_POLL_INTERVAL_MS
    )

    return () => {
      isCancelled = true
      window.clearInterval(pollInterval)
    }
  }, [postRepo])

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToNewPosts((incomingPost) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === incomingPost.id)) return prev
        return [incomingPost, ...prev]
      })

      // Highlight new photo immediately
      setCurrentIndex(0)
      setNewPostAlert(incomingPost)

      // Dismiss alert banner after 6 seconds
      window.setTimeout(() => {
        setNewPostAlert((current) =>
          current?.id === incomingPost.id ? null : current
        )
      }, 6000)
    })

    return () => {
      unsubscribe()
    }
  }, [realtimeService])

  // Slideshow auto-advance timer
  useEffect(() => {
    if (posts.length <= 1 || isPaused) return

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length)
    }, SLIDESHOW_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [posts.length, isPaused])

  // Auto-hide controls after inactivity
  const handleMouseMove = () => {
    setIsControlsVisible(true)
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setIsControlsVisible(false)
    }, 4000)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const currentPost = posts[currentIndex]

  const handlePrevSlide = () => {
    if (posts.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)
  }

  const handleNextSlide = () => {
    if (posts.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % posts.length)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="h-dvh w-full bg-[#1A281E] text-sage-50 overflow-hidden relative select-none flex flex-col justify-between"
    >
      {/* Ambient background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400 via-transparent to-transparent" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sage-800/20 blur-3xl pointer-events-none" />

      {/* Top Wedding Header */}
      <header
        className={`shrink-0 relative z-30 px-6 lg:px-8 py-3.5 flex items-center justify-between transition-opacity duration-500 bg-gradient-to-b from-[#142017]/90 to-transparent ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 backdrop-blur-md"
            title="Voltar ao Feed do App"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <img
            src="/favicon.svg"
            alt="Logo Thiago & Priscila"
            className="w-11 h-11 rounded-xl shadow-md"
          />
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold tracking-wide text-white flex items-center gap-2.5">
              <span>Thiago &amp; Priscila</span>
            </h1>
            <p className="text-xs text-sage-200/80 font-sans tracking-wider">
              Mural de Memórias &amp; Desafios da Festa
            </p>
          </div>
        </div>

        {/* Slideshow Playback & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          {posts.length > 1 && (
            <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-full px-2 py-1 backdrop-blur-md">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Foto anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="p-1.5 rounded-full hover:bg-white/20 text-gold-400 transition-colors"
                title={
                  isPaused ? 'Retomar apresentação' : 'Pausar apresentação'
                }
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Próxima foto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-gold-400 transition-colors border border-white/10 backdrop-blur-md"
            title="Expandir QR Code na tela"
          >
            <QrCode className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 backdrop-blur-md"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (F11)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* New Photo Entrance Alert */}
      {newPostAlert && (
        <aside
          aria-live="polite"
          className="fixed top-24 inset-x-0 z-40 flex justify-center animate-in slide-in-from-top-4 duration-500 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 text-sage-950 px-7 py-3 rounded-full shadow-2xl flex items-center gap-3 font-semibold text-sm border-2 border-white/60">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>
              Nova foto na festa enviada por {newPostAlert.authorName}!
            </span>
          </div>
        </aside>
      )}

      {/* Main Wedding Photo Showcase */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-4 py-2 lg:px-10 lg:py-3 relative z-10 overflow-hidden">
        {currentPost ? (
          <div className="max-w-5xl w-full max-h-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center bg-[#FAF8F5] text-sage-900 p-5 lg:p-6 rounded-3xl shadow-2xl border border-gold-400/40 transition-all duration-700">
            {/* Fine Art Photo Frame (Uncropped with blurred backdrop) */}
            <div className="lg:col-span-7 aspect-4/3 max-h-[calc(100dvh-15rem)] w-full rounded-2xl overflow-hidden bg-slate-950 shadow-md relative border border-sage-200/80 flex items-center justify-center">
              <img
                src={currentPost.mediaUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
              />
              <img
                key={currentPost.id}
                src={currentPost.mediaUrl}
                alt={
                  currentPost.caption || `Foto por ${currentPost.authorName}`
                }
                className="relative z-10 w-full h-full object-contain animate-in fade-in zoom-in-95 duration-700"
              />
            </div>

            {/* Post Information & Romance Typography */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6 py-2">
              <div className="space-y-4">
                {currentPost.challenge ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-400/15 text-gold-500 text-xs font-semibold border border-gold-400/30">
                    <span className="text-base">
                      {currentPost.challenge.icon}
                    </span>
                    <span>Desafio: {currentPost.challenge.title}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs text-sage-800/60 uppercase tracking-widest font-semibold">
                    <Camera className="w-3.5 h-3.5 text-gold-500" />
                    <span>Registro Espontâneo</span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] text-gold-500 uppercase tracking-widest font-bold">
                    Momento registrado por
                  </span>
                  <div className="flex items-center gap-3.5 mt-1.5">
                    <AuthorAvatar
                      name={currentPost.authorName}
                      avatarUrl={currentPost.authorAvatarUrl}
                      size="lg"
                    />
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold text-sage-900 tracking-tight truncate">
                      {currentPost.authorName}
                    </h2>
                  </div>
                </div>

                {currentPost.caption ? (
                  <blockquote className="font-serif italic text-base lg:text-lg text-sage-800 leading-relaxed border-l-2 border-gold-500/50 pl-4 py-1">
                    &ldquo;{currentPost.caption}&rdquo;
                  </blockquote>
                ) : (
                  <p className="font-serif italic text-sm text-sage-800/60 pl-1">
                    Celebrando o grande dia com Thiago &amp; Priscila ✨
                  </p>
                )}
              </div>

              {/* Likes counter badge */}
              <div className="pt-2 border-t border-sage-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </div>
                  <span className="text-sm font-bold text-sage-900">
                    {currentPost.likesCount}{' '}
                    {currentPost.likesCount === 1 ? 'curtida' : 'curtidas'}
                  </span>
                </div>

                <span className="text-xs text-sage-800/60 font-medium">
                  {currentIndex + 1} de {posts.length} fotos
                  {isPaused ? ' (Pausado)' : ''}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-5 bg-[#FAF8F5] text-sage-900 p-10 rounded-3xl shadow-2xl border border-gold-400/40 max-w-lg">
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-2xl border border-sage-200 shadow-sm">
                <QrCodeSvg value={captureUrl} size={140} />
              </div>
            </div>
            <h2 className="font-serif text-2xl font-bold">
              Aguardando as fotos dos convidados...
            </h2>
            <p className="text-xs text-sage-800/80 leading-relaxed">
              Aponte a câmera do seu celular para o QR Code acima para tirar uma
              foto agora e aparecer no telão!
            </p>
          </div>
        )}
      </main>

      {/* Bottom Thumbnails Strip & Real Scannable QR Code Callout */}
      <footer className="shrink-0 relative z-20 px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-t from-[#142017]/95 via-[#142017]/60 to-transparent">
        {/* Thumbnails row */}
        <div className="flex items-center gap-2.5 overflow-x-auto max-w-2xl py-1 scrollbar-none">
          {posts.slice(0, 10).map((post, idx) => (
            <button
              key={post.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-gold-400 scale-105 shadow-lg shadow-gold-500/20 ring-2 ring-gold-400/40'
                  : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/40'
              }`}
            >
              <img
                src={post.mediaUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {/* Real Scannable QR Code Invitation Card */}
        <button
          type="button"
          onClick={() => setIsQrModalOpen(true)}
          title="Clique para ampliar o QR Code"
          className="flex items-center gap-3.5 bg-[#FAF8F5] hover:bg-white text-sage-900 px-4 py-2.5 rounded-2xl border border-gold-400/60 shadow-xl shrink-0 transition-transform hover:scale-[1.02] cursor-pointer text-left"
        >
          <div className="p-1 rounded-xl bg-white border border-sage-200 shrink-0 shadow-2xs">
            <QrCodeSvg value={captureUrl} size={56} />
          </div>
          <div>
            <p className="text-xs font-bold font-serif text-sage-900 flex items-center gap-1">
              <span>Participe do Mural</span>
              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
            </p>
            <p className="text-[11px] text-sage-800/80 font-sans">
              Aponte a câmera para o QR Code e envie sua foto!
            </p>
          </div>
        </button>
      </footer>

      {/* Expandable Giant QR Code Modal for Projector */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsQrModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] text-sage-900 rounded-3xl p-8 max-w-md w-full text-center space-y-5 border-2 border-gold-400 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-sage-200/60 text-sage-800 transition-colors"
              aria-label="Fechar QR Code"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-500">
                Casamento Thiago &amp; Priscila
              </span>
              <h3 className="font-serif text-2xl font-bold text-sage-900">
                Envie sua Foto para o Telão!
              </h3>
              <p className="text-xs text-sage-800/75">
                Escaneie o código abaixo com a câmera do seu celular:
              </p>
            </div>

            <div className="inline-block p-4 bg-white rounded-3xl border border-sage-200 shadow-md">
              <QrCodeSvg value={captureUrl} size={240} />
            </div>

            <p className="text-[11px] font-mono text-sage-800/70 break-all">
              {captureUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
