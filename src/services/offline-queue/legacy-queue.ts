import { getPostRepository } from '@/services/repositories.factory'

import type { CreatePostDTO } from '@/types/domain'

const STORAGE_KEY = 'instawedding_offline_post_queue'

interface QueuedPost {
  readonly id: string
  readonly dto: CreatePostDTO
  readonly queuedAt: string
}

function readQueue(): QueuedPost[] {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data) as QueuedPost[]
  } catch {
    return []
  }
}

/**
 * Publishes what the first version of the app left in `localStorage`.
 *
 * @returns How many posts were published. The others stay stored.
 */
export async function flushLegacyQueue(): Promise<number> {
  if (typeof localStorage === 'undefined') return 0
  const queue = readQueue()
  if (queue.length === 0) return 0

  const postRepo = getPostRepository()
  const remaining: QueuedPost[] = []
  for (const item of queue) {
    try {
      await postRepo.createPost({ ...item.dto, id: item.id })
    } catch {
      remaining.push(item)
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
  return queue.length - remaining.length
}
