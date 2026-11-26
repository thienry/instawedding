import { useEffect, useState } from 'react'

import { getBannedTermRepository } from '@/services/repositories.factory'

/**
 * Terms that guests cannot post. Empty until loaded, or if loading fails: the
 * projector still leaves those posts out.
 */
export function useBannedTermList(): readonly string[] {
  const [terms, setTerms] = useState<readonly string[]>([])
  const repository = getBannedTermRepository()

  useEffect(() => {
    let isMounted = true
    repository
      .getTerms()
      .then((loaded) => {
        if (isMounted) setTerms(loaded)
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [repository])

  return terms
}
