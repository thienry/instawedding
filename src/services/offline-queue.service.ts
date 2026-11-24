import { getPostRepository } from '@/services/repositories.factory'
import { getStorageService } from '@/services/storage.factory'
import {
  cacheBlurPlaceholder,
  generateBlurPlaceholder,
} from '@/utils/blur-placeholder'
import { generateUUID } from '@/utils/uuid'
import { extractVideoPoster, isVideoFile } from '@/utils/video'

import type {
  Challenge,
  CreatePostDTO,
  Post,
  PostMediaType,
} from '@/types/domain'

const OFFLINE_QUEUE_KEY = 'instawedding_offline_post_queue'
const IDB_NAME = 'instawedding_media_queue_db'
const IDB_VERSION = 1
const IDB_STORE = 'pending_uploads'

export type UploadTaskStatus = 'uploading' | 'queued-offline' | 'failed'

export interface BackgroundUploadTask {
  readonly id: string
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly caption: string | null
  readonly challengeId: number | null
  readonly challenge?: Challenge
  readonly clientSessionId: string
  readonly mediaType: PostMediaType
  readonly previewUrl: string
  readonly blurDataUrl?: string
  readonly progress: number
  readonly status: UploadTaskStatus
  readonly errorMessage?: string
  readonly showOnProjector?: boolean
  readonly createdAt: string
}

interface StoredIdbRecord {
  readonly id: string
  readonly fileBlob: Blob
  readonly fileName: string
  readonly fileType: string
  readonly mediaType?: PostMediaType
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly caption: string | null
  readonly challengeId: number | null
  readonly challenge?: Challenge
  readonly clientSessionId: string
  readonly blurDataUrl?: string
  readonly status: UploadTaskStatus
  readonly errorMessage?: string
  readonly showOnProjector?: boolean
  readonly createdAt: string
}

export interface QueuedPost {
  readonly id: string
  readonly dto: CreatePostDTO
  readonly queuedAt: string
}

export interface SubmitBackgroundUploadParams {
  readonly file: File
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly caption: string | null
  readonly challengeId: number | null
  readonly challenge?: Challenge
  readonly clientSessionId: string
  readonly showOnProjector?: boolean
}

type QueueChangeListener = (tasks: BackgroundUploadTask[]) => void
type PostPublishedListener = (post: Post, taskId: string) => void

function openQueueDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function saveRecordToIdb(record: StoredIdbRecord): Promise<void> {
  const db = await openQueueDb()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      store.put(record)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    } catch {
      db.close()
      resolve()
    }
  })
}

async function deleteRecordFromIdb(id: string): Promise<void> {
  const db = await openQueueDb()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      store.delete(id)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    } catch {
      db.close()
      resolve()
    }
  })
}

async function getAllRecordsFromIdb(): Promise<StoredIdbRecord[]> {
  const db = await openQueueDb()
  if (!db) return []
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const req = store.getAll()
      req.onsuccess = () => {
        db.close()
        resolve((req.result as StoredIdbRecord[]) ?? [])
      }
      req.onerror = () => {
        db.close()
        resolve([])
      }
    } catch {
      db.close()
      resolve([])
    }
  })
}

export class OfflineQueueService {
  private static activeTasks = new Map<string, BackgroundUploadTask>()
  private static inFlightIds = new Set<string>()
  private static fileMemoryMap = new Map<string, File>()
  private static changeListeners = new Set<QueueChangeListener>()
  private static publishedListeners = new Set<PostPublishedListener>()
  private static isHydrated = false

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

