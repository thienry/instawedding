import { useCallback, useState } from 'react'

import { DialogModal } from '@/components/common/DialogModal'

import type { DialogOptions } from '@/components/common/DialogModal'

type DialogRequest = DialogOptions & {
  readonly resolve: (confirmed: boolean) => void
}

/** In-app replacement for the browser alert, confirm and prompt popups. */
export function useDialog() {
  const [queue, setQueue] = useState<readonly DialogRequest[]>([])
  const current = queue[0]

  const confirm = useCallback(
    (options: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        setQueue((prev) => [...prev, { ...options, resolve }])
      }),
    []
  )

  const notify = useCallback(
    async (message: string) => {
      await confirm({ title: 'Aviso', message, confirmLabel: 'Entendi' })
    },
    [confirm]
  )

  const close = (confirmed: boolean) => {
    current?.resolve(confirmed)
    setQueue((prev) => prev.slice(1))
  }

  const dialog = current ? (
    <DialogModal key={queue.length} {...current} onClose={close} />
  ) : null

  return { confirm, notify, dialog }
}
