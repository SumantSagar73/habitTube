import { expect, test } from '@playwright/test'
import { EMOJI_TO_KEY, ICON_KEYS, isIconKey, KEY_TO_EMOJI, toStoredEmoji } from '../../src/iconKeys.js'

// Habits are stored with a real emoji (the mobile app renders that field as text); the web app
// only shows it as a lucide icon. These tests keep the two directions consistent.

const bare = (e) => e.replace(/️/g, '')

test('every picker icon has an emoji that maps back to the same icon', () => {
  for (const key of ICON_KEYS) {
    const emoji = KEY_TO_EMOJI[key]
    expect(emoji, `emoji for ${key}`).toBeTruthy()
    expect(EMOJI_TO_KEY[bare(emoji)], `${key} -> ${emoji} -> key`).toBe(key)
  }
})

test('toStoredEmoji: keys become emoji, existing emoji are kept, junk falls back', () => {
  expect(toStoredEmoji('run')).toBe('🏃')
  expect(toStoredEmoji('🏃')).toBe('🏃')
  expect(toStoredEmoji('📖')).toBe('📖') // an alias of book: kept as the user had it
  expect(toStoredEmoji(undefined)).toBe('💪')
  expect(toStoredEmoji('not-an-icon')).toBe('💪')
  expect(toStoredEmoji('???', 'sparkles')).toBe('✨')
})

test('isIconKey only matches the words older builds saved', () => {
  expect(isIconKey('run')).toBe(true)
  expect(isIconKey('🏃')).toBe(false)
  expect(isIconKey('Morning run')).toBe(false)
  expect(isIconKey('')).toBe(false)
})