  static getTasksSnapshot(): BackgroundUploadTask[] {
    return Array.from(this.activeTasks.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
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

  static async hydrateFromIdb(): Promise<void> {
    if (this.isHydrated) return
    this.isHydrated = true

    const records = await getAllRecordsFromIdb()
    for (const rec of records) {
      if (this.activeTasks.has(rec.id)) continue
      const file = new File([rec.fileBlob], rec.fileName, {
        type: rec.fileType || 'image/webp',
      })
      const mediaType: PostMediaType =
        rec.mediaType ?? (isVideoFile(file) ? 'video' : 'image')
      const previewUrl = URL.createObjectURL(file)
      this.fileMemoryMap.set(rec.id, file)
      this.activeTasks.set(rec.id, {
        id: rec.id,
        authorName: rec.authorName,
        authorAvatarUrl: rec.authorAvatarUrl,
        caption: rec.caption,
        challengeId: rec.challengeId,
        challenge: rec.challenge,
        clientSessionId: rec.clientSessionId,
        mediaType,
        previewUrl,
        blurDataUrl: rec.blurDataUrl,
        progress: 0,
        status:
          typeof navigator !== 'undefined' && !navigator.onLine
            ? 'queued-offline'
            : rec.status === 'uploading'
              ? 'failed'
              : rec.status,
        errorMessage: rec.errorMessage,
        showOnProjector: rec.showOnProjector ?? true,
        createdAt: rec.createdAt,
      })
    }

    if (records.length > 0) {
      this.notifyChange()
    }
  }

  /**
   * Enqueues a photo or short video upload and executes it immediately in the background
   * (Instagram-style optimistic post flow), persisting the binary Blob in
   * IndexedDB until the upload + database creation succeed.
   */
  static async submitInBackground(
    params: SubmitBackgroundUploadParams
  ): Promise<string> {
    const id = generateUUID()
    const createdAt = new Date().toISOString()
    const mediaType: PostMediaType = isVideoFile(params.file)
      ? 'video'
      : 'image'
    const previewUrl = URL.createObjectURL(params.file)
    const blurDataUrl =
      mediaType === 'video'
        ? await extractVideoPoster(params.file)
        : await generateBlurPlaceholder(params.file)
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

    const initialTask: BackgroundUploadTask = {
      id,
      authorName: params.authorName,
      authorAvatarUrl: params.authorAvatarUrl ?? null,
      caption: params.caption,
      challengeId: params.challengeId,
      challenge: params.challenge,
      clientSessionId: params.clientSessionId,
      mediaType,
      previewUrl,
      blurDataUrl: blurDataUrl || undefined,
      progress: isOffline ? 0 : 8,
      status: isOffline ? 'queued-offline' : 'uploading',
      showOnProjector: params.showOnProjector ?? true,
      createdAt,
    }

    this.fileMemoryMap.set(id, params.file)
    this.activeTasks.set(id, initialTask)
    this.notifyChange()

    await saveRecordToIdb({
      id,
      fileBlob: params.file,
      fileName: params.file.name,
      fileType: params.file.type,
      mediaType,
      authorName: params.authorName,
      authorAvatarUrl: params.authorAvatarUrl ?? null,
      caption: params.caption,
      challengeId: params.challengeId,
      challenge: params.challenge,
      clientSessionId: params.clientSessionId,
      blurDataUrl: blurDataUrl || undefined,
      status: initialTask.status,
      showOnProjector: params.showOnProjector ?? true,
      createdAt,
    })

    if (!isOffline) {
      void this.executeUploadTask(id)
    }

    return id
  }

  static async retryTask(id: string): Promise<void> {
    const task = this.activeTasks.get(id)
    if (!task || this.inFlightIds.has(id)) return

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.activeTasks.set(id, {
        ...task,
        status: 'queued-offline',
        errorMessage: 'Aguardando sinal de internet...',
      })
      this.notifyChange()
      return
    }

    await this.executeUploadTask(id)
  }

  static async cancelTask(id: string): Promise<void> {
    const task = this.activeTasks.get(id)
    if (task?.previewUrl) {
      URL.revokeObjectURL(task.previewUrl)
    }
    this.activeTasks.delete(id)
    this.fileMemoryMap.delete(id)
    this.inFlightIds.delete(id)
    await deleteRecordFromIdb(id)
    this.notifyChange()
  }

  private static async executeUploadTask(id: string): Promise<boolean> {
    const task = this.activeTasks.get(id)
    const file = this.fileMemoryMap.get(id)
    if (!task || !file || this.inFlightIds.has(id)) return false

    this.inFlightIds.add(id)
    this.activeTasks.set(id, {
      ...task,
      status: 'uploading',
      progress: Math.max(10, task.progress),
      errorMessage: undefined,
    })
    this.notifyChange()

    const storageService = getStorageService()
    const postRepo = getPostRepository()

    const maxAttempts = 2
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const mediaUrl = await storageService.uploadFile(file, (pct) => {
          const current = this.activeTasks.get(id)
          if (!current) return
          const scaledPct = Math.min(92, Math.max(12, Math.round(pct * 0.9)))
          this.activeTasks.set(id, {
            ...current,
            progress: scaledPct,
            status: 'uploading',
          })
          this.notifyChange()
        })

        if (!this.activeTasks.has(id)) return false // Cancelled

        if (task.blurDataUrl) {
          cacheBlurPlaceholder(mediaUrl, task.blurDataUrl)
        }

        const currentBeforeCreate = this.activeTasks.get(id)
        if (currentBeforeCreate) {
          this.activeTasks.set(id, {
            ...currentBeforeCreate,
            progress: 96,
          })
          this.notifyChange()
        }

        const createdPost = await postRepo.createPost({
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
        if (!this.activeTasks.has(id)) {
          try {
            await postRepo.deletePost(createdPost.id)
          } catch {
            // Still published: show it so the guest can delete it
            this.notifyPublished(createdPost, id)
          }
          return false
        }

        if (task.blurDataUrl) {
          cacheBlurPlaceholder(createdPost.id, task.blurDataUrl)
        }

        // Clean up completed task
        if (task.previewUrl) {
          URL.revokeObjectURL(task.previewUrl)
        }
        this.activeTasks.delete(id)
        this.fileMemoryMap.delete(id)
        this.inFlightIds.delete(id)
        await deleteRecordFromIdb(id)

        this.notifyPublished(createdPost, id)
        this.notifyChange()
        return true
      } catch (err) {
        lastError = err
        if (!this.activeTasks.has(id)) return false // Cancelled
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 900 * attempt))
          if (!this.activeTasks.has(id)) return false // Cancelled
        }
      }
    }

    this.inFlightIds.delete(id)
    const isNowOffline = typeof navigator !== 'undefined' && !navigator.onLine
    const failedStatus: UploadTaskStatus = isNowOffline
      ? 'queued-offline'
      : 'failed'
    const errorMessage = isNowOffline
      ? 'Sem sinal no momento. Será enviado automaticamente quando a internet voltar.'
      : lastError instanceof Error
        ? lastError.message
        : 'Oscilação na rede móvel. Toque para tentar novamente.'

    const latestTask = this.activeTasks.get(id)
    if (latestTask) {
      this.activeTasks.set(id, {
        ...latestTask,
        status: failedStatus,
        progress: 0,
        errorMessage,
      })
      await saveRecordToIdb({
        id,
        fileBlob: file,
        fileName: file.name,
        fileType: file.type,
        mediaType: latestTask.mediaType,
        authorName: latestTask.authorName,
        authorAvatarUrl: latestTask.authorAvatarUrl,
        caption: latestTask.caption,
        challengeId: latestTask.challengeId,
        challenge: latestTask.challenge,
        clientSessionId: latestTask.clientSessionId,
        blurDataUrl: latestTask.blurDataUrl,
        status: failedStatus,
        errorMessage,
        showOnProjector: latestTask.showOnProjector,
        createdAt: latestTask.createdAt,
      })
      this.notifyChange()
    }

    return false
  }

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
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    } catch {
      // Ignore quota exceeded on legacy localStorage fallback
    }
  }

  static async flush(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0

    await this.hydrateFromIdb()
    let processedCount = 0

    // 1. Flush IndexedDB binary tasks
    for (const [id, task] of this.activeTasks.entries()) {
      if (task.status === 'queued-offline' || task.status === 'failed') {
        const ok = await this.executeUploadTask(id)
        if (ok) processedCount++
      }
    }

    // 2. Flush legacy localStorage queue if any exists
    if (typeof localStorage !== 'undefined') {
      const queue = this.getQueue()
      if (queue.length > 0) {
        const postRepo = getPostRepository()
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
      }
    }

    return processedCount
  }
}
