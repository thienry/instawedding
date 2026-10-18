import {
  Award,
  Camera,
  CheckCircle2,
  Eye,
  Heart,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { getGuestAuthService } from '@/services/guest-auth.factory'
import {
  getChallengeRepository,
  getPostRepository,
} from '@/services/repositories.factory'
import { getGuestSession } from '@/utils/session'

import type { Challenge, GuestUser, Post } from '@/types/domain'

interface PhotographerRank {
  readonly authorName: string
  readonly avatarUrl: string | null
  readonly photosCount: number
  readonly totalLikes: number
  readonly challengesDone: number
}

export function ChallengesPage() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const guestAuthService = getGuestAuthService()
  const [guestUser, setGuestUser] = useState<GuestUser | null>(() =>
    guestAuthService.getCurrentGuest()
  )

  const session = getGuestSession()
  const challengeRepo = getChallengeRepository()
  const postRepo = getPostRepository()

  useEffect(() => {
    setGuestUser(guestAuthService.getCurrentGuest())
    const unsubscribe = guestAuthService.onAuthStateChange((user) => {
      setGuestUser(user)
    })
    return () => {
      unsubscribe()
    }
  }, [guestAuthService])

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [challengeList, postList] = await Promise.all([
          challengeRepo.getChallenges(),
          postRepo.getPosts(),
        ])
        if (!isMounted) return
        setChallenges(challengeList)
        setPosts(postList)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [challengeRepo, postRepo])

  const handleStartChallenge = (challengeId: number) => {
    navigate(`/capture?challengeId=${challengeId}`)
  }

  const handleViewChallengePhotos = (challengeId: number) => {
    navigate(`/?challengeId=${challengeId}`)
  }

  // Personal completed challenges by guestUser.id, sessionId or guestName
  const completedChallengeIds = useMemo(() => {
    const done = new Set<number>()
    const activeSessionId = guestUser?.id ?? session.sessionId
    const normalizedGuest = (guestUser?.name ?? session.guestName)
      .trim()
      .toLowerCase()
    for (const post of posts) {
      if (!post.challengeId) continue
      const isMineBySession =
        Boolean(post.clientSessionId) &&
        (post.clientSessionId === activeSessionId ||
          post.clientSessionId === session.sessionId)
      const isMineByName =
        Boolean(normalizedGuest) &&
        post.authorName.trim().toLowerCase() === normalizedGuest
      if (isMineBySession || isMineByName) {
        done.add(post.challengeId)
      }
    }
    return done
  }, [posts, guestUser, session.sessionId, session.guestName])

  // Total community photos per challenge
  const challengePhotoCountMap = useMemo(() => {
    const counts = new Map<number, number>()
    for (const post of posts) {
      if (post.challengeId) {
        counts.set(post.challengeId, (counts.get(post.challengeId) ?? 0) + 1)
      }
    }
    return counts
  }, [posts])

  // Top 3 Photographers of the Night
  const topPhotographers = useMemo<PhotographerRank[]>(() => {
    const map = new Map<
      string,
      {
        displayName: string
        avatarUrl: string | null
        photosCount: number
        totalLikes: number
        challengeSet: Set<number>
      }
    >()

    for (const post of posts) {
      const key = post.authorName.trim().toLowerCase()
      if (!key) continue
      const existing = map.get(key) ?? {
        displayName: post.authorName.trim(),
        avatarUrl: post.authorAvatarUrl ?? null,
        photosCount: 0,
        totalLikes: 0,
        challengeSet: new Set<number>(),
      }
      if (!existing.avatarUrl && post.authorAvatarUrl) {
        existing.avatarUrl = post.authorAvatarUrl
      }
      existing.photosCount += 1
      existing.totalLikes += post.likesCount
      if (post.challengeId) {
        existing.challengeSet.add(post.challengeId)
      }
      map.set(key, existing)
    }

    return Array.from(map.values())
      .map((item) => ({
        authorName: item.displayName,
        avatarUrl: item.avatarUrl,
        photosCount: item.photosCount,
        totalLikes: item.totalLikes,
        challengesDone: item.challengeSet.size,
      }))
      .sort((a, b) => {
        if (b.photosCount !== a.photosCount) return b.photosCount - a.photosCount
        return b.totalLikes - a.totalLikes
      })
      .slice(0, 3)
  }, [posts])

  const totalChallenges = challenges.length
  const completedCount = challenges.filter((c) =>
    completedChallengeIds.has(c.id)
  ).length
  const progressPct =
    totalChallenges > 0
      ? Math.round((completedCount / totalChallenges) * 100)
      : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner + Personal Progress */}
      <div className="bg-gradient-to-br from-sage-900 to-sage-800 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-4 relative overflow-hidden">
        <div className="absolute top-3 right-4 opacity-10 pointer-events-none">
          <Trophy className="w-32 h-32" />
        </div>
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-gold-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Caça ao Tesouro Fotográfico</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
            Desafios da Festa
          </h2>
          <p className="text-sm sm:text-base text-white/85 leading-relaxed">
            Encontre e registre cada momento especial abaixo para animar o telão
            ao vivo de Thiago &amp; Priscila!
          </p>
        </div>

        {/* Personal Progress Bar */}
        {totalChallenges > 0 && (
          <div className="pt-3 space-y-2 border-t border-white/15 max-w-xl">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-white/90">
                Seu Progresso na Festa
              </span>
              <span className="font-bold text-gold-400">
                {completedCount} de {totalChallenges} concluídos ({progressPct}
                %)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-gold-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Photographers Leaderboard */}
      {!isLoading && topPhotographers.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sage-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-500" />
              <h3 className="font-serif text-lg font-bold text-sage-900">
                Top Fotógrafos da Noite
              </h3>
            </div>
            <span className="text-xs font-bold text-sage-800/60 uppercase tracking-wider">
              Ranking Ao Vivo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {topPhotographers.map((person, index) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div
                  key={person.authorName}
                  className={`rounded-2xl p-4 border flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-3 ${
                    index === 0
                      ? 'bg-gold-400/10 border-gold-400/45 shadow-2xs'
                      : 'bg-sage-50/80 border-sage-200/70'
                  }`}
                >
                  <div className="flex sm:flex-col items-center gap-3 sm:gap-1.5 min-w-0">
                    <div className="relative">
                      <AuthorAvatar
                        name={person.authorName}
                        avatarUrl={person.avatarUrl}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 text-base leading-none">
                        {medals[index]}
                      </span>
                    </div>
                    <p className="text-base font-bold text-sage-900 truncate">
                      {person.authorName}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-sage-800/85 font-semibold shrink-0">
                    <span>📷 {person.photosCount} fotos</span>
                    <span className="inline-flex items-center gap-1 text-rose-600">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      {person.totalLikes}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Challenges Grid (1 col on mobile, 2 cols on notebook/desktop) */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl p-5 border border-sage-200/60 animate-pulse flex items-center gap-4"
              >
                <div className="w-14 h-14 bg-sage-200 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-5 bg-sage-200 rounded w-36" />
                  <div className="h-4 bg-sage-100 rounded w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((challenge) => {
              const isCompleted = completedChallengeIds.has(challenge.id)
              const communityCount =
                challengePhotoCountMap.get(challenge.id) ?? 0

              return (
                <div
                  key={challenge.id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs flex items-center justify-between gap-4 transition-all ${
                    isCompleted
                      ? 'border-emerald-300/90 bg-emerald-50/25'
                      : 'border-sage-200/80 hover:border-sage-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-sage-50 border border-sage-200/90 flex items-center justify-center text-3xl shrink-0 shadow-2xs">
                      {challenge.icon}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-base sm:text-lg font-bold text-sage-900 leading-snug">
                          {challenge.title}
                        </h3>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Concluído</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-sage-800/80 leading-relaxed">
                        {challenge.description}
                      </p>

                      {communityCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewChallengePhotos(challenge.id)
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-500 hover:underline pt-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            Ver {communityCount}{' '}
                            {communityCount === 1
                              ? 'foto publicada'
                              : 'fotos publicadas'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartChallenge(challenge.id)}
                    className={`p-3.5 rounded-2xl transition-all shrink-0 active:scale-95 shadow-2xs ${
                      isCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-sage-900 hover:bg-sage-800 text-white'
                    }`}
                    title="Cumprir Desafio"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
