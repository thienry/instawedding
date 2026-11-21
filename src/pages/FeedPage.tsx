import {
  ArrowUp,
  Award,
  Camera,
  CloudUpload,
  Download,
  Flame,
  Heart,
  LayoutGrid,
  LayoutList,
  Loader2,
  LogOut,
  Maximize2,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  User,
  WifiOff,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { FeedVideoPlayer } from '@/components/common/FeedVideoPlayer'
import { GuestNameModal } from '@/components/common/GuestNameModal'
import { PhotoLightboxModal } from '@/components/common/PhotoLightboxModal'
import { ProgressiveImage } from '@/components/common/ProgressiveImage'
import { TermsModal } from '@/components/common/TermsModal'
import { useFeedNotifications } from '@/hooks/useFeedNotifications'
import { FeedNotificationService } from '@/services/feed-notification.service'
import { getGuestAuthService } from '@/services/guest-auth.factory'
import {
  OfflineQueueService,
  type BackgroundUploadTask,
} from '@/services/offline-queue.service'
import { getPostRepository } from '@/services/repositories.factory'
import { getGuestSession } from '@/utils/session'
import { resolvePostMediaType } from '@/utils/video'

import type { GuestUser, Post } from '@/types/domain'

type FeedFilterTab = 'all' | 'most-liked' | 'challenges' | 'mine'
type FeedViewMode = 'list' | 'grid'

const INITIAL_VISIBLE_POSTS = 12
const VISIBLE_POSTS_STEP = 10

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / (1000 * 60))
    if (diffMin < 1) return 'Agora mesmo'
    if (diffMin < 60) return `há ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `há ${diffHours} h`
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return ''
  }
}

export function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const challengeFilterParam = searchParams.get('challengeId')
  const challengeFilterId = challengeFilterParam
    ? Number(challengeFilterParam)
    : null
  const lightboxPostId = searchParams.get('photoId')

  const {
    stagedPosts,
    unseenAwayPostIds,
    totalUnreadCount,
    latestAuthors,
  } = useFeedNotifications()

  const [posts, setPosts] = useState<Post[]>([])
  const [recentlyRevealedIds, setRecentlyRevealedIds] = useState<Set<string>>(
    new Set()
  )
  const [pendingUploads, setPendingUploads] = useState<BackgroundUploadTask[]>(
    []
  )
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_POSTS)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<FeedFilterTab>('all')
  const [viewMode, setViewMode] = useState<FeedViewMode>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(
    undefined
  )
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(
    null
  )
  const [heartBurstPostId, setHeartBurstPostId] = useState<string | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [guestUser, setGuestUser] = useState<GuestUser | null>(() =>
    getGuestAuthService().getCurrentGuest()
  )
  const [isSigningIn, setIsSigningIn] = useState(false)

  const lastTapMapRef = useRef<Map<string, number>>(new Map())
  const touchStartYRef = useRef<number | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)

  const PULL_THRESHOLD = 68
  const MAX_PULL_DISTANCE = 115

  const session = getGuestSession()
  const guestAuthService = getGuestAuthService()
  const postRepo = getPostRepository()

  const effectiveSessionId = guestUser?.id ?? session.sessionId

  const handleDirectGoogleLogin = async () => {
    setIsSigningIn(true)
    try {
      const result = await guestAuthService.signInWithGoogle('/')
      if (result.user) {
        setGuestUser(result.user)
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  useEffect(() => {
    setGuestUser(guestAuthService.getCurrentGuest())

    const unsubscribeAuth = guestAuthService.onAuthStateChange((user) => {
      setGuestUser(user)
    })

    return () => {
      unsubscribeAuth()
    }
  }, [guestAuthService])

  const handleRevealNewPosts = useCallback(() => {
    const { stagedPosts: revealedPosts, revealedPostIds } =
      FeedNotificationService.consumeStagedAndMarkSeen(posts)

    if (revealedPosts.length > 0) {
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const uniqueNew = revealedPosts.filter((p) => !existingIds.has(p.id))
        return [...uniqueNew, ...prev]
      })
    }

    setRecentlyRevealedIds((prev) => {
      const next = new Set(prev)
      for (const id of revealedPostIds) {
        next.add(id)
      }
      return next
    })

    if (activeTab !== 'all') {
      setActiveTab('all')
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab, posts])

  const handleDismissNotifications = useCallback(() => {
    const { stagedPosts: revealedPosts, revealedPostIds } =
      FeedNotificationService.consumeStagedAndMarkSeen(posts)

    if (revealedPosts.length > 0) {
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const uniqueNew = revealedPosts.filter((p) => !existingIds.has(p.id))
        return [...uniqueNew, ...prev]
      })
    }

    setRecentlyRevealedIds((prev) => {
      const next = new Set(prev)
      for (const id of revealedPostIds) {
        next.add(id)
      }
      return next
    })
  }, [posts])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [fetchedPosts, likedSet] = await Promise.all([
        postRepo.getPosts(),
        guestUser
          ? postRepo.getLikedPostIds(effectiveSessionId)
          : Promise.resolve(new Set<string>()),
      ])
      const { revealedPostIds } =
        FeedNotificationService.consumeStagedAndMarkSeen(fetchedPosts)
      setRecentlyRevealedIds((prev) => {
        const next = new Set(prev)
        for (const id of revealedPostIds) {
          next.add(id)
        }
        return next
      })
      setPosts(fetchedPosts)
      setLikedPostIds(likedSet)
    } catch {
      // Ignore refresh error
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
    }
  }, [effectiveSessionId, guestUser, postRepo])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 5 || isRefreshing) {
      touchStartYRef.current = null
      return
    }
    const firstTouch = event.touches[0]
    if (!firstTouch) return
    touchStartYRef.current = firstTouch.clientY
    setIsPulling(true)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null || isRefreshing) return
    if (window.scrollY > 5) {
      touchStartYRef.current = null
      setIsPulling(false)
      setPullDistance(0)
      return
    }

    const currentTouch = event.touches[0]
    if (!currentTouch) return
    const deltaY = currentTouch.clientY - touchStartYRef.current

    if (deltaY <= 0) {
      setPullDistance(0)
      return
    }

    // Damped elastic curve for natural mobile pull feel
    const dampedDistance = Math.min(MAX_PULL_DISTANCE, Math.round(deltaY * 0.45))
    setPullDistance(dampedDistance)
  }

  const handleTouchEnd = () => {
    if (touchStartYRef.current === null) return
    touchStartYRef.current = null
    setIsPulling(false)

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15)
        } catch {
          // Ignore vibration errors on unsupported browsers
        }
      }
      setPullDistance(56)
      void handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  useEffect(() => {
    let isMounted = true

    Promise.all([
      postRepo.getPosts(),
      guestUser
        ? postRepo.getLikedPostIds(effectiveSessionId)
        : Promise.resolve(new Set<string>()),
    ])
      .then(([fetchedPosts, likedSet]) => {
        if (!isMounted) return
        FeedNotificationService.syncWithFetchedPosts(fetchedPosts)
        setPosts(fetchedPosts)
        setLikedPostIds(likedSet)
        setIsLoading(false)
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    // Ensure global notification listener is active
    FeedNotificationService.initialize()

    // Subscribe to optimistic background upload queue
    const unsubscribeQueue = OfflineQueueService.subscribe((tasks) => {
      if (isMounted) {
        setPendingUploads(tasks)
      }
    })

    const unsubscribePublished = OfflineQueueService.onPostPublished(
      (publishedPost) => {
        if (!isMounted) return
        FeedNotificationService.registerOwnPublishedPost(publishedPost)
        setPosts((prev) => {
          if (prev.some((p) => p.id === publishedPost.id)) return prev
          return [publishedPost, ...prev]
        })
      }
    )

    return () => {
      isMounted = false
      unsubscribeQueue()
      unsubscribePublished()
    }
  }, [effectiveSessionId, guestUser, postRepo])

  const handleToggleLike = useCallback(
    async (postId: string) => {
      if (!guestUser) {
        setAuthModalReason(
          'Conecte sua conta Google para curtir as fotos da festa.'
        )
        setIsNameModalOpen(true)
        return
      }

      const isCurrentlyLiked = likedPostIds.has(postId)

      // Optimistic UI update
      setLikedPostIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyLiked) next.delete(postId)
        else next.add(postId)
        return next
      })

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          const newCount = isCurrentlyLiked
            ? Math.max(0, p.likesCount - 1)
            : p.likesCount + 1
          return { ...p, likesCount: newCount }
        })
      )

      try {
        const result = await postRepo.toggleLike(postId, effectiveSessionId)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likesCount: result.likesCount } : p
          )
        )
      } catch {
        // Rollback on failure
        setLikedPostIds((prev) => {
          const next = new Set(prev)
          if (isCurrentlyLiked) next.add(postId)
          else next.delete(postId)
          return next
        })
      }
    },
    [effectiveSessionId, guestUser, likedPostIds, postRepo]
  )

  const handlePhotoTap = (post: Post) => {
    const now = Date.now()
    const lastTap = lastTapMapRef.current.get(post.id) ?? 0
    if (now - lastTap < 320) {
      lastTapMapRef.current.set(post.id, 0)
      if (!guestUser) {
        setAuthModalReason(
          'Conecte sua conta Google para curtir as fotos da festa.'
        )
        setIsNameModalOpen(true)
        return
      }
      setHeartBurstPostId(post.id)
      window.setTimeout(() => {
        setHeartBurstPostId((prev) => (prev === post.id ? null : prev))
      }, 750)
      if (!likedPostIds.has(post.id)) {
        void handleToggleLike(post.id)
      }
    } else {
      lastTapMapRef.current.set(post.id, now)
    }
  }

  const handleDownloadPost = async (post: Post) => {
    try {
      const response = await fetch(post.mediaUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      const safeAuthor = post.authorName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
      const ext = resolvePostMediaType(post) === 'video' ? 'mp4' : 'webp'
      link.download = `casamento-thiago-e-priscila-${safeAuthor}-${post.id.slice(0, 6)}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(post.mediaUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleOpenLightbox = useCallback(
    (postId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('photoId', postId)
        return next
      })
    },
    [setSearchParams]
  )

  const handleCloseLightbox = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('photoId')
      return next
    })
  }, [setSearchParams])

  const handleSharePost = async (post: Post) => {
    const shareTitle = 'Casamento de Thiago & Priscila'
    const shareText = post.caption
      ? `Foto de ${post.authorName}: "${post.caption}"`
      : `Foto de ${post.authorName} no casamento de Thiago & Priscila!`
    const shareUrl = `${window.location.origin}/?photoId=${encodeURIComponent(post.id)}`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setShareToastMessage('Link da foto copiado!')
        window.setTimeout(() => {
          setShareToastMessage(null)
        }, 2800)
        return
      } catch {
        // Fallback to download if clipboard access is denied
      }
    }

    await handleDownloadPost(post)
  }

  const handleConfirmDelete = async () => {
    if (!postToDelete) return
    setIsDeleting(true)
    try {
      await postRepo.deletePost(postToDelete.id)
      FeedNotificationService.removePost(postToDelete.id)
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id))
      setLikedPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postToDelete.id)
        return next
      })
      if (lightboxPostId === postToDelete.id) {
        handleCloseLightbox()
      }
      setPostToDelete(null)
    } catch {
      alert('Não foi possível excluir a publicação. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredPosts = useMemo(() => {
    let list = [...posts]

    if (challengeFilterId !== null && !Number.isNaN(challengeFilterId)) {
      list = list.filter((p) => p.challengeId === challengeFilterId)
    }

    if (activeTab === 'challenges') {
      list = list.filter((p) => Boolean(p.challengeId))
    } else if (activeTab === 'mine') {
      list = list.filter(
        (p) =>
          (guestUser && p.clientSessionId === guestUser.id) ||
          (Boolean(p.clientSessionId) &&
            p.clientSessionId === session.sessionId) ||
          (guestUser &&
            p.authorName.trim().toLowerCase() ===
              guestUser.name.trim().toLowerCase())
      )
    } else if (activeTab === 'most-liked') {
      list.sort((a, b) => b.likesCount - a.likesCount)
    }

    return list
  }, [posts, challengeFilterId, activeTab, session.sessionId, guestUser])

  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  )

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_POSTS)
  }, [activeTab, challengeFilterId])

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || visibleCount >= filteredPosts.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(filteredPosts.length, prev + VISIBLE_POSTS_STEP)
          )
        }
      },
      { rootMargin: '800px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, filteredPosts.length])

  const activeChallengeObj = useMemo(() => {
    if (challengeFilterId === null) return null
    return posts.find((p) => p.challengeId === challengeFilterId)?.challenge
  }, [posts, challengeFilterId])

  const lightboxPost = useMemo(
    () => posts.find((p) => p.id === lightboxPostId) ?? null,
    [posts, lightboxPostId]
  )

  const totalLikesCount = useMemo(
    () => posts.reduce((acc, p) => acc + p.likesCount, 0),
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
      const current = map.get(key) ?? {
        name: post.authorName.trim(),
        avatarUrl: post.authorAvatarUrl ?? null,
        count: 0,
        likes: 0,
      }
      if (!current.avatarUrl && post.authorAvatarUrl) {
        current.avatarUrl = post.authorAvatarUrl
      }
      current.count += 1
      current.likes += post.likesCount
      map.set(key, current)
    }
    return Array.from(map.values())
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.likes - a.likes))
      .slice(0, 3)
  }, [posts])

  const pullProgress = Math.min(1, pullDistance / PULL_THRESHOLD)

  return (
    <div
      className="p-4 sm:p-6 lg:p-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Mobile Pull-to-Refresh Animated Indicator */}
      <div
        aria-live="polite"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : '0px',
          opacity: pullDistance > 8 ? Math.min(1, pullDistance / 42) : 0,
        }}
        className={`md:hidden flex items-center justify-center overflow-hidden ${
          isPulling ? '' : 'transition-all duration-300 ease-out'
        }`}
      >
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-sage-200 shadow-sm text-xs font-semibold text-sage-900">
          <RefreshCw
            style={
              !isRefreshing
                ? { transform: `rotate(${Math.round(pullProgress * 360)}deg)` }
                : undefined
            }
            className={`w-4 h-4 text-gold-500 ${
              isRefreshing ? 'animate-spin' : 'transition-transform duration-75'
            }`}
          />
          <span>
            {isRefreshing
              ? 'Atualizando mural...'
              : pullDistance >= PULL_THRESHOLD
                ? 'Solte para atualizar'
                : 'Puxe para atualizar'}
          </span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Action & View Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => {
                if (guestUser) {
                  setAuthModalReason(undefined)
                  setIsNameModalOpen(true)
                } else {
                  void handleDirectGoogleLogin()
                }
              }}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-sage-200/90 text-sm text-sage-900 hover:bg-sage-100 disabled:opacity-60 font-semibold transition-colors shadow-2xs"
            >
              {guestUser ? (
                <>
                  <AuthorAvatar
                    name={guestUser.name}
                    avatarUrl={guestUser.avatarUrl}
                    size="sm"
                  />
                  <span className="truncate max-w-44">
                    Olá, {guestUser.name.split(' ')[0]}
                  </span>
                  <LogOut className="w-3.5 h-3.5 text-sage-800/50 ml-0.5" />
                </>
              ) : (
                <>
                  {isSigningIn ? (
                    <Loader2 className="w-4 h-4 text-sage-800 animate-spin" />
                  ) : (
                    <User className="w-4 h-4 text-sage-800" />
                  )}
                  <span>
                    {isSigningIn ? 'Conectando...' : 'Entrar com Google'}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {/* View Mode Switcher (Editorial List vs 2-Col Grid) */}
              <div className="hidden sm:flex items-center bg-white border border-sage-200/90 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Visualização em Lista"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === 'list'
                      ? 'bg-sage-900 text-white shadow-2xs'
                      : 'text-sage-800 hover:bg-sage-100'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                  <span>Lista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Visualização em Grade"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-sage-900 text-white shadow-2xs'
                      : 'text-sage-800 hover:bg-sage-100'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Grade</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-sage-200/90 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-sage-900 text-white shadow-sm'
                  : 'bg-white text-sage-800 border border-sage-200 hover:bg-sage-100'
              }`}
            >
              Todas ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('most-liked')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'most-liked'
                  ? 'bg-sage-900 text-white shadow-sm'
                  : 'bg-white text-sage-800 border border-sage-200 hover:bg-sage-100'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Mais Curtidas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('challenges')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'challenges'
                  ? 'bg-sage-900 text-white shadow-sm'
                  : 'bg-white text-sage-800 border border-sage-200 hover:bg-sage-100'
              }`}
            >
              <Trophy className="w-4 h-4 text-gold-500" />
              <span>Desafios</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'mine'
                  ? 'bg-sage-900 text-white shadow-sm'
                  : 'bg-white text-sage-800 border border-sage-200 hover:bg-sage-100'
              }`}
            >
              <Camera className="w-4 h-4 text-sage-700" />
              <span>Minhas Fotos</span>
            </button>
          </div>

          {/* Active Challenge Filter Pill */}
          {challengeFilterId !== null && (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gold-400/15 border border-gold-400/35 text-sm text-sage-900">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-gold-500 shrink-0" />
                <span>
                  Filtrando por desafio:{' '}
                  {activeChallengeObj
                    ? `${activeChallengeObj.icon} ${activeChallengeObj.title}`
                    : `#${challengeFilterId}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  searchParams.delete('challengeId')
                  setSearchParams(searchParams)
                }}
                className="p-1.5 rounded-full hover:bg-gold-400/20 text-sage-800"
                title="Limpar filtro de desafio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Instagram-style Optimistic Background Upload Progress Cards */}
          {pendingUploads.length > 0 && (
            <div className="space-y-3">
              {pendingUploads.map((task) => {
                const isFailed = task.status === 'failed'
                const isOffline =
                  typeof navigator !== 'undefined' && !navigator.onLine

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl p-3.5 border border-sage-200/90 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative border border-sage-200">
                          <img
                            src={
                              task.mediaType === 'video'
                                ? task.blurDataUrl || '/favicon.svg'
                                : task.previewUrl ||
                                  task.blurDataUrl ||
                                  '/favicon.svg'
                            }
                            alt="Postando mídia"
                            className="w-full h-full object-cover"
                          />
                          {task.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-sage-900 truncate flex items-center gap-1.5">
                            {isOffline || isFailed ? (
                              <>
                                <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  {isOffline
                                    ? 'Aguardando sinal de rede móvel...'
                                    : 'Envio pausado na rede móvel'}
                                </span>
                              </>
                            ) : (
                              <>
                                <CloudUpload className="w-3.5 h-3.5 text-sage-700 shrink-0" />
                                <span>
                                  {task.mediaType === 'video'
                                    ? 'Postando seu vídeo...'
                                    : 'Postando sua foto...'}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-sage-800/70 truncate">
                            {task.caption
                              ? `"${task.caption}"`
                              : isOffline || isFailed
                                ? 'Salvo no aparelho — será enviado automaticamente'
                                : `${task.progress}% enviado`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(isFailed || isOffline) && (
                          <button
                            type="button"
                            onClick={() =>
                              void OfflineQueueService.retryTask(task.id)
                            }
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-sage-900 text-white hover:bg-sage-800 transition-colors"
                          >
                            Tentar agora
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            void OfflineQueueService.cancelTask(task.id)
                          }
                          title="Cancelar envio"
                          className="p-1.5 rounded-full text-sage-800/50 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Smooth Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-sage-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFailed || isOffline
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-sage-800 via-sage-700 to-gold-500'
                        }`}
                        style={{
                          width: `${Math.max(12, task.progress)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sticky Floating New Photos Notification Pill (Realtime & While-Away) */}
          {totalUnreadCount > 0 && (
            <div className="sticky top-16 md:top-4 z-20 flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="pointer-events-auto inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-sage-900/95 text-white shadow-xl border border-gold-400/40 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleRevealNewPosts}
                  className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold hover:text-gold-400 transition-colors cursor-pointer"
                >
                  {stagedPosts.length > 0 ? (
                    <span className="w-6 h-6 rounded-full bg-gold-400 text-sage-900 flex items-center justify-center shrink-0">
                      <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {latestAuthors.length > 0 && (
                    <div className="flex items-center -space-x-2 shrink-0">
                      {latestAuthors.map((author) => (
                        <div
                          key={author.name}
                          className="ring-2 ring-sage-900 rounded-full"
                        >
                          <AuthorAvatar
                            name={author.name}
                            avatarUrl={author.avatarUrl}
                            sizeClassName="w-6 h-6 text-[10px]"
                            fallbackClassName="bg-gold-400 text-sage-900"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <span>
                    {stagedPosts.length > 0
                      ? totalUnreadCount === 1
                        ? '1 nova foto postada'
                        : `${totalUnreadCount} novas fotos postada`
                      : totalUnreadCount === 1
                        ? '1 nova foto desde sua última visita'
                        : `${totalUnreadCount} novas fotos desde sua última visita`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDismissNotifications}
                  title="Marcar como vistas"
                  aria-label="Marcar novas fotos como vistas"
                  className="p-1 rounded-full text-white/65 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Feed Content */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl overflow-hidden border border-sage-200/70 shadow-xs animate-pulse"
                >
                  <div className="p-4 flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-full bg-sage-200" />
                    <div className="space-y-2 flex-1">
                      <div className="w-32 h-4 bg-sage-200 rounded-sm" />
                      <div className="w-20 h-3 bg-sage-100 rounded-sm" />
                    </div>
                  </div>
                  <div className="aspect-4/3 bg-sage-100" />
                  <div className="p-4 space-y-2.5">
                    <div className="w-16 h-5 bg-sage-200 rounded-sm" />
                    <div className="w-3/4 h-4 bg-sage-100 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-sage-200 text-center space-y-4 shadow-xs">
              <span className="text-4xl block">📷</span>
              <h3 className="font-serif text-xl font-bold text-sage-900">
                {posts.length === 0
                  ? 'Nenhuma foto postada ainda'
                  : 'Nenhuma foto encontrada neste filtro'}
              </h3>
              <p className="text-sm text-sage-800/75 max-w-md mx-auto leading-relaxed">
                {posts.length === 0
                  ? 'Seja o primeiro a registrar e compartilhar um momento especial da festa de Thiago & Priscila!'
                  : 'Experimente trocar a aba acima ou publique uma nova foto agora.'}
              </p>
              <Link
                to={
                  challengeFilterId !== null
                    ? `/capture?challengeId=${challengeFilterId}`
                    : '/capture'
                }
                className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-full bg-sage-900 text-white text-sm font-semibold hover:bg-sage-800 transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Foto Agora</span>
              </Link>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-6'
                    : 'space-y-6'
                }
              >
                {visiblePosts.map((post, index) => {
                  const isLiked = likedPostIds.has(post.id)
                  const isOwner =
                    (guestUser && post.clientSessionId === guestUser.id) ||
                    (Boolean(post.clientSessionId) &&
                      post.clientSessionId === session.sessionId)
                  const showHeartBurst = heartBurstPostId === post.id
                  const isNewPost =
                    unseenAwayPostIds.has(post.id) ||
                    recentlyRevealedIds.has(post.id)

                  return (
                    <article
                      key={post.id}
                      className={`bg-white rounded-3xl overflow-hidden border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                        isNewPost
                          ? 'border-gold-400/70 ring-1 ring-gold-400/25'
                          : 'border-sage-200/80'
                      }`}
                    >
                      <div>
                        {/* Author Header */}
                        <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <AuthorAvatar
                              name={post.authorName}
                              avatarUrl={post.authorAvatarUrl}
                              size="lg"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-bold text-sage-900 leading-tight truncate">
                                  {post.authorName}
                                </h4>
                                {isNewPost && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shrink-0">
                                    Nova
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-sage-800/65 block mt-0.5">
                                {formatRelativeTime(post.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {post.challenge && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSearchParams({
                                    challengeId: String(post.challenge!.id),
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gold-400/15 text-gold-500 border border-gold-400/35 hover:bg-gold-400/25 transition-colors"
                              >
                                <span className="text-sm">
                                  {post.challenge.icon}
                                </span>
                                <span className="max-w-36 truncate">
                                  {post.challenge.title}
                                </span>
                              </button>
                            )}

                            {/* LGPD Right to Erasure: Owner deletion trigger */}
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => setPostToDelete(post)}
                                title="Excluir minha publicação (LGPD Art. 18)"
                                className="p-2 rounded-full text-sage-800/50 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Media Container (Double-tap to like + Progressive Blur-up / Auto-play Video) */}
                        <div
                          onClick={() => handlePhotoTap(post)}
                          className="relative bg-slate-950/95 flex items-center justify-center overflow-hidden select-none cursor-pointer group"
                        >
                          {resolvePostMediaType(post) === 'video' ? (
                            <FeedVideoPlayer
                              src={post.mediaUrl}
                              cacheKey={post.id}
                              containerClassName={
                                viewMode === 'grid'
                                  ? 'w-full aspect-4/3'
                                  : 'w-full min-h-[260px]'
                              }
                              className={
                                viewMode === 'grid'
                                  ? 'w-full aspect-4/3 object-contain'
                                  : 'w-full max-h-[75vh] object-contain'
                              }
                            />
                          ) : (
                            <ProgressiveImage
                              src={post.mediaUrl}
                              alt={
                                post.caption || `Foto por ${post.authorName}`
                              }
                              cacheKey={post.id}
                              priority={index < 2}
                              containerClassName={
                                viewMode === 'grid'
                                  ? 'w-full aspect-4/3'
                                  : 'w-full min-h-[260px]'
                              }
                              className={
                                viewMode === 'grid'
                                  ? 'w-full aspect-4/3 object-contain'
                                  : 'w-full max-h-[75vh] object-contain'
                              }
                            />
                          )}

                          {/* Expand to Lightbox Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenLightbox(post.id)
                            }}
                            aria-label="Ver em tela cheia"
                            className="absolute top-3 right-3 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white/95 backdrop-blur-xs transition-opacity opacity-85 group-hover:opacity-100 shadow-sm z-10"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>

                          {/* Double-tap Heart Burst Overlay */}
                          {showHeartBurst && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 animate-in zoom-in-50 fade-in duration-150 z-10">
                              <Heart className="w-24 h-24 fill-rose-500 text-rose-500 drop-shadow-[0_4px_20px_rgba(244,63,94,0.65)] animate-bounce" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Post Actions & Caption */}
                      <div className="p-4 sm:px-5 sm:py-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(post.id)}
                              title={
                                guestUser
                                  ? 'Curtir foto'
                                  : 'Entre com Google para curtir'
                              }
                              className="inline-flex items-center gap-2 px-3 py-1.5 -ml-2 rounded-full text-base font-bold text-sage-900 hover:bg-rose-50/70 active:scale-95 transition-all"
                            >
                              <Heart
                                className={`w-6 h-6 transition-colors ${
                                  isLiked
                                    ? 'fill-rose-500 text-rose-500'
                                    : 'text-sage-800/80 stroke-[1.85]'
                                }`}
                              />
                              <span>{post.likesCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSharePost(post)}
                              title="Compartilhar foto"
                              className="p-2 rounded-full text-sage-800/75 hover:text-sage-900 hover:bg-sage-100 active:scale-95 transition-all"
                            >
                              <Share2 className="w-5 h-5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadPost(post)}
                              title="Baixar foto"
                              className="p-2 rounded-full text-sage-800/75 hover:text-sage-900 hover:bg-sage-100 active:scale-95 transition-all"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>

                          {post.challengeId && (
                            <span className="text-xs font-medium text-sage-800/70 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                              Desafio Concluído
                            </span>
                          )}
                        </div>

                        {post.caption && (
                          <p className="text-sm sm:text-base text-sage-800/95 leading-relaxed pt-0.5">
                            <span className="font-bold text-sage-900 mr-2">
                              {post.authorName}
                            </span>
                            {post.caption}
                          </p>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* Incremental Scroll Windowing Sentinel */}
              {visibleCount < filteredPosts.length && (
                <div
                  ref={loadMoreSentinelRef}
                  className="py-6 flex items-center justify-center text-xs text-sage-800/60 gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-sage-700" />
                  <span>Carregando mais fotos...</span>
                </div>
              )}
            </>
          )}

          {/* LGPD and Compliance Footer */}
          <footer className="pt-8 pb-4 text-center space-y-2 border-t border-sage-200/60">
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-sage-800/75 hover:text-sage-900 font-medium underline underline-offset-4 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-sage-700" />
              <span>Termos de Uso &amp; Privacidade (LGPD)</span>
            </button>
            <p className="text-xs text-sage-800/55">
              InstaWedding • Thiago &amp; Priscila © 2026
            </p>
          </footer>
        </div>

        {/* Desktop Right Sticky Sidebar (Notebook WebApp Widgets) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-8 space-y-6">
          {/* Wedding Welcome & Quick Stats Card */}
          <div className="bg-gradient-to-br from-sage-900 to-sage-800 text-white rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <img
                src="/favicon.svg"
                alt="Monograma T&P"
                className="w-12 h-12 rounded-2xl shadow-sm shrink-0"
              />
              <div>
                <span className="text-xs uppercase tracking-widest text-gold-400 font-bold">
                  Mural Oficial
                </span>
                <h3 className="font-serif text-xl font-bold leading-tight">
                  Thiago &amp; Priscila
                </h3>
              </div>
            </div>

            <p className="text-sm text-white/85 leading-relaxed">
              Compartilhe seus cliques favoritos da festa, participe dos
              desafios fotográficos e veja tudo no telão!
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <p className="text-2xl font-serif font-bold text-white">
                  {posts.length}
                </p>
                <p className="text-xs text-white/75 font-medium">
                  Fotos Postadas
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <p className="text-2xl font-serif font-bold text-gold-400">
                  {totalLikesCount}
                </p>
                <p className="text-xs text-white/75 font-medium">
                  Curtidas na Festa
                </p>
              </div>
            </div>

            <Link
              to="/challenges"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-gold-400 hover:bg-gold-500 text-sage-900 font-bold text-sm transition-colors shadow-xs"
            >
              <Trophy className="w-4 h-4" />
              <span>Explorar Desafios da Festa</span>
            </Link>
          </div>

          {/* Top Fotógrafos da Noite Widget */}
          {topContributors.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-sage-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold-500" />
                  <h3 className="font-serif text-base font-bold text-sage-900">
                    Top Fotógrafos da Noite
                  </h3>
                </div>
                <Link
                  to="/challenges"
                  className="text-xs font-semibold text-gold-500 hover:underline"
                >
                  Ver todos
                </Link>
              </div>

              <div className="space-y-2.5">
                {topContributors.map((person, idx) => {
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div
                      key={person.name}
                      className="flex items-center justify-between p-3 rounded-2xl bg-sage-50/80 border border-sage-200/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg leading-none shrink-0">
                          {medals[idx]}
                        </span>
                        <AuthorAvatar
                          name={person.name}
                          avatarUrl={person.avatarUrl}
                          size="sm"
                        />
                        <span className="text-sm font-bold text-sage-900 truncate">
                          {person.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold text-sage-800 shrink-0">
                        <span>📷 {person.count}</span>
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          {person.likes}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* LGPD Self-Deletion Confirmation Modal */}
      {postToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-sage-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-sage-900">
                Excluir post?
              </h3>
              <p className="text-sm text-sage-800/75 leading-relaxed">
                Esta foto será removida permanentemente do feed e do telão da
                festa (Direito de eliminação - LGPD Art. 18).
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-sage-200 text-sm font-semibold text-sage-800 hover:bg-sage-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Excluir Foto</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      <PhotoLightboxModal
        post={lightboxPost}
        isLiked={lightboxPost ? likedPostIds.has(lightboxPost.id) : false}
        onClose={handleCloseLightbox}
        onToggleLike={handleToggleLike}
        onDownload={handleDownloadPost}
        onShare={handleSharePost}
      />

      {/* Share Link Copied Toast */}
      {shareToastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-sage-900 text-white text-xs sm:text-sm font-semibold shadow-lg border border-white/15 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <Share2 className="w-4 h-4 text-gold-400" />
          <span>{shareToastMessage}</span>
        </div>
      )}

      {/* Terms and Privacy Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Guest Google OAuth Identification Modal */}
      <GuestNameModal
        isOpen={isNameModalOpen}
        guestUser={guestUser}
        reasonMessage={authModalReason}
        redirectPath="/"
        onClose={() => {
          setIsNameModalOpen(false)
          setAuthModalReason(undefined)
        }}
        onAuthChanged={(user) => setGuestUser(user)}
      />
    </div>
  )
}
