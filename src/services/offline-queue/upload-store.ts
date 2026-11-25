import type { StoredUpload } from '@/services/offline-queue/upload-task'

// Renaming any of these loses the uploads waiting on the guests' phones
const DB_NAME = 'instawedding_media_queue_db'
const DB_VERSION = 1
const STORE_NAME = 'pending_uploads'

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** Runs one request, resolving to `null` when the storage is not usable. */
async function runRequest<T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  const db = await openDb()
  if (!db) return null

  return new Promise((resolve) => {
    const finish = (result: T | null) => {
      db.close()
      resolve(result)
    }
    try {
      const tx = db.transaction(STORE_NAME, mode)
      const request = createRequest(tx.objectStore(STORE_NAME))
      tx.oncomplete = () => finish(request.result)
      tx.onerror = () => finish(null)
      // A full device may abort the transaction without a request error
      tx.onabort = () => finish(null)
    } catch {
      finish(null)
    }
  })
}

/** Resolves to whether the upload is safe on the device. */
export async function saveUpload(upload: StoredUpload): Promise<boolean> {
  return (await runRequest('readwrite', (store) => store.put(upload))) !== null
}

/** Whether the upload is known to be gone, such as sent by another tab. */
export async function isUploadGone(id: string): Promise<boolean> {
  // `null` means that the storage could not be read
  return (await runRequest('readonly', (store) => store.getKey(id))) === undefined
}

export async function deleteUpload(id: string): Promise<void> {
  await runRequest('readwrite', (store) => store.delete(id))
}

export async function loadUploads(): Promise<StoredUpload[]> {
  const uploads = await runRequest<StoredUpload[]>('readonly', (store) => store.getAll())
  return uploads ?? []
}
