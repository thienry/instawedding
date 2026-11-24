interface VersionSpec {
  readonly version: number
  readonly size: number
  readonly totalDataCodewords: number
  readonly ecCodewordsPerBlock: number
  readonly numBlocks: number
  readonly alignmentCenters: readonly number[]
}

const VERSION_SPECS: readonly VersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalDataCodewords: 19,
    ecCodewordsPerBlock: 7,
    numBlocks: 1,
    alignmentCenters: [],
  },
  {
    version: 2,
    size: 25,
    totalDataCodewords: 34,
    ecCodewordsPerBlock: 10,
    numBlocks: 1,
    alignmentCenters: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalDataCodewords: 55,
    ecCodewordsPerBlock: 15,
    numBlocks: 1,
    alignmentCenters: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalDataCodewords: 80,
    ecCodewordsPerBlock: 20,
    numBlocks: 1,
    alignmentCenters: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalDataCodewords: 108,
    ecCodewordsPerBlock: 26,
    numBlocks: 1,
    alignmentCenters: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalDataCodewords: 136,
    ecCodewordsPerBlock: 18,
    numBlocks: 2,
    alignmentCenters: [6, 34],
  },
]

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) {
      x ^= 0x11d
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const root = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], root)
    }
    poly = next
  }
  return poly
}

function computeReedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getGeneratorPoly(ecCount)
  const msg = new Uint8Array(data.length + ecCount)
  msg.set(data, 0)

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef)
      }
    }
  }

  return msg.slice(data.length)
}

/** Encodes a text as QR codewords, in the smallest version it fits. */
export function encodeQrCodewords(text: string): {
  readonly spec: VersionSpec
  readonly codewords: readonly number[]
} {
  const bytes = new TextEncoder().encode(text)

  // Choose smallest version that fits Byte Mode (4 bits mode + 8 bits len + 8*N bits)
  const spec =
    VERSION_SPECS.find((v) => bytes.length + 2 <= v.totalDataCodewords) ??
    VERSION_SPECS[VERSION_SPECS.length - 1]

  const payload = bytes.slice(0, spec.totalDataCodewords - 2)

  // Build bit stream
  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1)
    }
  }

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4)
  // Character count indicator (8 bits for versions 1-9)
  pushBits(payload.length, 8)
  for (const b of payload) {
    pushBits(b, 8)
  }

  // Terminator (up to 4 zeros)
  const maxBits = spec.totalDataCodewords * 8
  const terminatorLen = Math.min(4, maxBits - bits.length)
  pushBits(0, terminatorLen)

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Pad codewords 0xEC, 0x11
  let padToggle = true
  while (bits.length < maxBits) {
    pushBits(padToggle ? 0xec : 0x11, 8)
    padToggle = !padToggle
  }

  // Convert bits to data codewords
  const dataCodewords = new Uint8Array(spec.totalDataCodewords)
  for (let i = 0; i < spec.totalDataCodewords; i++) {
    let byte = 0
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b]
    }
    dataCodewords[i] = byte
  }

  // Split into blocks and compute EC
  const blockSize = Math.floor(spec.totalDataCodewords / spec.numBlocks)
  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []

  for (let b = 0; b < spec.numBlocks; b++) {
    const block = dataCodewords.slice(b * blockSize, (b + 1) * blockSize)
    dataBlocks.push(block)
    ecBlocks.push(computeReedSolomon(block, spec.ecCodewordsPerBlock))
  }

  // Interleave blocks
  const finalCodewords: number[] = []
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i])
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i])
    }
  }

  return { spec, codewords: finalCodewords }
}
