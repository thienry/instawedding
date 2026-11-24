import { useMemo } from 'react'

import { buildQrMatrix } from '@/utils/qr-code'

interface QrCodeSvgProps {
  readonly value: string
  readonly size?: number
  readonly className?: string
}

/** QR Code drawn as SVG. */
export function QrCodeSvg({ value, size = 120, className = '' }: QrCodeSvgProps) {
  const matrix = useMemo(() => buildQrMatrix(value), [value])
  const count = matrix.length
  const quietZone = 2
  const viewBoxSize = count + quietZone * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={`QR Code para ${value}`}>
      <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" rx={1.5} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#142017"
            />
          ) : null
        )
      )}
    </svg>
  )
}
