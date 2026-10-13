import {
  Heart,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { GuestNameModal } from '@/components/common/GuestNameModal'
import { TermsModal } from '@/components/common/TermsModal'
import {
  getPostRepository,
  getRealtimeService,
} from '@/services/repositories.factory'
import { getGuestSession } from '@/utils/session'

import type { Post } from '@/types/domain'

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
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)

  const session = getGuestSession()
  const [guestName, setGuestNameState] = useState(session.guestName)

  const postRepo = getPostRepository()
  const realtimeService = getRealtimeService()

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const fetchedPosts = await postRepo.getPosts()
      setPosts(fetchedPosts)
      const likedChecks = await Promise.all(
        fetchedPosts.map(async (p) => {
          const isLiked = await postRepo.hasUserLiked(p.id, session.sessionId)
          return { id: p.id, isLiked }
        })
      )
      const likedSet = new Set<string>()
      for (const item of likedChecks) {
        if (item.isLiked) likedSet.add(item.id)
      }
      setLikedPostIds(likedSet)
    } catch {
      // Ignore refresh error
    } finally {
      setIsRefreshing(false)
    }
  }, [postRepo, session.sessionId])

  useEffect(() => {
    let isMounted = true

    postRepo
      .getPosts()
      .then(async (fetchedPosts) => {
        if (!isMounted) return
        setPosts(fetchedPosts)

        const likedChecks = await Promise.all(
          fetchedPosts.map(async (p) => {
            const isLiked = await postRepo.hasUserLiked(p.id, session.sessionId)
            return { id: p.id, isLiked }
          })
        )

        if (!isMounted) return
        const likedSet = new Set<string>()
        for (const item of likedChecks) {
          if (item.isLiked) likedSet.add(item.id)
        }
        setLikedPostIds(likedSet)
        setIsLoading(false)
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    // Subscribe to new posts in realtime
    const unsubscribe = realtimeService.subscribeToNewPosts((newPost) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev
        return [newPost, ...prev]
      })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [postRepo, realtimeService, session.sessionId])

  const handleToggleLike = async (postId: string) => {
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
      const result = await postRepo.toggleLike(postId, session.sessionId)
      // Synchronize with server/storage response
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
  }

  const handleConfirmDelete = async () => {
    if (!postToDelete) return
    setIsDeleting(true)
    try {
      await postRepo.deletePost(postToDelete.id)
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id))
      setLikedPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postToDelete.id)
        return next
      })
      setPostToDelete(null)
    } catch {
      alert('Não foi possível excluir a publicação. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Top Banner / Pull to Refresh */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => setIsNameModalOpen(true)}
          className="flex items-center gap-1.5 text-xs text-sage-800/80 hover:text-sage-900 font-medium transition-colors"
        >
          <User className="w-3.5 h-3.5 text-sage-700" />
          <span>{guestName ? `Olá, ${guestName}` : 'Identifique-se'}</span>
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs text-sage-800 hover:text-sage-900 transition-colors p-1"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="text-[11px]">Atualizar</span>
        </button>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl overflow-hidden border border-sage-200/60 shadow-xs animate-pulse"
            >
              <div className="p-3 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-sage-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-24 h-3 bg-sage-200 rounded-sm" />
                  <div className="w-16 h-2 bg-sage-100 rounded-sm" />
                </div>
              </div>
              <div className="aspect-4/3 bg-sage-100" />
              <div className="p-3 space-y-2">
                <div className="w-12 h-4 bg-sage-200 rounded-sm" />
                <div className="w-3/4 h-3 bg-sage-100 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-sage-200 text-center space-y-3 shadow-xs">
          <span className="text-3xl block">📷</span>
          <h3 className="font-serif text-lg font-bold text-sage-900">
            Nenhuma foto publicada ainda
          </h3>
          <p className="text-xs text-sage-800/70 max-w-xs mx-auto">
            Seja o primeiro a registrar e compartilhar um momento especial da
            festa!
          </p>
          <Link
            to="/capture"
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-sage-900 text-white text-xs font-semibold hover:bg-sage-800 transition-colors shadow-sm"
          >
            Tirar Primeira Foto
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => {
            const isLiked = likedPostIds.has(post.id)
            const isOwner =
              Boolean(post.clientSessionId) &&
              post.clientSessionId === session.sessionId

            return (
              <article
                key={post.id}
                className="bg-white rounded-2xl overflow-hidden border border-sage-200/70 shadow-xs transition-all"
              >
                {/* Author Header */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-900 font-serif font-bold text-xs flex items-center justify-center border border-sage-200">
                      {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-sage-900 leading-none">
                        {post.authorName}
                      </h4>
                      <span className="text-[10px] text-sage-800/60 leading-none">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.challenge && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gold-400/15 text-gold-500 border border-gold-400/30">
                        <span>{post.challenge.icon}</span>
                        <span>{post.challenge.title}</span>
                      </span>
                    )}

                    {/* LGPD Right to Erasure: Owner deletion trigger */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setPostToDelete(post)}
                        title="Excluir minha publicação (LGPD Art. 18)"
                        className="p-1 rounded-full text-sage-800/40 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Media Image */}
                <div className="relative aspect-4/3 bg-sage-100 overflow-hidden">
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || `Foto por ${post.authorName}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Post Actions & Caption */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-sage-900 hover:opacity-80 active:scale-95 transition-all"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          isLiked
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-sage-800/70 stroke-[1.75]'
                        }`}
                      />
                      <span>{post.likesCount}</span>
                    </button>

                    {post.challengeId && (
                      <span className="text-[10px] text-sage-800/60 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-gold-500" />
                        Desafio Concluído
                      </span>
                    )}
                  </div>

                  {post.caption && (
                    <p className="text-xs text-sage-800/90 leading-relaxed pt-0.5">
                      <span className="font-semibold text-sage-900 mr-1.5">
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
      )}

      {/* LGPD and Compliance Footer */}
      <footer className="pt-6 pb-2 text-center space-y-1.5 border-t border-sage-200/50">
        <button
          type="button"
          onClick={() => setIsTermsOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] text-sage-800/70 hover:text-sage-900 font-medium underline underline-offset-2 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-sage-700" />
          <span>Termos de Uso & Privacidade (LGPD)</span>
        </button>
        <p className="text-[10px] text-sage-800/50">
          InstaWedding • Thiago & Priscila © 2026
        </p>
      </footer>

      {/* LGPD Self-Deletion Confirmation Modal */}
      {postToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-sage-200 space-y-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif text-base font-bold text-sage-900">
                Excluir publicação?
              </h3>
              <p className="text-xs text-sage-800/70">
                Esta foto será removida permanentemente do feed e do telão da
                festa (Direito de eliminação - LGPD Art. 18).
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-sage-200 text-xs font-semibold text-sage-800 hover:bg-sage-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

      {/* Terms and Privacy Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Guest Identification Modal */}
      <GuestNameModal
        isOpen={isNameModalOpen}
        initialName={guestName}
        onClose={() => setIsNameModalOpen(false)}
        onSaved={(newName) => setGuestNameState(newName)}
      />
    </div>
  )
}
