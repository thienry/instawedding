import { useEffect, useState } from 'react'

import { getReactionService } from '@/services/reaction.factory'

/** Whether any projector is receiving reactions. */
export function useProjectorActive(): boolean {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => getReactionService().watchProjector(setIsActive), [])

  return isActive
}
