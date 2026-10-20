import {
  ArrowLeft,
  Award,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  QrCode,
  Quote,
  ShieldAlert,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import { getAdminAuthService } from '@/services/admin-auth.factory'
import {
  getPostRepository,
  getRealtimeService,
} from '@/services/repositories.factory'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'
import type { Post } from '@/types/domain'

const SLIDESHOW_INTERVAL_MS = 8000
const FALLBACK_POLL_INTERVAL_MS = 30000

export function ProjectorPage() {
  const adminAuth = getAdminAuthService()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() =>
    adminAuth.getCurrentUser()
  )
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true)

  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [newPostAlert, setNewPostAlert] = useState<Post | null>(null)

  const controlsTimeoutRef = useRef<number | null>(null)
  const postRepo = getPostRepository()
  const realtimeService = getRealtimeService()

  const captureUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/capture`
      : 'https://casamento-thiago-e-priscila.vercel.app/capture'

  useEffect(() => {
    document.title = 'Telão Ao Vivo | Casamento de Thiago & Priscila'
  }, [])

  useEffect(() => {
    let isMounted = true

    adminAuth.checkSession().then((hasSession) => {
      if (isMounted) {
        setAdminUser(hasSession ? adminAuth.getCurrentUser() : null)
        setIsVerifyingAuth(false)
      }
    })

    const unsubscribe = adminAuth.onAuthStateChange((user) => {
      if (isMounted) {
        setAdminUser(user)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [adminAuth])

  const isAuthorized = Boolean(
    adminUser && (adminUser.role === 'admin' || adminUser.role === 'moderator')
  )

  // Initial load & fallback polling (only when authorized)
  useEffect(() => {
    if (!isAuthorized) return
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
  }, [postRepo, isAuthorized])

  // Realtime subscription (only when authorized)
  useEffect(() => {
    if (!isAuthorized) return

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
  }, [realtimeService, isAuthorized])

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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handlePrevSlide = useCallback(() => {
    if (posts.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)
  }, [posts.length])

  const handleNextSlide = useCallback(() => {
    if (posts.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % posts.length)
  }, [posts.length])

  // Keyboard shortcuts for projector operator (Arrows, Space, F, Q)
  useEffect(() => {
    if (!isAuthorized) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevSlide()
      } else if (e.key === 'ArrowRight') {
        handleNextSlide()
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused((prev) => !prev)
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'Escape' && isQrModalOpen) {
        setIsQrModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAuthorized, handlePrevSlide, handleNextSlide, toggleFullscreen, isQrModalOpen])

  const currentPost = posts[currentIndex]

  const totalLikesCount = useMemo(
    () => posts.reduce((acc, post) => acc + post.likesCount, 0),
    [posts]
  )

  const topContributors = useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatarUrl: string | null; count: number; likes: number }
    >()
    for (const post of posts) {
      const key = post.authorName.trim().toLowerCase()
      if (!key) continue
      const existing = map.get(key) ?? {
        name: post.authorName.trim(),
        avatarUrl: post.authorAvatarUrl ?? null,
        count: 0,
        likes: 0,
      }
      if (!existing.avatarUrl && post.authorAvatarUrl) {
        existing.avatarUrl = post.authorAvatarUrl
      }
      existing.count += 1
      existing.likes += post.likesCount
      map.set(key, existing)
    }
    return Array.from(map.values())
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.likes - a.likes))
      .slice(0, 3)
  }, [posts])

  if (isVerifyingAuth) {
    return (
      <div className="h-dvh w-full bg-[#09120C] text-sage-50 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
        <p className="text-sm text-sage-200/80 font-medium">
          Verificando credenciais de acesso ao Telão...
        </p>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="h-dvh w-full bg-[#09120C] text-sage-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#FAF8F5] text-sage-900 rounded-3xl p-7 shadow-2xl border border-gold-400/40 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-600">
              Acesso Restrito
            </span>
            <h1 className="font-serif text-2xl font-bold text-sage-900">
              Modo Telão Bloqueado
            </h1>
            <p className="text-sm text-sage-800/75 leading-relaxed">
              O acesso à exibição do telão é exclusivo para{' '}
              <strong className="font-semibold text-sage-900">
                Administradores
              </strong>{' '}
              e{' '}
              <strong className="font-semibold text-sage-900">
                Moderadores
              </strong>{' '}
              autenticados.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <Link
              to="/admin"
              className="w-full py-3 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Lock className="w-4 h-4 text-gold-400" />
              <span>Entrar como Admin / Moderador</span>
            </Link>

            <Link
              to="/"
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-sage-100 text-sage-800 border border-sage-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para o Feed</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="h-dvh w-full bg-[#070E0A] text-white overflow-hidden relative select-none flex flex-col justify-between"
    >
      {/* Dynamic Full-Bleed Ambient Photo Aura */}
      {currentPost && (
        <div
          key={`bg-${currentPost.id}`}
          className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000"
        >
          <img
            src={currentPost.mediaUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover scale-125 blur-[90px] opacity-30 saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#070E0A]/90 via-[#0E1C13]/75 to-[#070E0A]/95" />
        </div>
      )}

      {/* Luxury Golden Bokeh & Ornamental Stage Frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          style={{ animation: 'projectorFloatSlow 14s ease-in-out infinite' }}
          className="absolute -top-28 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gold-400/12 blur-[120px]"
        />
        <div
          style={{
            animation: 'projectorFloatSlow 18s ease-in-out infinite reverse',
          }}
          className="absolute -bottom-36 right-1/4 w-[38rem] h-[38rem] rounded-full bg-emerald-500/10 blur-[130px]"
        />
        {/* Outer Fine-Art Hairline Border */}
        <div className="absolute inset-2.5 lg:inset-3.5 rounded-[1.75rem] border border-gold-400/20 pointer-events-none" />
      </div>

      {/* Celebratory New Photo Live Alert Banner */}
      {newPostAlert && (
        <aside
          aria-live="polite"
          className="fixed top-20 inset-x-0 z-50 flex justify-center animate-in slide-in-from-top-6 duration-500 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-[#8C704B] via-[#E5C99B] to-[#8C704B] text-[#09120C] px-8 py-3.5 rounded-full shadow-[0_0_50px_rgba(197,168,128,0.65)] flex items-center gap-3.5 font-bold text-base border-2 border-white">
            <Sparkles className="w-5 h-5 animate-spin text-[#09120C]" />
            <span>
              ✨ Nova foto ao vivo enviada por{' '}
              <strong className="underline decoration-[#09120C]/40">
                {newPostAlert.authorName}
              </strong>
              !
            </span>
          </div>
        </aside>
      )}

      {/* Unified 12-Column Asymmetric Bento Grid Wrapper (Small, Symmetric 12px Gaps) */}
      <div className="relative z-10 w-full max-w-[1840px] h-full mx-auto p-4 lg:p-6 flex flex-col gap-3 min-h-0">
        {/* ROW 1: Top Royal Cinema Header (Aligned 8 Cols + 4 Cols) */}
        <header className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left 8 Columns: Brand Monogram & Live Event Metrics */}
          <div className="lg:col-span-8 h-16 px-4 lg:px-5 rounded-2xl bg-white/[0.05] border border-gold-400/25 backdrop-blur-xl flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5 min-w-0">
              {isControlsVisible && (
                <Link
                  to="/admin"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 shrink-0"
                  title="Voltar ao Painel Administrativo"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              )}

              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-gold-500 to-gold-400 opacity-50 blur-2xs" />
                <img
                  src="/favicon.svg"
                  alt="Monograma Thiago & Priscila"
                  className="relative w-10 h-10 rounded-xl shadow-md border border-gold-400/50"
                />
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <h1 className="font-serif text-xl lg:text-2xl font-bold tracking-wide text-white truncate">
                  Thiago <span className="text-gold-400 font-normal">&amp;</span>{' '}
                  Priscila
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold uppercase tracking-widest text-emerald-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Ao Vivo</span>
                </span>
              </div>
            </div>

            {/* Event Stats inside Left Header Box */}
            <div className="hidden md:flex items-center gap-3 text-xs shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/35 border border-white/10">
                <Camera className="w-3.5 h-3.5 text-gold-400" />
                <span className="font-bold text-white">{posts.length}</span>
                <span className="text-white/65">fotos</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/35 border border-white/10">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span className="font-bold text-white">{totalLikesCount}</span>
                <span className="text-white/65">curtidas</span>
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Mural Status & Operator Controls */}
          <div className="hidden lg:flex lg:col-span-4 h-16 px-5 rounded-2xl bg-white/[0.05] border border-gold-400/25 backdrop-blur-xl items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
              <span className="text-xs uppercase tracking-[0.2em] text-gold-400 font-bold truncate">
                Mural Oficial da Festa
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 transition-opacity duration-300 ${
                isControlsVisible
                  ? 'opacity-100'
                  : 'opacity-40 hover:opacity-100'
              }`}
            >
              {posts.length > 1 && (
                <div className="flex items-center gap-0.5 bg-black/35 border border-white/10 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
                    title="Foto anterior (←)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaused((prev) => !prev)}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-gold-400 transition-colors cursor-pointer"
                    title={
                      isPaused
                        ? 'Retomar apresentação (Espaço)'
                        : 'Pausar apresentação (Espaço)'
                    }
                  >
                    {isPaused ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
                    title="Próxima foto (→)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="p-2 rounded-xl bg-gold-400/20 hover:bg-gold-400/35 text-gold-400 transition-colors border border-gold-400/40 cursor-pointer"
                title="Ampliar QR Code Gigante na tela"
              >
                <QrCode className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15 cursor-pointer"
                title={
                  isFullscreen ? 'Sair da Tela Cheia (F)' : 'Modo Tela Cheia (F)'
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ROW 2: Main Grand Stage (Aligned 8 Cols + 4 Cols with gap-3) */}
        <main className="flex-1 min-h-0 w-full flex items-stretch overflow-hidden">
          {currentPost ? (
            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              {/* LEFT 8 COLUMNS: Hero Fine-Art Photo Stage */}
              <div className="lg:col-span-8 h-full min-h-0 flex flex-col">
                <div className="relative flex-1 min-h-0 w-full rounded-2xl overflow-hidden bg-[#050A07] border-2 border-gold-400/45 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] flex items-center justify-center group">
                  {/* Inner Golden Hairline Frame */}
                  <div className="absolute inset-2 rounded-xl border border-gold-400/20 pointer-events-none z-20" />

                  {/* Color-Matched Blurred Canvas Backdrop inside Frame */}
                  <img
                    key={`backdrop-${currentPost.id}`}
                    src={currentPost.mediaUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-110 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/70 pointer-events-none" />

                  {/* Floating Top-Left Live Counter Badge */}
                  <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 shadow-lg">
                    <Camera className="w-3.5 h-3.5 text-gold-400" />
                    <span>
                      Foto {currentIndex + 1} de {posts.length}
                    </span>
                    <span className="text-white/35">•</span>
                    <span className="text-white/75">
                      {new Date(currentPost.createdAt).toLocaleTimeString(
                        'pt-BR',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  </div>

                  {/* Floating Top-Right Challenge Badge */}
                  {currentPost.challenge && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-gold-500/95 to-gold-400/95 text-[#09120C] text-xs font-extrabold shadow-[0_8px_25px_rgba(197,168,128,0.45)] border border-white/50">
                      <Trophy className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {currentPost.challenge.icon}{' '}
                        {currentPost.challenge.title}
                      </span>
                    </div>
                  )}

                  {/* Main Uncropped High-Resolution Guest Photo */}
                  <img
                    key={currentPost.id}
                    src={currentPost.mediaUrl}
                    alt={
                      currentPost.caption ||
                      `Foto por ${currentPost.authorName}`
                    }
                    className="relative z-10 w-full h-full max-h-[calc(100dvh-12.5rem)] object-contain p-3 sm:p-4 drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-700"
                  />

                  {/* Animated Golden Slideshow Progress Bar */}
                  {posts.length > 1 && !isPaused && (
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/10 z-30 overflow-hidden">
                      <div
                        key={`progress-${currentPost.id}-${currentIndex}`}
                        style={{
                          animation: `projectorProgress ${SLIDESHOW_INTERVAL_MS}ms linear forwards`,
                        }}
                        className="h-full w-full origin-left bg-gradient-to-r from-gold-500 via-gold-400 to-[#F3E3C3]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT 4 COLUMNS: Luxury Editorial Spotlight + Scannable QR Card (gap-3) */}
              <div className="lg:col-span-4 h-full min-h-0 flex flex-col gap-3">
                {/* 1. Guest Spotlight & Romantic Quote Card */}
                <div className="shrink-0 bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE6] text-sage-900 rounded-2xl p-5 xl:p-6 shadow-2xl border-2 border-gold-400/60 flex flex-col relative overflow-hidden">
                  {/* Decorative Watermark Quote Icon */}
                  <Quote className="w-24 h-24 text-gold-400/12 absolute -top-2 -right-2 -rotate-12 pointer-events-none" />

                  <div className="space-y-3.5 relative z-10 flex flex-col">
                    {/* Author Header */}
                    <div className="flex items-center gap-3.5">
                      <div className="p-1 rounded-full bg-gradient-to-tr from-gold-500 to-gold-400 shadow-md shrink-0">
                        <AuthorAvatar
                          name={currentPost.authorName}
                          avatarUrl={currentPost.authorAvatarUrl}
                          size="lg"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gold-500 font-extrabold block">
                          Momento Registrado Por
                        </span>
                        <h2 className="font-serif text-2xl xl:text-3xl font-bold text-sage-900 tracking-tight truncate mt-0.5">
                          {currentPost.authorName}
                        </h2>
                      </div>
                    </div>

                    {/* Ornamental Divider */}
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-gold-400/60 to-transparent" />
                      <Sparkles className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                      <div className="h-px flex-1 bg-gradient-to-l from-gold-400/60 to-transparent" />
                    </div>

                    {/* Caption / Dedication */}
                    <div>
                      {currentPost.caption ? (
                        <blockquote className="font-serif italic text-lg xl:text-2xl text-sage-900 leading-relaxed line-clamp-4">
                          &ldquo;{currentPost.caption}&rdquo;
                        </blockquote>
                      ) : (
                        <p className="font-serif italic text-base xl:text-xl text-sage-800/75 leading-relaxed">
                          &ldquo;Celebrando o amor e a alegria do grande dia de
                          Thiago &amp; Priscila! ✨💍&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Likes & Challenge Footer inside Editorial Card */}
                  <div className="pt-3.5 mt-4 border-t border-sage-200/90 flex items-center justify-between relative z-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span className="text-sm font-extrabold text-sage-900">
                        {currentPost.likesCount}{' '}
                        {currentPost.likesCount === 1 ? 'curtida' : 'curtidas'}
                      </span>
                    </div>

                    {topContributors.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sage-800/80">
                        <Award className="w-4 h-4 text-gold-500" />
                        <span>
                          Líder: {topContributors[0].name.split(' ')[0]} (
                          {topContributors[0].count} 📷)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Prominent Scannable QR Code Call-To-Action Card */}
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  title="Clique para abrir o QR Code em tela cheia"
                  className="w-full bg-gradient-to-r from-[#13261B] via-[#193123] to-[#13261B] hover:from-[#183022] hover:to-[#183022] text-white rounded-2xl p-4 border border-gold-400/45 shadow-xl flex items-center gap-4 text-left transition-all hover:scale-[1.005] cursor-pointer shrink-0 group"
                >
                  <div className="p-2 rounded-xl bg-white shadow-lg shrink-0 border-2 border-gold-400 group-hover:scale-105 transition-transform">
                    <QrCodeSvg value={captureUrl} size={88} />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gold-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Apareça no Telão Agora</span>
                    </div>
                    <h3 className="font-serif text-base xl:text-lg font-bold text-white leading-snug">
                      Escaneie o QR Code com sua câmera!
                    </h3>
                    <p className="text-xs text-sage-200/80 leading-relaxed line-clamp-2">
                      Tire uma foto ou cumpra os desafios da festa para entrar
                      ao vivo neste mural.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Empty State Waiting for First Photo */
            <div className="m-auto text-center space-y-6 bg-[#FAF8F5] text-sage-900 p-10 lg:p-12 rounded-3xl shadow-2xl border-2 border-gold-400/60 max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/20 text-gold-500 text-xs font-extrabold uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                <span>Mural Ao Vivo Pronto</span>
              </div>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-3xl border-2 border-gold-400 shadow-lg">
                  <QrCodeSvg value={captureUrl} size={180} />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-3xl font-bold text-sage-900">
                  Aguardando o primeiro clique da noite!
                </h2>
                <p className="text-sm text-sage-800/80 leading-relaxed">
                  Aponte a câmera do seu celular para o QR Code acima para
                  enviar sua foto e estrear o telão de Thiago &amp; Priscila!
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ROW 3: Bottom Dock (Aligned 8 Cols Filmstrip + 4 Cols Leaderboard with gap-3) */}
        <footer className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left 8 Columns: Recent Photos Filmstrip (Matches Hero Photo Stage Width) */}
          <div className="lg:col-span-8 h-[4.5rem] px-4 rounded-2xl bg-white/[0.05] border border-gold-400/25 backdrop-blur-xl flex items-center gap-2.5 overflow-x-auto scrollbar-none shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400 pr-1 shrink-0 hidden sm:inline">
              Recentes
            </span>
            {posts.slice(0, 14).map((post, idx) => (
              <button
                key={post.id}
                onClick={() => setCurrentIndex(idx)}
                title={`Foto de ${post.authorName}`}
                className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  idx === currentIndex
                    ? 'border-gold-400 scale-105 shadow-[0_0_16px_rgba(197,168,128,0.5)] ring-2 ring-gold-400/40 z-10'
                    : 'border-white/15 opacity-55 hover:opacity-100 hover:border-white/40'
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

          {/* Right 4 Columns: Top 3 Photographers Podium (Matches Editorial/QR Column Width) */}
          <div className="hidden lg:flex lg:col-span-4 h-[4.5rem] px-5 rounded-2xl bg-white/[0.05] border border-gold-400/25 backdrop-blur-xl items-center justify-between gap-3 shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-1.5 shrink-0">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Top Fotógrafos</span>
            </span>

            {topContributors.length > 0 ? (
              <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                {topContributors.map((person, idx) => {
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div
                      key={person.name}
                      className="flex items-center gap-1 text-xs font-semibold text-white/90 min-w-0"
                    >
                      <span className="shrink-0">{medals[idx]}</span>
                      <span className="truncate max-w-[85px]">
                        {person.name.split(' ')[0]}
                      </span>
                      <span className="text-gold-400 font-bold shrink-0">
                        ({person.count})
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <span className="text-xs text-white/60 italic truncate">
                Envie fotos para liderar o ranking!
              </span>
            )}
          </div>
        </footer>
      </div>

      {/* Expandable Giant QR Code Modal for Projector */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsQrModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] text-sage-900 rounded-[2.5rem] p-8 lg:p-10 max-w-lg w-full text-center space-y-6 border-2 border-gold-400 shadow-[0_0_80px_rgba(197,168,128,0.4)] relative"
          >
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-5 right-5 p-2.5 rounded-full hover:bg-sage-200/60 text-sage-800 transition-colors cursor-pointer"
              aria-label="Fechar QR Code"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-gold-500">
                Casamento Thiago &amp; Priscila
              </span>
              <h3 className="font-serif text-3xl font-bold text-sage-900">
                Envie sua Foto para o Telão!
              </h3>
              <p className="text-sm text-sage-800/75">
                Escaneie o código abaixo com a câmera do seu celular:
              </p>
            </div>

            <div className="inline-block p-5 bg-white rounded-3xl border-2 border-gold-400 shadow-lg">
              <QrCodeSvg value={captureUrl} size={260} />
            </div>

            <p className="text-xs font-mono text-sage-800/70 break-all">
              {captureUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
