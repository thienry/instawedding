import { flushLegacyQueue } from '@/services/offline-queue/legacy-queue'
import {
  deleteUpload,
  loadUploads,
  saveUpload,
} from '@/services/offline-queue/upload-store'
import {
  createUploadTask,
  fromStoredUpload,
  toStoredUpload,
} from '@/services/offline-queue/upload-task'
import { getPostRepository } from '@/services/repositories.factory'
import { getStorageService } from '@/services/storage.factory'
import { cacheBlurPlaceholder } from '@/utils/blur-placeholder'

import type {
  BackgroundUploadTask,
  UploadRequest,
} from '@/services/offline-queue/upload-task'
import type { Post } from '@/types/domain'

const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 900

type QueueChangeListener = (tasks: BackgroundUploadTask[]) => void
type PostPublishedListener = (post: Post, taskId: string) => void

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

/**
 * Uploads posts in the background, keeping them on the device until published.
 *
 * Cancelling removes the task from `tasks`, so every step that follows an
 * `await` must check that the task is still there.
 */
export class OfflineQueueService {
  private static tasks = new Map<string, BackgroundUploadTask>()
  private static files = new Map<string, File>()
  private static inFlightIds = new Set<string>()
  private static changeListeners = new Set<QueueChangeListener>()
  private static publishedListeners = new Set<PostPublishedListener>()
  private static hydration: Promise<void> | null = null

  static subscribe(listener: QueueChangeListener): () => void {
    this.changeListeners.add(listener)
    void this.hydrateFromIdb().then(() => {
      listener(this.getTasksSnapshot())
    })
    return () => {
      this.changeListeners.delete(listener)
    }
  }

  static onPostPublished(listener: PostPublishedListener): () => void {
    this.publishedListeners.add(listener)
    return () => {
      this.publishedListeners.delete(listener)
    }
  }

  /** Tasks in the queue, newest first. */
  static getTasksSnapshot(): BackgroundUploadTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  /** Restores the uploads left by a previous visit. */
  static hydrateFromIdb(): Promise<void> {
    this.hydration ??= this.restoreUploads()
    return this.hydration
  }

  private static async restoreUploads(): Promise<void> {
    const uploads = await loadUploads()
    for (const upload of uploads) {
      if (this.tasks.has(upload.id)) continue
      const { task, file } = fromStoredUpload(upload, isOffline())
      this.files.set(task.id, file)
      this.tasks.set(task.id, task)
    }

    if (uploads.length > 0) this.notifyChange()
  }

  /**
   * Stores the post on the device and starts uploading it in the background.
   *
   * @returns The id of the task.
   */
  static async submitInBackground(params: UploadRequest): Promise<string> {
    const { file } = params
    const task = await createUploadTask(params, isOffline)
    const { id } = task

    this.files.set(id, file)
    this.tasks.set(id, task)
    this.notifyChange()

    await saveUpload(toStoredUpload(task, file))
    if (task.status === 'uploading') void this.executeTask(id)
    return id
  }

  static async retryTask(id: string): Promise<void> {
    if (!this.tasks.has(id) || this.inFlightIds.has(id)) return

    if (isOffline()) {
      this.updateTask(id, {
        status: 'queued-offline',
        errorMessage: 'Aguardando sinal de internet...',
      })
      this.notifyChange()
      return
    }

    await this.executeTask(id)
  }

  static async cancelTask(id: string): Promise<void> {
    await this.removeTask(id)
    this.notifyChange()
  }

