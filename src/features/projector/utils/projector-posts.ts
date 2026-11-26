import type { ProjectorFilterMode } from '@/features/projector/types'
import type { Post } from '@/types/domain'

/** Whether the guest agreed to show the post on the projector. */
export function isShownOnProjector(post: Post): boolean {
  return post.showOnProjector !== false
}

/**
 * Returns the posts of the slideshow, in display order. Does not change the
 * input. Without challenge posts, the `challenges` mode shows every post.
 */
export function selectSlides(posts: readonly Post[], mode: ProjectorFilterMode): readonly Post[] {
  switch (mode) {
    case 'highlights':
      return [...posts].sort((a, b) => b.likesCount - a.likesCount)
    case 'challenges': {
      const challengePosts = posts.filter((post) => post.challengeId !== null)
      return challengePosts.length > 0 ? challengePosts : posts
    }
    default:
      return posts
  }
}

/**
 * Returns the posts of the moment on air, in display order. Until the first
 * one arrives, shows every post.
 */
export function selectMomentSlides(posts: readonly Post[], momentId: number): readonly Post[] {
  const momentPosts = posts.filter((post) => post.challengeId === momentId)
  return momentPosts.length > 0 ? momentPosts : posts
}

/**
 * Returns the posts that come after the one at `index`, wrapping around at the
 * end and never including it.
 */
export function getUpcomingPosts(
  posts: readonly Post[],
  index: number,
  limit: number
): readonly Post[] {
  return [...posts.slice(index + 1), ...posts.slice(0, index)].slice(0, limit)
}
