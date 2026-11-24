import { generateUUID } from '@/utils/uuid'
import { isVideoUrl, resolvePostMediaType } from '@/utils/video'

import type { ChallengeRepository } from '@/services/contracts/challenge-repository.contract'
import type { PostRepository } from '@/services/contracts/post-repository.contract'
import type { RealtimeService } from '@/services/contracts/realtime.contract'
import type { CreatePostDTO, Post, ToggleLikeResult } from '@/types/domain'

const POSTS_STORAGE_KEY = 'instawedding_mock_posts'
const LIKES_STORAGE_KEY = 'instawedding_mock_likes'

const SEED_POSTS: readonly Post[] = [
  {
    id: 'seed-post-1',
    authorName: 'Camila & Família',
    authorAvatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    mediaUrl:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
    mediaType: 'image',
    caption: 'Noite inesquecível celebrando o amor de vocês! 🥂✨',
    challengeId: 1,
    clientSessionId: 'seed-session-1',
    likesCount: 5,
    isApproved: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'seed-post-2',
    authorName: 'Lucas (Madrinha Team)',
    authorAvatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    mediaUrl:
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
    mediaType: 'image',
    caption: 'A pista já está fervendo! 🕺💃',
    challengeId: 2,
    clientSessionId: 'seed-session-2',
    likesCount: 12,
    isApproved: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
]

export class MockPostRepository implements PostRepository {
  private readonly challengeRepo: ChallengeRepository
  private readonly realtimeService: RealtimeService

  constructor(
    challengeRepo: ChallengeRepository,
    realtimeService: RealtimeService
  ) {
    this.challengeRepo = challengeRepo
    this.realtimeService = realtimeService
    this.ensureInitialData()
  }

  private ensureInitialData(): void {
    if (typeof localStorage === 'undefined') return
    const existing = localStorage.getItem(POSTS_STORAGE_KEY)
    if (!existing) {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(SEED_POSTS))
    }
  }

  async getPosts(): Promise<Post[]> {
    if (typeof localStorage === 'undefined') return [...SEED_POSTS]
    const data = localStorage.getItem(POSTS_STORAGE_KEY)
    const rawPosts: Post[] = data ? JSON.parse(data) : [...SEED_POSTS]

    const challenges = await this.challengeRepo.getChallenges()
    const challengeMap = new Map(challenges.map((c) => [c.id, c]))

    const enriched = rawPosts
      .filter((p) => p.isApproved)
      .map((post) => ({
        ...post,
        mediaType: resolvePostMediaType(post),
        challenge: post.challengeId
          ? challengeMap.get(post.challengeId)
          : undefined,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

    return enriched
  }

  async createPost(dto: CreatePostDTO): Promise<Post> {
    const rawPosts: Post[] =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(POSTS_STORAGE_KEY)
        ? JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY)!)
        : []

    const challenge = dto.challengeId
      ? await this.challengeRepo.getChallengeById(dto.challengeId)
      : null

    const newPost: Post = {
      id: generateUUID(),
      authorName: dto.authorName.trim(),
      authorAvatarUrl: dto.authorAvatarUrl ?? null,
      mediaUrl: dto.mediaUrl,
      mediaType:
        dto.mediaType ?? (isVideoUrl(dto.mediaUrl) ? 'video' : 'image'),
      caption: dto.caption?.trim() || null,
      challengeId: dto.challengeId ?? null,
      clientSessionId: dto.clientSessionId,
      likesCount: 0,
      isApproved: true,
      showOnProjector: dto.showOnProjector ?? true,
      createdAt: new Date().toISOString(),
      challenge: challenge ?? undefined,
    }

    rawPosts.unshift(newPost)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(rawPosts))
    }

    this.realtimeService.broadcastNewPost(newPost)

    return newPost
  }

  async toggleLike(
    postId: string,
    sessionId: string
  ): Promise<ToggleLikeResult> {
    const likesSet = this.getLikesSet()
    const likeKey = `${postId}:${sessionId}`
    const wasLiked = likesSet.has(likeKey)

    const posts: Post[] =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(POSTS_STORAGE_KEY)
        ? JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY)!)
        : []

    const targetPost = posts.find((p) => p.id === postId)
    if (!targetPost) {
      throw new Error(`Post with id "${postId}" not found`)
    }

    let updatedCount = targetPost.likesCount

    if (wasLiked) {
      likesSet.delete(likeKey)
      updatedCount = Math.max(0, updatedCount - 1)
    } else {
      likesSet.add(likeKey)
      updatedCount += 1
    }

    const updatedPosts = posts.map((p) =>
      p.id === postId ? { ...p, likesCount: updatedCount } : p
    )

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts))
      localStorage.setItem(
        LIKES_STORAGE_KEY,
        JSON.stringify(Array.from(likesSet))
      )
    }

    return {
      isLiked: !wasLiked,
      likesCount: updatedCount,
    }
  }

  async hasUserLiked(postId: string, sessionId: string): Promise<boolean> {
    const likesSet = this.getLikesSet()
    return likesSet.has(`${postId}:${sessionId}`)
  }

  async getLikedPostIds(sessionId: string): Promise<Set<string>> {
    const likesSet = this.getLikesSet()
    const result = new Set<string>()
    const suffix = `:${sessionId}`
    for (const key of likesSet) {
      if (key.endsWith(suffix)) {
        result.add(key.slice(0, key.length - suffix.length))
      }
    }
    return result
  }

  async getAllPostsForModeration(): Promise<Post[]> {
    if (typeof localStorage === 'undefined') return [...SEED_POSTS]
    const data = localStorage.getItem(POSTS_STORAGE_KEY)
    const rawPosts: Post[] = data ? JSON.parse(data) : [...SEED_POSTS]

    const challenges = await this.challengeRepo.getChallenges()
    const challengeMap = new Map(challenges.map((c) => [c.id, c]))

    return rawPosts
      .map((post) => ({
        ...post,
        mediaType: resolvePostMediaType(post),
        challenge: post.challengeId
          ? challengeMap.get(post.challengeId)
          : undefined,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  }

  async togglePostApproval(postId: string): Promise<boolean> {
    const posts: Post[] =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(POSTS_STORAGE_KEY)
        ? JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY)!)
        : []

    let newStatus = false
    const updated = posts.map((p) => {
      if (p.id === postId) {
        newStatus = !p.isApproved
        return { ...p, isApproved: newStatus }
      }
      return p
    })

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated))
    }

    return newStatus
  }

  async deletePost(postId: string): Promise<void> {
    const posts: Post[] =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(POSTS_STORAGE_KEY)
        ? JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY)!)
        : []

    const filtered = posts.filter((p) => p.id !== postId)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(filtered))
    }
  }

  async deletePostAsAdmin(postId: string): Promise<void> {
    await this.deletePost(postId)
  }

  async clearAllPosts(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify([]))
      localStorage.removeItem(LIKES_STORAGE_KEY)
    }
  }

  private getLikesSet(): Set<string> {
    if (typeof localStorage === 'undefined') return new Set()
    const data = localStorage.getItem(LIKES_STORAGE_KEY)
    if (!data) return new Set()
    try {
      const arr: string[] = JSON.parse(data)
      return new Set(arr)
    } catch {
      return new Set()
    }
  }
}
