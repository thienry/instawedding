/** Sections of the admin dashboard. */
export type AdminTab = 'photos' | 'challenges' | 'ceremonial'

/** Visibility filter of the moderation grid. */
export type PhotoModerationFilter = 'all' | 'approved' | 'hidden'

/** Outcome of an action, shown inline to the user. */
export interface Feedback {
  readonly type: 'error' | 'success'
  readonly message: string
}

/** Unsaved values of the challenge form. */
export interface ChallengeDraft {
  readonly icon: string
  readonly title: string
  readonly description: string
  /** Whether it is a moment the ceremonial puts on air. */
  readonly isMoment: boolean
}

/** Unsaved values of the ceremonialist form. */
export interface CeremonialistDraft {
  readonly email: string
  readonly name: string
}
