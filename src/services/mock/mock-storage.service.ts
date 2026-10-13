import type { StorageService } from '../contracts/storage.contract';
import type { PresignedUploadResult, UploadProgressCallback } from '../../types/domain';

export class MockStorageService implements StorageService {
  private readonly objectUrls = new Map<string, string>();

  async getPresignedUploadUrl(fileName: string, _fileType: string): Promise<PresignedUploadResult> {
    const mockId = crypto.randomUUID();
    const sanitizedName = fileName.replace(/\s+/g, '-');
    const mockKey = `${mockId}-${sanitizedName}`;

    return {
      uploadUrl: `https://mock-r2-upload.local/${mockKey}`,
      publicUrl: `https://mock-r2.local/${mockKey}`,
    };
  }

  async uploadFile(file: File, onProgress?: UploadProgressCallback): Promise<string> {
    const steps = [15, 45, 75, 100];

    for (const step of steps) {
      await this.delay(120);
      onProgress?.(step);
    }

    const objectUrl = URL.createObjectURL(file);
    const fileId = crypto.randomUUID();
    this.objectUrls.set(fileId, objectUrl);

    return objectUrl;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
