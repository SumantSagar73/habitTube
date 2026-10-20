// Plain list of habit icon keys (no JSX) so non-UI modules such as ai.js can use it.
export const ICON_KEYS = [
  'dumbbell', 'run', 'walk', 'stretch', 'bike', 'mountain', 'book', 'study',
  'pen', 'journal', 'brain', 'language', 'code', 'work', 'target', 'rocket',
  'water', 'salad', 'coffee', 'pill', 'meditate', 'gratitude', 'wind', 'leaf',
  'sunrise', 'sun', 'moon', 'bed', 'shower', 'clean', 'money', 'music',
  'headphones', 'camera', 'nophone', 'nosmoke', 'heart', 'flame', 'zap', 'sparkles',
]
export const ICON_KEYS_PROMPT = ICON_KEYS.join(', ')

// Habits keep a REAL emoji in their saved `emoji` field, because the mobile app renders that
// field as text. The web app shows it as a lucide icon (see icons.jsx), so the emoji is only
// ever the storage format here.
export const KEY_TO_EMOJI = {
  dumbbell: '💪', run: '🏃', walk: '🚶', stretch: '🤸', bike: '🚴', mountain: '⛰️', book: '📚', study: '🎓',
  pen: '✍️', journal: '📔', brain: '🧠', language: '🗣️', code: '💻', work: '💼', target: '🎯', rocket: '🚀',
  water: '💧', salad: '🥗', coffee: '☕', pill: '💊', meditate: '🧘', gratitude: '🙏', wind: '🌬️', leaf: '🌿',
  sunrise: '🌅', sun: '☀️', moon: '🌙', bed: '😴', shower: '🚿', clean: '🧹', money: '💰', music: '🎵',
  headphones: '🎧', camera: '📷', nophone: '📵', nosmoke: '🚭', heart: '❤️', flame: '🔥', zap: '⚡', sparkles: '✨',
  // not in the picker, but used by templates and older habits
  pencil: '✏️', tree: '🌲', home: '🏠', phone: '📱', apple: '🍎', bulb: '💡', star: '⭐', check: '✅', clock: '⏰', smile: '🙂', guitar: '🎸', podcast: '🎙️', savings: '🐷',
}

const strip = (v) => String(v).replace(/\uFE0F/g, '').trim()

// emoji (without variation selector) -> key
export const EMOJI_TO_KEY = {
  ...Object.fromEntries(Object.entries(KEY_TO_EMOJI).map(([key, e]) => [strip(e), key])),
  '🏋': 'dumbbell', '📖': 'book', '📝': 'pen', '🛏': 'bed', '🦷': 'sparkles',
}

// Whatever we are given (an icon key, an emoji, or nothing) -> the emoji to save.
// Existing emoji are kept as they are; icon keys become their emoji.
export function toStoredEmoji(value, fallbackKey = 'dumbbell') {
  if (value && KEY_TO_EMOJI[value]) return KEY_TO_EMOJI[value]
  if (value && EMOJI_TO_KEY[strip(value)]) return value
  return KEY_TO_EMOJI[fallbackKey]
}

// True for the short ASCII words older builds saved (e.g. 'run').
export const isIconKey = (value) => typeof value === 'string' && /^[a-z]+$/.test(value) && value in KEY_TO_EMOJI
