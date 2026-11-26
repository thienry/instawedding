// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'

import { usePostDraft } from '@/features/capture/hooks/usePostDraft'
import { getChallengeRepository } from '@/services/repositories.factory'
import { setupBrowser } from '@/test/browser'

setupBrowser()

it('goes to the moment on air until the guest chooses, even after it ends', async () => {
  await getChallengeRepository().setMomentLive(7, true)
  const { result } = renderHook(() => usePostDraft(null))
  await waitFor(() => expect(result.current.challengeId).toBe(7))
  expect(result.current.challenges[0]?.id).toBe(7)

  await act(() => getChallengeRepository().setMomentLive(7, false))
  expect(result.current.challengeId).toBe(7)

  act(() => result.current.setChallengeId(null))
  expect(result.current.challengeId).toBeNull()
})

it('keeps the challenge of the link', async () => {
  await getChallengeRepository().setMomentLive(7, true)
  const { result } = renderHook(() => usePostDraft(2))
  await waitFor(() => expect(result.current.moment?.id).toBe(7))
  expect(result.current.challengeId).toBe(2)
})
