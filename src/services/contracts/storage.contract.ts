import type { PresignedUploadResult, UploadProgressCallback } from '../../types/domain';

export interface StorageService {
  getPresignedUploadUrl(fileName: string, fileType: string): Promise<PresignedUploadResult>;
  uploadFile(file: File, onProgress?: UploadProgressCallback): Promise<string>;
}
