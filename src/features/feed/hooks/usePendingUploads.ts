import { useEffect, useState } from 'react'

import { OfflineQueueService } from '@/services/offline-queue.service'

import type { BackgroundUploadTask } from '@/services/offline-queue/upload-task'

/** Uploads still in the background queue, newest first. */
export function usePendingUploads(): readonly BackgroundUploadTask[] {
  const [tasks, setTasks] = useState<readonly BackgroundUploadTask[]>([])

  useEffect(() => {
    let isMounted = true
    // The first notification is asynchronous and may come after unmounting
    const unsubscribe = OfflineQueueService.subscribe((nextTasks) => {
      if (isMounted) setTasks(nextTasks)
    })
    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return tasks
}
