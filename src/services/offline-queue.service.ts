import { Emitter } from '@/services/offline-queue/emitter'
import { flushLegacyQueue } from '@/services/offline-queue/legacy-queue'
import {
  describeUploadFailure,
  toFailedStatus,
  withTimeout,
} from '@/services/offline-queue/upload-failure'
import { runInOneTab } from '@/services/offline-queue/upload-lock'
import {
  deleteUpload,
  isUploadGone,
  loadUploads,
  saveUpload,
} from '@/services/offline-queue/upload-store'
import {
  createUploadTask,
  fromStoredUpload,
  isOffline,
  toStoredUpload,
} from '@/services/offline-queue/upload-task'
import { getPostRepository } from '@/services/repositories.factory'
import { getStorageService } from '@/services/storage.factory'
import { cacheBlurPlaceholder } from '@/utils/blur-placeholder'

import type { BackgroundUploadTask, UploadRequest } from '@/services/offline-queue/upload-task'
import type { Post } from '@/types/domain'

const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 900
const CREATE_TIMEOUT_MS = 30_000

/**
 * Uploads posts in the background, keeping them on the device until published.
 *
 * Cancelling removes the task from `tasks`, so every step that follows an
 * `await` must check that the task is still there.
 */
export class OfflineQueueService {
  private static tasks = new Map<string, BackgroundUploadTask>()
  private static files = new Map<string, File>()
  /** Running uploads, with what cancels each one. */
  private static inFlight = new Map<string, AbortController>()
  /** Media already sent, so a retry does not send it again. */
  private static mediaUrls = new Map<string, string>()
  /** Uploads found on the device, which another tab may also have. */
  private static restoredIds = new Set<string>()
  private static flushing: Promise<number> | null = null
  private static changeListeners = new Emitter<[tasks: BackgroundUploadTask[]]>()
  private static publishedListeners = new Emitter<[post: Post, taskId: string]>()
  private static hydration: Promise<void> | null = null

  static subscribe(listener: (tasks: BackgroundUploadTask[]) => void): () => void {
    const unsubscribe = this.changeListeners.add(listener)
    void this.hydrateFromIdb().then(() => {
      listener(this.getTasksSnapshot())
    })
    return unsubscribe
  }

  static onPostPublished(listener: (post: Post, taskId: string) => void): () => void {
    return this.publishedListeners.add(listener)
  }

  /** Tasks in the queue, newest first. */
  static getTasksSnapshot(): BackgroundUploadTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
      this.restoredIds.add(task.id)
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

    await this.storeTask(task, file)
    if (task.status === 'uploading') void this.executeTask(id)
    return id
  }

  static async retryTask(id: string): Promise<void> {
    if (!this.tasks.has(id) || this.inFlight.has(id)) return

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
   * Uploads everything that is waiting, except what only the guest may retry.
   *
   * @returns How many posts were published.
   */
  static flush(): Promise<number> {
    this.flushing ??= this.uploadWaiting().finally(() => {
      this.flushing = null
    })
    return this.flushing
  }

  private static async uploadWaiting(): Promise<number> {
    if (isOffline()) return 0

    await this.hydrateFromIdb()
    let publishedCount = 0
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'uploading' || task.isPermanentFailure) continue
      if (await this.executeTask(id)) publishedCount++
    }

    return publishedCount + (await flushLegacyQueue())
  }

  /** Uploads a task, unless another tab is doing it or has done it. */
  private static async executeTask(id: string): Promise<boolean> {
    const isPublished = await runInOneTab(id, async () => {
      if (this.restoredIds.has(id) && !this.inFlight.has(id) && (await isUploadGone(id))) {
        await this.cancelTask(id)
        return false
      }
      return this.uploadTask(id)
    })
    return isPublished ?? false
  }

  /** Uploads a task, trying again once. Resolves to whether it was published. */
  private static async uploadTask(id: string): Promise<boolean> {
    const task = this.tasks.get(id)
    const file = this.files.get(id)
    if (!task || !file || this.inFlight.has(id)) return false

    const controller = new AbortController()
    this.inFlight.set(id, controller)
    this.updateTask(id, {
      status: 'uploading',
      progress: Math.max(10, task.progress),
      errorMessage: undefined,
      isPermanentFailure: undefined,
    })
    this.notifyChange()

    let lastError: unknown = null
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.publish(task, file, controller.signal)
      } catch (err) {
        lastError = err
        if (!this.tasks.has(id)) return false
        if (describeUploadFailure(err).isPermanent) break
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
    file: File,
    signal: AbortSignal
  ): Promise<boolean> {
    const { id } = task
    const postRepo = getPostRepository()

    const trackProgress = (pct: number) => {
      if (!this.tasks.has(id)) return
      const progress = Math.min(92, Math.max(12, Math.round(pct * 0.9)))
      this.updateTask(id, { progress, status: 'uploading' })
      this.notifyChange()
    }
    const mediaUrl =
      this.mediaUrls.get(id) ?? (await getStorageService().uploadFile(file, trackProgress, signal))
    if (!this.tasks.has(id)) return false
    this.mediaUrls.set(id, mediaUrl)

    if (task.blurDataUrl) cacheBlurPlaceholder(mediaUrl, task.blurDataUrl)
    this.updateTask(id, { progress: 96 })
    this.notifyChange()

    const creation = postRepo.createPost({
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
    const post = await withTimeout(creation, CREATE_TIMEOUT_MS)

    // Cancelled while the post was being created: take it down
    if (!this.tasks.has(id)) {
      try {
        await postRepo.deletePost(post.id)
      } catch {
        // Still published: show it so the guest can delete it
        this.publishedListeners.emit(post, id)
      }
      return false
    }

    if (task.blurDataUrl) cacheBlurPlaceholder(post.id, task.blurDataUrl)
    await this.removeTask(id)
    this.publishedListeners.emit(post, id)
    this.notifyChange()
    return true
  }

  /** Keeps a task that could not be uploaded, so it can be retried. */
  private static async failTask(id: string, file: File, error: unknown): Promise<void> {
    this.inFlight.delete(id)
    const failed = this.updateTask(id, toFailedStatus(error, isOffline()))
    if (!failed) return

    await this.storeTask(failed, file)
    this.notifyChange()
  }

  private static async storeTask(task: BackgroundUploadTask, file: File): Promise<void> {
    const isSaved = await saveUpload(toStoredUpload(task, file))
    // Cancelled while it was being stored
    if (!this.tasks.has(task.id)) await deleteUpload(task.id)
    this.updateTask(task.id, { isUnsaved: !isSaved })
    if (!isSaved) this.notifyChange()
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
    this.mediaUrls.delete(id)
    this.restoredIds.delete(id)
    this.inFlight.get(id)?.abort()
    this.inFlight.delete(id)
    await deleteUpload(id)
  }

  private static notifyChange(): void {
    this.changeListeners.emit(this.getTasksSnapshot())
  }
}
