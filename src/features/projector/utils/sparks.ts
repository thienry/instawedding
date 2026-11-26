import type { CSSProperties } from 'react'

/** Styles of the `projector-spark` elements that burst out of a celebration. */
export const SPARKS = Array.from(
  { length: 28 },
  (_, index) =>
    ({
      '--angle': `${index * 137.5}deg`,
      '--distance': `${12 + (index % 5) * 5}vh`,
      '--delay': `${250 + (index % 6) * 70}ms`,
    }) as CSSProperties
)
