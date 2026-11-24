import { renderFilteredAndFramedPhoto } from '@/utils/photo-renderer'

/**
 * Compresses a photo for the current network. Draws it again, which also
 * removes its metadata, such as the GPS position.
 *
 * @throws When the browser cannot read the photo.
 */
export async function compressPhoto(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    return await renderFilteredAndFramedPhoto(url, file.name, { filterId: 'none', frameId: 'none' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
