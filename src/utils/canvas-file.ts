/** Names a file after what it really contains. */
export function toImageFile(blob: Blob, baseName: string): File {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png' }[blob.type] ?? 'webp'
  return new File([blob], `${baseName}.${extension}`, {
    type: blob.type || 'image/webp',
    lastModified: Date.now(),
  })
}

/** Encodes a canvas as WebP, or as JPEG where WebP would become a heavy PNG. */
export async function canvasToFile(
  canvas: HTMLCanvasElement,
  baseName: string,
  quality: number
): Promise<File> {
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

  let blob = await encode('image/webp')
  if (blob?.type === 'image/png') blob = await encode('image/jpeg')
  if (!blob) throw new Error('Failed to generate image blob from Canvas.')
  return toImageFile(blob, baseName)
}
