// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'

import { useProjectorReactions } from '@/features/projector/hooks/useProjectorReactions'
import { getReactionService } from '@/services/reaction.factory'

import type { ReactionEmoji } from '@/utils/reactions'

const send = (emojis: readonly ReactionEmoji[]) => act(() => getReactionService().send(emojis))

it('shows reactions, up to a limit', async () => {
  const { result } = renderHook(() => useProjectorReactions())
  await send(['❤️', '🥂'])
  expect(result.current.emojis.items.map(({ emoji }) => emoji)).toEqual(['❤️', '🥂'])
  for (let i = 0; i < 20; i++) await send(['🔥', '🔥', '🔥', '🔥', '🔥'])
  expect(result.current.emojis.items).toHaveLength(40)
})

it('makes room as emojis vanish', async () => {
  const { result } = renderHook(() => useProjectorReactions())
  await send(['❤️'])
  act(() => result.current.emojis.remove(result.current.emojis.items[0]!.id))
  expect(result.current.emojis.items).toEqual([])
})

it('can be turned off and on', async () => {
  const { result } = renderHook(() => useProjectorReactions())
  await send(['❤️'])
  act(() => result.current.toggle())
  await send(['❤️'])
  expect(result.current.emojis.items).toEqual([])
  act(() => result.current.toggle())
  await send(['👏'])
  expect(result.current.emojis.items).toHaveLength(1)
})
