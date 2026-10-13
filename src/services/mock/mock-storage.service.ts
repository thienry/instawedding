import type {
  PresignedUploadResult,
  UploadProgressCallback,
} from '../../types/domain'
import type { StorageService } from '../contracts/storage.contract'

export class MockStorageService implements StorageService {
  async getPresignedUploadUrl(
    fileName: string,
    _fileType: string
  ): Promise<PresignedUploadResult> {
    const mockId = crypto.randomUUID()
    const sanitizedName = fileName.replace(/\s+/g, '-')
    const mockKey = `${mockId}-${sanitizedName}`

    return {
      uploadUrl: `https://mock-r2-upload.local/${mockKey}`,
      publicUrl: `https://mock-r2.local/${mockKey}`,
    }
  }

  async uploadFile(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    const steps = [20, 50, 80, 100]

    for (const step of steps) {
      await this.delay(100)
      onProgress?.(step)
    }

    // Convert file to Base64 Data URL so it persists across reloads and tabs in localStorage
    return this.fileToDataUrl(file)
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read image as data URL'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
