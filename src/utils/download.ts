const REVOKE_DELAY_MS = 60_000

/** Makes the browser download a blob as `fileName`. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Safari may still be reading it
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
