import { getPostRepository } from '@/services/repositories.factory'
import { generateUUID } from '@/utils/uuid'

import type { CreatePostDTO } from '@/types/domain'

const OFFLINE_QUEUE_KEY = 'instawedding_offline_post_queue'

export interface QueuedPost {
  readonly id: string
  readonly dto: CreatePostDTO
  readonly queuedAt: string
}

export class OfflineQueueService {
  static getQueue(): QueuedPost[] {
    if (typeof localStorage === 'undefined') return []
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!data) return []
    try {
      return JSON.parse(data) as QueuedPost[]
    } catch {
      return []
    }
  }

  static enqueue(dto: CreatePostDTO): void {
    if (typeof localStorage === 'undefined') return
    const queue = this.getQueue()
    const item: QueuedPost = {
      id: generateUUID(),
      dto,
      queuedAt: new Date().toISOString(),
    }
    queue.push(item)
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
  }

  static async flush(): Promise<number> {
    if (typeof localStorage === 'undefined' || !navigator.onLine) return 0
    const queue = this.getQueue()
    if (queue.length === 0) return 0

    const postRepo = getPostRepository()
    let processedCount = 0
    const remaining: QueuedPost[] = []

    for (const item of queue) {
      try {
        await postRepo.createPost(item.dto)
        processedCount++
      } catch {
        remaining.push(item)
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining))
    return processedCount
  }
}
