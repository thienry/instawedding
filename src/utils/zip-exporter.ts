/**
 * Zero-dependency streaming ZIP file builder using Compression Method 0 (Store).
 * 
 * Pre-compressed media files (WebP images, MP4 videos) gain less than 0.1% from Deflate
 * compression while consuming massive client-side CPU/memory. Storing them in standard
 * uncompressed ZIP chunks enables ultra-fast packing without browser freezing.
 */

// Standard IEEE 802.3 CRC-32 Lookup Table
const CRC32_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC32_TABLE[i] = c >>> 0
}

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte !== undefined) {
      crc = (crc >>> 8) ^ (CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  readonly filename: string
  readonly data: Uint8Array
  readonly date?: Date
}

function writeUint16LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function formatDosDateTime(date: Date): { time: number; date: number } {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f)
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f)
  return { time: dosTime, date: dosDate }
}

/**
 * Packs multiple entries into a standard, universally compatible ZIP Blob.
 */
export function buildZipArchive(entries: readonly ZipEntry[]): Blob {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []

  let currentOffset = 0

  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.filename)
    const fileData = entry.data
    const crc = computeCrc32(fileData)
    const size = fileData.length
    const { time: dosTime, date: dosDate } = formatDosDateTime(entry.date ?? new Date())

    // 1. Local File Header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + filenameBytes.length)
    writeUint32LE(localHeader, 0, 0x04034b50) // Local file header signature
    writeUint16LE(localHeader, 4, 20) // Version needed (2.0)
    writeUint16LE(localHeader, 6, 0x0800) // General purpose bit flag (Bit 11: UTF-8 filename)
    writeUint16LE(localHeader, 8, 0) // Compression method: 0 (Store)
    writeUint16LE(localHeader, 10, dosTime)
    writeUint16LE(localHeader, 12, dosDate)
    writeUint32LE(localHeader, 14, crc)
    writeUint32LE(localHeader, 18, size) // Compressed size
    writeUint32LE(localHeader, 22, size) // Uncompressed size
    writeUint16LE(localHeader, 26, filenameBytes.length)
    writeUint16LE(localHeader, 28, 0) // Extra field length
    localHeader.set(filenameBytes, 30)

    localParts.push(localHeader)
    localParts.push(fileData)

    // 2. Central Directory Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + filenameBytes.length)
    writeUint32LE(centralHeader, 0, 0x02014b50) // Central directory file header signature
    writeUint16LE(centralHeader, 4, 20) // Version made by (2.0)
    writeUint16LE(centralHeader, 6, 20) // Version needed (2.0)
    writeUint16LE(centralHeader, 8, 0x0800) // General purpose bit flag (UTF-8)
    writeUint16LE(centralHeader, 10, 0) // Compression method: 0 (Store)
    writeUint16LE(centralHeader, 12, dosTime)
    writeUint16LE(centralHeader, 14, dosDate)
    writeUint32LE(centralHeader, 16, crc)
    writeUint32LE(centralHeader, 20, size)
    writeUint32LE(centralHeader, 24, size)
    writeUint16LE(centralHeader, 28, filenameBytes.length)
    writeUint16LE(centralHeader, 30, 0) // Extra field length
    writeUint16LE(centralHeader, 32, 0) // File comment length
    writeUint16LE(centralHeader, 34, 0) // Disk number start
    writeUint16LE(centralHeader, 36, 0) // Internal file attributes
    writeUint32LE(centralHeader, 38, 0) // External file attributes
    writeUint32LE(centralHeader, 42, currentOffset) // Relative offset of local header
    centralHeader.set(filenameBytes, 46)

    centralParts.push(centralHeader)

    currentOffset += localHeader.length + fileData.length
  }

  const centralOffset = currentOffset
  let centralSize = 0
  for (const part of centralParts) {
    centralSize += part.length
  }

  // 3. End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22)
  writeUint32LE(eocd, 0, 0x06054b50) // End of central dir signature
  writeUint16LE(eocd, 4, 0) // Number of this disk
  writeUint16LE(eocd, 6, 0) // Disk where central directory starts
  writeUint16LE(eocd, 8, entries.length) // Number of central directory records on this disk
  writeUint16LE(eocd, 10, entries.length) // Total number of central directory records
  writeUint32LE(eocd, 12, centralSize) // Size of central directory
  writeUint32LE(eocd, 16, centralOffset) // Offset of start of central directory
  writeUint16LE(eocd, 20, 0) // Comment length

  return new Blob([...localParts, ...centralParts, eocd] as unknown as BlobPart[], {
    type: 'application/zip',
  })
}
