import { expect, it } from 'vitest'

import { buildZipArchive, computeCrc32 } from '@/utils/zip-exporter'

const bytes = (text: string) => new TextEncoder().encode(text)

it('computes the standard CRC-32 check value', () => {
  expect(computeCrc32(bytes('123456789'))).toBe(0xcbf43926)
  expect(computeCrc32(new Uint8Array())).toBe(0)
})

it('writes headers, content and offsets', async () => {
  const entries = [
    { filename: 'ação.txt', data: bytes('hello') },
    { filename: 'b.txt', data: bytes('world!') },
  ]
  const blob = buildZipArchive(entries)
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  const eocd = buffer.byteLength - 22

  expect(blob.type).toBe('application/zip')
  expect(view.getUint32(eocd, true)).toBe(0x06054b50)
  expect(view.getUint16(eocd + 10, true)).toBe(2)

  let central = view.getUint32(eocd + 16, true)
  for (const { filename, data } of entries) {
    expect(view.getUint32(central, true)).toBe(0x02014b50)
    const local = view.getUint32(central + 42, true)
    const nameLength = view.getUint16(local + 26, true)
    expect(view.getUint32(local, true)).toBe(0x04034b50)
    expect(view.getUint32(local + 14, true)).toBe(computeCrc32(data))
    const name = new Uint8Array(buffer, local + 30, nameLength)
    expect(new TextDecoder().decode(name)).toBe(filename)
    const content = new Uint8Array(buffer, local + 30 + nameLength, data.length)
    expect([...content]).toEqual([...data])
    central += 46 + nameLength
  }
})

it('supports an empty archive', () => {
  expect(buildZipArchive([]).size).toBe(22)
})
