/** Number of digits in the login code sent by email. */
export const OTP_LENGTH = 6

/** Posts shown on each page of the moderation grid. */
export const POSTS_PER_PAGE = 20

/** Word the admin must type before every post is deleted. */
export const CLEAR_FEED_CONFIRMATION = 'ZERAR'

/** Dialog options shared by every irreversible action. */
export const DESTRUCTIVE_DIALOG = {
  cancelLabel: 'Cancelar',
  isDestructive: true,
} as const
