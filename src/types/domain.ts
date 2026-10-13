export interface Challenge {
  readonly id: number
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly isActive: boolean
  readonly createdAt: string
}

export interface Post {
  readonly id: string
  readonly authorName: string
  readonly mediaUrl: string
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
  readonly mediaUrl: string
  readonly caption?: string | null
  readonly challengeId?: number | null
  readonly clientSessionId?: string
}

export interface ToggleLikeResult {
  readonly isLiked: boolean
  readonly likesCount: number
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
