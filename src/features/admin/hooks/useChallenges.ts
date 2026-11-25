import { useState } from 'react'

import { DESTRUCTIVE_DIALOG } from '@/features/admin/constants'
import { getChallengeRepository } from '@/services/repositories.factory'

import type { AdminData } from '@/features/admin/hooks/useAdminData'
import type { ChallengeDraft } from '@/features/admin/types'
import type { Dialog } from '@/hooks/useDialog'
import type { Challenge } from '@/types/domain'

const DEFAULT_ICON = '✨'
const INITIAL_DRAFT: ChallengeDraft = { icon: '🥂', title: '', description: '' }

/** Challenge form and actions, as returned by {@link useChallenges}. */
export interface ChallengeAdmin {
  readonly draft: ChallengeDraft
  /** Changes some fields of the draft. */
  readonly updateDraft: (changes: Partial<ChallengeDraft>) => void
  readonly isCreating: boolean
  /** Saves the draft and resets the form. Does nothing if a text is blank. */
  readonly createChallenge: () => Promise<void>
  readonly toggleChallenge: (challenge: Challenge) => Promise<void>
  /** Deletes a challenge after confirmation. */
  readonly deleteChallenge: (id: number) => Promise<void>
}

/**
 * Manages the party challenges. Failures are shown in a dialog and leave the
 * list and the draft untouched.
 *
 * @param data - Setter of the dashboard challenges.
 * @param dialog - Dialogs used to confirm actions and report failures.
 */
export function useChallenges(
  { setChallenges }: Pick<AdminData, 'setChallenges'>,
  { confirm, notify }: Dialog
): ChallengeAdmin {
  const [draft, setDraft] = useState(INITIAL_DRAFT)
  const [isCreating, setIsCreating] = useState(false)
  const challengeRepository = getChallengeRepository()

  const createChallenge = async () => {
    const title = draft.title.trim()
    const description = draft.description.trim()
    if (!title || !description) return

    setIsCreating(true)
    try {
      const created = await challengeRepository.createChallenge({
        title,
        description,
        icon: draft.icon.trim() || DEFAULT_ICON,
      })
      setChallenges((prev) => [...prev, created])
      setDraft({ icon: DEFAULT_ICON, title: '', description: '' })
    } catch {
      void notify('Não foi possível criar o desafio. Tente novamente.')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleChallenge = async ({ id, isActive: wasActive }: Challenge) => {
    const isActive = !wasActive
    try {
      await challengeRepository.setChallengeActive(id, isActive)
      setChallenges((prev) =>
        prev.map((challenge) => (challenge.id === id ? { ...challenge, isActive } : challenge))
      )
    } catch {
      void notify('Não foi possível alterar o status do desafio.')
    }
  }

  const deleteChallenge = async (id: number) => {
    const isConfirmed = await confirm({
      ...DESTRUCTIVE_DIALOG,
      title: 'Excluir desafio?',
      message: 'Este desafio será removido permanentemente.',
      confirmLabel: 'Excluir',
    })
    if (!isConfirmed) return

    try {
      await challengeRepository.deleteChallenge(id)
      setChallenges((prev) => prev.filter((challenge) => challenge.id !== id))
    } catch {
      void notify('Não foi possível excluir o desafio.')
    }
  }

  return {
    draft,
    updateDraft: (changes) => setDraft((prev) => ({ ...prev, ...changes })),
    isCreating,
    createChallenge,
    toggleChallenge,
    deleteChallenge,
  }
}
