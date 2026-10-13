import type { StorageService } from './contracts/storage.contract';
import { MockStorageService } from './mock/mock-storage.service';
import { R2StorageService } from './r2/r2-storage.service';

const isMockEnabled = import.meta.env.VITE_USE_MOCKS !== 'false';

let storageInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageInstance) {
    storageInstance = isMockEnabled ? new MockStorageService() : new R2StorageService();
  }
  return storageInstance;
}
