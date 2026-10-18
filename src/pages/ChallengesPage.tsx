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

import {
  getChallengeRepository,
  getPostRepository,
} from '@/services/repositories.factory'
import { getGuestSession } from '@/utils/session'

import type { Challenge, Post } from '@/types/domain'

interface PhotographerRank {
  readonly authorName: string
  readonly photosCount: number
  readonly totalLikes: number
  readonly challengesDone: number
}

export function ChallengesPage() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const session = getGuestSession()
  const challengeRepo = getChallengeRepository()
  const postRepo = getPostRepository()

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

  // Personal completed challenges by sessionId or guestName
  const completedChallengeIds = useMemo(() => {
    const done = new Set<number>()
    const normalizedGuest = session.guestName.trim().toLowerCase()
    for (const post of posts) {
      if (!post.challengeId) continue
      const isMineBySession =
        Boolean(post.clientSessionId) &&
        post.clientSessionId === session.sessionId
      const isMineByName =
        Boolean(normalizedGuest) &&
        post.authorName.trim().toLowerCase() === normalizedGuest
      if (isMineBySession || isMineByName) {
        done.add(post.challengeId)
      }
    }
    return done
  }, [posts, session.sessionId, session.guestName])

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
        photosCount: 0,
        totalLikes: 0,
        challengeSet: new Set<number>(),
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
    <div className="p-4 space-y-4">
      {/* Header Banner + Personal Progress */}
      <div className="bg-gradient-to-br from-sage-900 to-sage-800 text-white rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
        <div className="absolute top-2 right-2 opacity-10 pointer-events-none">
          <Trophy className="w-24 h-24" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-gold-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Caça ao Tesouro Fotográfico</span>
          </div>
          <h2 className="font-serif text-xl font-bold leading-tight">
            Desafios da Festa
          </h2>
          <p className="text-xs text-white/80 leading-relaxed max-w-xs">
            Encontre e registre cada momento especial abaixo para animar o telão
            de Thiago &amp; Priscila!
          </p>
        </div>

        {/* Personal Progress Bar */}
        {totalChallenges > 0 && (
          <div className="pt-2 space-y-1.5 border-t border-white/15">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/90">
                Seu Progresso na Festa
              </span>
              <span className="font-bold text-gold-400">
                {completedCount} de {totalChallenges} concluídos ({progressPct}
                %)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
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
        <div className="bg-white rounded-2xl p-4 border border-sage-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-gold-500" />
              <h3 className="font-serif text-sm font-bold text-sage-900">
                Top Fotógrafos da Noite
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-sage-800/60 uppercase tracking-wider">
              Ranking ao Vivo
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {topPhotographers.map((person, index) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div
                  key={person.authorName}
                  className={`rounded-xl p-2.5 border text-center space-y-1 ${
                    index === 0
                      ? 'bg-gold-400/10 border-gold-400/40'
                      : 'bg-sage-50/70 border-sage-200/60'
                  }`}
                >
                  <div className="text-lg leading-none">{medals[index]}</div>
                  <p className="text-xs font-bold text-sage-900 truncate">
                    {person.authorName}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-sage-800/75 font-semibold">
                    <span>📷 {person.photosCount}</span>
                    <span className="inline-flex items-center gap-0.5 text-rose-600">
                      <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                      {person.totalLikes}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Challenges List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-4 border border-sage-200/60 animate-pulse flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-sage-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sage-200 rounded w-28" />
                  <div className="h-3 bg-sage-200 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          challenges.map((challenge) => {
            const isCompleted = completedChallengeIds.has(challenge.id)
            const communityCount = challengePhotoCountMap.get(challenge.id) ?? 0

            return (
              <div
                key={challenge.id}
                className={`bg-white rounded-2xl p-4 border shadow-xs flex items-center justify-between gap-3 transition-all ${
                  isCompleted
                    ? 'border-emerald-300/80 bg-emerald-50/20'
                    : 'border-sage-200/70 hover:border-sage-300'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-sage-50 border border-sage-200/80 flex items-center justify-center text-2xl shrink-0">
                    {challenge.icon}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-serif text-sm font-bold text-sage-900">
                        {challenge.title}
                      </h3>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Concluído</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-sage-800/70 leading-snug">
                      {challenge.description}
                    </p>

                    {communityCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleViewChallengePhotos(challenge.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-600 hover:text-gold-500 pt-0.5"
                      >
                        <Eye className="w-3 h-3" />
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
                  className={`p-2.5 rounded-xl transition-all shrink-0 active:scale-95 ${
                    isCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-sage-100 hover:bg-sage-900 text-sage-900 hover:text-white'
                  }`}
                  title="Cumprir Desafio"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
