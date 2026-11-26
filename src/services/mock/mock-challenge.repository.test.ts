// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'

import { MockChallengeRepository } from '@/services/mock/mock-challenge.repository'

beforeEach(() => localStorage.clear())

it('keeps moments off the challenges of the guests', async () => {
  const repository = new MockChallengeRepository()
  const challenges = await repository.getChallenges()
  expect(challenges.some((challenge) => challenge.isMoment)).toBe(false)
  expect((await repository.getAllChallenges()).some((challenge) => challenge.isMoment)).toBe(true)
})

it('puts one moment on air at a time and tells the subscribers', async () => {
  const repository = new MockChallengeRepository()
  const listener = vi.fn()
  const unsubscribe = repository.subscribeToChanges(listener)

  await repository.setMomentLive(6, true)
  await repository.setMomentLive(7, true)
  expect((await repository.getLiveMoment())?.id).toBe(7)
  expect(listener).toHaveBeenCalledTimes(2)

  await repository.setMomentLive(7, false)
  expect(await repository.getLiveMoment()).toBeNull()

  unsubscribe()
  await repository.setMomentLive(6, true)
  expect(listener).toHaveBeenCalledTimes(3)
})

it('does not put a challenge on air', async () => {
  const repository = new MockChallengeRepository()
  await repository.setMomentLive(1, true)
  expect(await repository.getLiveMoment()).toBeNull()
})
