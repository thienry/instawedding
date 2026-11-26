import { useEffect, useState } from 'react'

import { getBannedTermRepository } from '@/services/repositories.factory'
import { BANNED_TERM_MAX_LENGTH, normalizeText } from '@/utils/banned-terms'

import type { Dialog } from '@/hooks/useDialog'

/** Banned terms and their form, as returned by {@link useBannedTerms}. */
export interface BannedTermsAdmin {
  /** Normalized, in alphabetical order. */
  readonly terms: readonly string[]
  readonly draft: string
  readonly setDraft: (draft: string) => void
  readonly isSaving: boolean
  /** Adds the draft and clears it. Does nothing if it is blank. */
  readonly addTerm: () => Promise<void>
  readonly removeTerm: (term: string) => Promise<void>
}

/**
 * Manages the terms that keep a post off the projector. Failures are shown in
 * a dialog and leave the list untouched.
 *
 * @param isSignedIn - Nothing is loaded before the moderator signs in.
 */
export function useBannedTerms(isSignedIn: boolean, { notify }: Dialog): BannedTermsAdmin {
  const [terms, setTerms] = useState<readonly string[]>([])
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const repository = getBannedTermRepository()

  useEffect(() => {
    if (!isSignedIn) return
    let isMounted = true
    repository
      .getTerms()
      .then((loaded) => {
        if (isMounted) setTerms(loaded)
      })
      // The list stays empty; adding a term still works
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [isSignedIn, repository])

  const addTerm = async () => {
    if (!normalizeText(draft)) return
    if (normalizeText(draft).length > BANNED_TERM_MAX_LENGTH) {
      void notify(`O termo pode ter até ${BANNED_TERM_MAX_LENGTH} caracteres.`)
      return
    }
    setIsSaving(true)
    try {
      const stored = await repository.addTerm(draft)
      setTerms((prev) => [...new Set([...prev, stored])].sort((a, b) => a.localeCompare(b)))
      setDraft('')
    } catch (err) {
      void notify(err instanceof Error ? err.message : 'Não foi possível adicionar o termo.')
    } finally {
      setIsSaving(false)
    }
  }

  const removeTerm = async (term: string) => {
    try {
      await repository.removeTerm(term)
      setTerms((prev) => prev.filter((stored) => stored !== term))
    } catch {
      void notify('Não foi possível remover o termo.')
    }
  }

  return { terms, draft, setDraft, isSaving, addTerm, removeTerm }
}
