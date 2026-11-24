import { useEffect, useState } from 'react'

import { FeedNotificationService } from '@/services/feed-notification.service'

import type { FeedNotificationState } from '@/services/feed-notification.service'

/**
 * React hook that subscribes to real-time and while-away feed notification state.
 */
export function useFeedNotifications(): FeedNotificationState {
  const [state, setState] = useState<FeedNotificationState>(() =>
    FeedNotificationService.getState()
  )

  useEffect(() => {
    return FeedNotificationService.subscribe((nextState) => {
      setState(nextState)
    })
  }, [])

  return state
}
