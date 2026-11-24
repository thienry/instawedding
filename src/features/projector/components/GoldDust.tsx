import type { CSSProperties } from 'react'

const PARTICLE_COUNT = 22
/** Spreads consecutive values evenly between 0 and 1. */
const GOLDEN_RATIO = 0.618

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const spread = (index * GOLDEN_RATIO) % 1
  const duration = 16 + (index % 5) * 4
  return {
    '--x': `${spread * 100}%`,
    '--size': `${2 + (index % 3) * 1.5}px`,
    '--drift': `${((index % 7) - 3) * 2}vw`,
    '--duration': `${duration}s`,
    // Negative, so the air is already full when the page opens
    '--delay': `${-((index * 5.3) % duration)}s`,
  } as CSSProperties
})

/** Specks of gold rising slowly through the room. */
export function GoldDust() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((style, index) => (
        <span key={index} style={style} className="projector-dust" />
      ))}
    </div>
  )
}
