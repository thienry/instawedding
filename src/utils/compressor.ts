import imageCompression from 'browser-image-compression'

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
  readonly fileType?: string
  readonly preserveExif?: boolean
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1280,
  fileType: 'image/webp',
  preserveExif: false,
}

/**
 * Compresses an image file in the browser and converts it to WebP format.
 *
 * @param file - The raw input file from camera or file picker.
 * @param customOptions - Optional overrides for compression parameters.
 * @returns The compressed image File ready for upload.
 * @throws {ImageCompressionError} When compression fails.
 */
export async function compressPhoto(
  file: File,
  customOptions?: CompressionOptions
): Promise<File> {
  const options = {
    ...DEFAULT_OPTIONS,
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
