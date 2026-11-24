import { getGuestAuthService } from '@/services/guest-auth.factory'
import { getGuestSession } from '@/utils/session'

import type { Post } from '@/types/domain'

/** Whether the guest of this device made the post, by id or by name. */
export function isOwnPost(post: Post): boolean {
  const guestUser = getGuestAuthService().getCurrentGuest()
  const session = getGuestSession()

  if (
    post.clientSessionId &&
    (post.clientSessionId === session.sessionId ||
      (guestUser && post.clientSessionId === guestUser.id))
  ) {
    return true
  }

  if (guestUser && post.authorName.trim().toLowerCase() === guestUser.name.trim().toLowerCase()) {
    return true
  }

  return false
}
