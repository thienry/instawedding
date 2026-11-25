import { expect, it } from 'vitest'

import { MAX_BATCH_SIZE, parseReactions } from '@/utils/reactions'

it.each([null, 'x', 1, {}, { emojis: '❤️' }, { emojis: null }])('ignores %j', (payload) => {
  expect(parseReactions(payload)).toEqual([])
})

it('drops what is not a reaction', () => {
  expect(parseReactions({ emojis: ['❤️', '<b>', 5, '💩', '🥂'] })).toEqual(['❤️', '🥂'])
})

it('limits the size of a message', () => {
  expect(parseReactions({ emojis: Array(500).fill('🔥') })).toHaveLength(MAX_BATCH_SIZE)
})
