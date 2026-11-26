export interface Challenge {
  readonly id: number
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly isActive: boolean
  readonly createdAt: string
  /** Moment of the party, such as the first dance, put on air by the ceremonial. */
  readonly isMoment?: boolean
  /** When the moment went on air, or `null` when it is not. See `src/utils/moments.ts`. */
  readonly liveSince?: string | null
}

export interface CreateChallengeDTO {
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly isMoment?: boolean
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
  readonly showOnProjector?: boolean
  /** Taken off the projector by a moderator. The feed still shows it. */
  readonly hiddenFromProjector?: boolean
  readonly createdAt: string
  readonly challenge?: Challenge
}

export interface CreatePostDTO {
  /** UUID chosen by the client, so a retry does not create another post. */
  readonly id?: string
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly mediaUrl: string
  readonly mediaType?: PostMediaType
  readonly caption?: string | null
  readonly challengeId?: number | null
  readonly clientSessionId?: string
  readonly showOnProjector?: boolean
}

export interface ToggleLikeResult {
  readonly isLiked: boolean
  /** `null` when the like was saved but the total is unknown. */
  readonly likesCount: number | null
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

export interface Ceremonialist {
  readonly id: string
  readonly email: string
  readonly name?: string | null
  readonly createdAt: string
  readonly createdBy: string
}

export interface CreateCeremonialistDTO {
  readonly email: string
  readonly name?: string
}
