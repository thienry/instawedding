export interface Challenge {
  readonly id: number
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly isActive: boolean
  readonly createdAt: string
}

export interface CreateChallengeDTO {
  readonly title: string
  readonly description: string
  readonly icon: string
}

export type PostMediaType = 'image' | 'video'

export interface Post {
  readonly id: string
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly mediaUrl: string
  readonly mediaType?: PostMediaType
  readonly caption: string | null
  readonly challengeId: number | null
  readonly clientSessionId?: string
  readonly likesCount: number
  readonly isApproved: boolean
  readonly createdAt: string
  readonly challenge?: Challenge
}

export interface CreatePostDTO {
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly mediaUrl: string
  readonly mediaType?: PostMediaType
  readonly caption?: string | null
  readonly challengeId?: number | null
  readonly clientSessionId?: string
}

export interface ToggleLikeResult {
  readonly isLiked: boolean
  readonly likesCount: number
}

export interface GuestUser {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly avatarUrl: string | null
}

export interface GuestSession {
  readonly sessionId: string
  readonly guestName: string
  readonly termsAcceptedAt: string | null
}

export type UploadProgressCallback = (percentage: number) => void

export interface PresignedUploadResult {
  readonly uploadUrl: string
  readonly publicUrl: string
}
