import { useEffect, useState } from 'react'

import { DESTRUCTIVE_DIALOG } from '@/features/admin/constants'
import { getCeremonialistRepository } from '@/services/repositories.factory'

import type { CeremonialistDraft, Feedback } from '@/features/admin/types'
import type { Dialog } from '@/hooks/useDialog'
import type { Ceremonialist } from '@/types/domain'

const EMPTY_DRAFT: CeremonialistDraft = { email: '', name: '' }

/** Ceremonialist list, form and actions, from {@link useCeremonialists}. */
export interface CeremonialistAdmin {
  readonly ceremonialists: readonly Ceremonialist[]
  readonly draft: CeremonialistDraft
  /** Changes some fields of the draft. */
  readonly updateDraft: (changes: Partial<CeremonialistDraft>) => void
  readonly isAdding: boolean
  /** Result of the last action, or `null` when there is none to show. */
  readonly feedback: Feedback | null
  /** Grants access to the drafted email and resets the form. */
  readonly addCeremonialist: () => Promise<void>
  /** Revokes an access after confirmation. */
  readonly removeCeremonialist: (ceremonialist: Ceremonialist) => Promise<void>
}

function toErrorFeedback(error: unknown, fallback: string): Feedback {
  return {
    type: 'error',
    message: error instanceof Error ? error.message : fallback,
  }
}

/**
 * Manages who may moderate as a ceremonialist.
 *
 * @param isEnabled - Whether the user may manage them; loads nothing otherwise.
 * @param dialog - Dialogs used to confirm revocations.
 */
export function useCeremonialists(
  isEnabled: boolean,
  { confirm }: Dialog
): CeremonialistAdmin {
  const [ceremonialists, setCeremonialists] = useState<
    readonly Ceremonialist[]
  >([])
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [isAdding, setIsAdding] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const ceremonialistRepository = getCeremonialistRepository()

  useEffect(() => {
    if (!isEnabled) return
    let isMounted = true

    ceremonialistRepository
      .getCeremonialists()
      .then((list) => {
        if (isMounted) setCeremonialists(list)
      })
      .catch(() => {
        // The panel stays usable with an empty list
      })

    return () => {
      isMounted = false
    }
  }, [isEnabled, ceremonialistRepository])

  const addCeremonialist = async () => {
    const email = draft.email.trim().toLowerCase()
    setFeedback(null)
    setIsAdding(true)

    try {
      const created = await ceremonialistRepository.addCeremonialist({
        email,
        name: draft.name.trim() || undefined,
      })
      setCeremonialists((prev) => [
        created,
        ...prev.filter(
          (item) => item.email.toLowerCase() !== created.email.toLowerCase()
        ),
      ])
      setDraft(EMPTY_DRAFT)
      setFeedback({
        type: 'success',
        message: `Acesso concedido com sucesso para ${email}!`,
      })
    } catch (error) {
      setFeedback(
        toErrorFeedback(error, 'Falha ao conceder acesso de cerimonial.')
      )
    } finally {
      setIsAdding(false)
    }
  }

  const removeCeremonialist = async ({ id, email }: Ceremonialist) => {
    const isConfirmed = await confirm({
      ...DESTRUCTIVE_DIALOG,
      title: 'Revogar acesso?',
      message: `${email} perderá o acesso de cerimonial.`,
      confirmLabel: 'Revogar',
    })
    if (!isConfirmed) return

    setFeedback(null)
    try {
      await ceremonialistRepository.removeCeremonialist(id)
      setCeremonialists((prev) => prev.filter((item) => item.id !== id))
      setFeedback({
        type: 'success',
        message: `Acesso revogado com sucesso para ${email}.`,
      })
    } catch (error) {
      setFeedback(toErrorFeedback(error, 'Falha ao revogar acesso.'))
    }
  }

  return {
    ceremonialists,
    draft,
    updateDraft: (changes) => setDraft((prev) => ({ ...prev, ...changes })),
    isAdding,
    feedback,
    addCeremonialist,
    removeCeremonialist,
  }
}
