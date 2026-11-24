import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { filterFeedPosts } from '@/features/feed/utils/feed-posts'

import type { FeedTab } from '@/features/feed/types'
import type { GuestIdentity } from '@/features/feed/utils/feed-posts'
import type { Challenge, Post } from '@/types/domain'

/** Feed filters and their result, as returned by {@link useFeedFilter}. */
export interface FeedFilterState {
  readonly tab: FeedTab
  readonly setTab: (tab: FeedTab) => void
  /** Challenge from the URL, or `null` when not filtering by one. */
  readonly challengeId: number | null
  /** Details of that challenge, when some loaded post has it. */
  readonly challenge: Challenge | undefined
  readonly selectChallenge: (challengeId: number) => void
  readonly clearChallenge: () => void
  readonly filteredPosts: readonly Post[]
}

/** Filters the feed by tab and by the challenge in the URL. */
export function useFeedFilter(
  posts: readonly Post[],
  { guestUser, sessionId }: GuestIdentity
): FeedFilterState {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<FeedTab>('all')
  const challengeParam = searchParams.get('challengeId')
  const challengeId = challengeParam ? Number(challengeParam) : null

  const filteredPosts = useMemo(
    () => filterFeedPosts(posts, { tab, challengeId, guestUser, sessionId }),
    [posts, tab, challengeId, guestUser, sessionId]
  )

  const challenge =
    challengeId === null
      ? undefined
      : posts.find((post) => post.challengeId === challengeId)?.challenge

  return {
    tab,
    setTab,
    challengeId,
    challenge,
    selectChallenge: (id) => setSearchParams({ challengeId: String(id) }),
    clearChallenge: () =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('challengeId')
        return next
      }),
    filteredPosts,
  }
}