  /**
   * Uploads everything that is waiting.
   *
   * @returns How many posts were published.
   */
  static async flush(): Promise<number> {
    if (isOffline()) return 0

    await this.hydrateFromIdb()
    let publishedCount = 0
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'uploading') continue
      if (await this.executeTask(id)) publishedCount++
    }

    return publishedCount + (await flushLegacyQueue())
  }

  /** Uploads a task, trying again once. Resolves to whether it was published. */
  private static async executeTask(id: string): Promise<boolean> {
    const task = this.tasks.get(id)
    const file = this.files.get(id)
    if (!task || !file || this.inFlightIds.has(id)) return false

    this.inFlightIds.add(id)
    this.updateTask(id, {
      status: 'uploading',
      progress: Math.max(10, task.progress),
      errorMessage: undefined,
    })
    this.notifyChange()

    let lastError: unknown = null
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.publish(task, file)
      } catch (err) {
        lastError = err
        if (!this.tasks.has(id)) return false
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
          if (!this.tasks.has(id)) return false
        }
      }
    }

    await this.failTask(id, file, lastError)
    return false
  }

  /** Uploads the file and creates the post. False means it was cancelled. */
  private static async publish(
    task: BackgroundUploadTask,
    file: File
  ): Promise<boolean> {
    const { id } = task
    const postRepo = getPostRepository()

    const mediaUrl = await getStorageService().uploadFile(file, (pct) => {
      if (!this.tasks.has(id)) return
      const progress = Math.min(92, Math.max(12, Math.round(pct * 0.9)))
      this.updateTask(id, { progress, status: 'uploading' })
      this.notifyChange()
    })
    if (!this.tasks.has(id)) return false

    if (task.blurDataUrl) cacheBlurPlaceholder(mediaUrl, task.blurDataUrl)
    this.updateTask(id, { progress: 96 })
    this.notifyChange()

    const post = await postRepo.createPost({
      id,
      authorName: task.authorName,
      authorAvatarUrl: task.authorAvatarUrl,
      mediaUrl,
      mediaType: task.mediaType,
      caption: task.caption,
      challengeId: task.challengeId,
      clientSessionId: task.clientSessionId,
      showOnProjector: task.showOnProjector ?? true,
    })

    // Cancelled while the post was being created: take it down
    if (!this.tasks.has(id)) {
      try {
        await postRepo.deletePost(post.id)
      } catch {
        // Still published: show it so the guest can delete it
        this.notifyPublished(post, id)
      }
      return false
    }

    if (task.blurDataUrl) cacheBlurPlaceholder(post.id, task.blurDataUrl)
    await this.removeTask(id)
    this.notifyPublished(post, id)
    this.notifyChange()
    return true
  }

  /** Keeps a task that could not be uploaded, so it can be retried. */
  private static async failTask(
    id: string,
    file: File,
    error: unknown
  ): Promise<void> {
    this.inFlightIds.delete(id)
    const isQueued = isOffline()
    const failureMessage =
      error instanceof Error
        ? error.message
        : 'Oscilação na rede móvel. Toque para tentar novamente.'
    const failed = this.updateTask(id, {
      status: isQueued ? 'queued-offline' : 'failed',
      progress: 0,
      errorMessage: isQueued
        ? 'Sem sinal no momento. Será enviado automaticamente quando a internet voltar.'
        : failureMessage,
    })
    if (!failed) return

    await saveUpload(toStoredUpload(failed, file))
    this.notifyChange()
  }

  private static updateTask(
    id: string,
    changes: Partial<BackgroundUploadTask>
  ): BackgroundUploadTask | null {
    const task = this.tasks.get(id)
    if (!task) return null
    const updated = { ...task, ...changes }
    this.tasks.set(id, updated)
    return updated
  }

  private static async removeTask(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (task?.previewUrl) URL.revokeObjectURL(task.previewUrl)
    this.tasks.delete(id)
    this.files.delete(id)
    this.inFlightIds.delete(id)
    await deleteUpload(id)
  }

  private static notifyChange(): void {
    const snapshot = this.getTasksSnapshot()
    for (const listener of this.changeListeners) {
      listener(snapshot)
    }
  }

  private static notifyPublished(post: Post, taskId: string): void {
    for (const listener of this.publishedListeners) {
      listener(post, taskId)
    }
  }
}
