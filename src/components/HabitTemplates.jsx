import { todayKey, uid } from '../utils'

const PACKS = [
  {
    key: 'morning',
    name: 'Morning Routine',
    emoji: '🌅',
    description: '5 keystone habits to start every day right',
    habits: [
      { name: 'Make bed', emoji: '🛏️', days: [0, 1, 2, 3, 4, 5, 6], time: '07:00' },
      { name: 'Meditate 10 min', emoji: '🧘', days: [0, 1, 2, 3, 4, 5, 6], time: '07:15' },
      { name: 'Exercise', emoji: '🏋️', days: [1, 2, 3, 4, 5], time: '07:30' },
      { name: 'Read 20 minutes', emoji: '📚', days: [0, 1, 2, 3, 4, 5, 6], time: '08:00' },
      { name: 'Cold shower', emoji: '🚿', days: [0, 1, 2, 3, 4, 5, 6], time: '07:45' },
    ],
  },
  {
    key: 'fitness',
    name: 'Fitness',
    emoji: '💪',
    description: 'Build a consistent movement practice',
    habits: [
      { name: 'Workout', emoji: '🏋️', days: [1, 3, 5], time: '' },
      { name: 'Walk 10,000 steps', emoji: '🚶', days: [0, 1, 2, 3, 4, 5, 6], time: '' },
      { name: 'Stretch', emoji: '🤸', days: [0, 1, 2, 3, 4, 5, 6], time: '21:00' },
      { name: 'Track calories', emoji: '🥗', days: [0, 1, 2, 3, 4, 5, 6], time: '' },
      { name: 'Drink 2L water', emoji: '💧', days: [0, 1, 2, 3, 4, 5, 6], time: '' },
    ],
  },
  {
    key: 'learning',
    name: 'Learning',
    emoji: '🧠',
    description: 'Daily habits for continuous growth',
    habits: [
      { name: 'Read 30 minutes', emoji: '📖', days: [0, 1, 2, 3, 4, 5, 6], time: '' },
      { name: 'Study / practice', emoji: '✏️', days: [1, 2, 3, 4, 5], time: '' },
      { name: 'Write in journal', emoji: '📔', days: [0, 1, 2, 3, 4, 5, 6], time: '22:00' },
      { name: 'No phone 1st hour', emoji: '📵', days: [0, 1, 2, 3, 4, 5, 6], time: '' },
      { name: 'Listen to podcast', emoji: '🎧', days: [1, 2, 3, 4, 5], time: '' },
    ],
  },
  {
    key: 'mindfulness',
    name: 'Mindfulness',
    emoji: '🌿',
    description: 'Ground yourself and reduce stress daily',
    habits: [
      { name: 'Morning meditation', emoji: '🧘', days: [0, 1, 2, 3, 4, 5, 6], time: '07:00' },
      { name: 'Gratitude journal', emoji: '🙏', days: [0, 1, 2, 3, 4, 5, 6], time: '22:00' },
      { name: 'Screen-free evening', emoji: '🌙', days: [0, 1, 2, 3, 4, 5, 6], time: '21:00' },
      { name: 'Deep breathing', emoji: '🌬️', days: [0, 1, 2, 3, 4, 5, 6], time: '' },
      { name: 'Walk in nature', emoji: '🌲', days: [0, 6], time: '' },
    ],
  },
]

export default function HabitTemplates({ existingHabits, onInstall, onClose }) {
  const existingNames = new Set(existingHabits.map((h) => h.name.toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-fade-up w-full max-w-lg overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]"
        style={{ maxHeight: '85dvh' }}
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Habit library</h2>
            <p className="mt-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">
              Install a pack with one click — duplicates are skipped
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {PACKS.map((pack) => {
            const toInstall = pack.habits.filter((h) => !existingNames.has(h.name.toLowerCase()))
            return (
              <div key={pack.key} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-extrabold text-neutral-900 dark:text-white">
                      {pack.emoji} {pack.name}
                    </h3>
                    <p className="mt-0.5 text-sm font-medium text-neutral-400 dark:text-neutral-500">{pack.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!toInstall.length) return
                      const created = todayKey()
                      onInstall(toInstall.map((h) => ({ ...h, id: uid(), createdAt: created, color: '#171717' })))
                      onClose()
                    }}
                    disabled={toInstall.length === 0}
                    className="shrink-0 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:cursor-not-allowed"
                  >
                    {toInstall.length === 0 ? '✓ Installed' : `+ ${toInstall.length} habits`}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pack.habits.map((h) => (
                    <span
                      key={h.name}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        existingNames.has(h.name.toLowerCase())
                          ? 'bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800 dark:text-neutral-600'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {h.emoji} {h.name}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
