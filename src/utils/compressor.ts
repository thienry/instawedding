import imageCompression from 'browser-image-compression'

import {
  cacheBlurPlaceholder,
  generateBlurPlaceholder,
  getAdaptiveNetworkProfile,
  getCachedBlurPlaceholder,
} from '@/utils/blur-placeholder'

import type { AdaptiveNetworkProfile, NetworkTier } from '@/utils/blur-placeholder'

export {
  cacheBlurPlaceholder,
  generateBlurPlaceholder,
  getAdaptiveNetworkProfile,
  getCachedBlurPlaceholder,
}
export type { AdaptiveNetworkProfile, NetworkTier }

export class ImageCompressionError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ImageCompressionError'
    this.cause = cause
  }
}

export interface CompressionOptions {
  readonly maxSizeMB?: number
  readonly maxWidthOrHeight?: number
  readonly initialQuality?: number
  readonly fileType?: string
  readonly preserveExif?: boolean
}

/**
 * Compresses an image file in the browser using Web Workers and adaptive
 * mobile network parameters, converting it to an optimized WebP File.
 *
 * @param file - The raw input file from camera or file picker.
 * @param customOptions - Optional overrides for compression parameters.
 * @returns The compressed image File ready for upload.
 * @throws {ImageCompressionError} When compression fails.
 */
export async function compressPhoto(file: File, customOptions?: CompressionOptions): Promise<File> {
  const profile = getAdaptiveNetworkProfile()

  // Fast-path: if file is already WebP and smaller than target budget, skip recompression
  if (
    file.type === 'image/webp' &&
    file.size <= profile.maxSizeMB * 1024 * 1024 &&
    !customOptions
  ) {
    return file
  }

  const options = {
    maxSizeMB: profile.maxSizeMB,
    maxWidthOrHeight: profile.maxWidthOrHeight,
    initialQuality: profile.quality,
    fileType: 'image/webp',
    preserveExif: false,
    ...customOptions,
    useWebWorker: true,
  }

  try {
    const compressedBlob = await imageCompression(file, options)
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp'

    return new File([compressedBlob], fileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch (error) {
    throw new ImageCompressionError(
      `Failed to compress image "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    )
  }
}
