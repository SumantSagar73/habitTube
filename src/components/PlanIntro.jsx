import { TEMPLATES } from '../templates'

const STEPS = [
  { n: '1', t: 'Set the big goal', d: 'Name what you want by the end of the year.' },
  { n: '2', t: 'Break it down', d: 'Quarter → month → week, each a smaller bite.' },
  { n: '3', t: 'Just do today', d: 'Tick daily tasks — every level fills automatically.' },
]

export default function PlanIntro({ onUseTemplate, onAddGoal }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 p-7 dark:border-neutral-800 dark:bg-[#111]">
        <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Turn a big goal into daily moves
        </h2>
        <p className="mt-1.5 max-w-2xl font-medium text-neutral-500 dark:text-neutral-400">
          Plan breaks your year into quarters, months and weeks — then daily tasks. Finish a task and the
          progress flows all the way up, so your year is never out of sight.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
                {s.n}
              </span>
              <p className="mt-3 font-bold text-neutral-900 dark:text-white">{s.t}</p>
              <p className="mt-0.5 text-sm font-medium text-neutral-400 dark:text-neutral-500">{s.d}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onAddGoal}
          className="mt-6 rounded-full bg-neutral-900 px-6 py-2.5 font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          + Add my first goal
        </button>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
          …or start from an example
        </h3>
        <p className="mb-4 text-sm font-medium text-neutral-400 dark:text-neutral-500">
          One click builds a complete year → week thread you can edit. Best way to see how it all connects.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => onUseTemplate(t)}
              className="rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#111] dark:hover:border-neutral-600"
            >
              <span className="text-3xl">{t.emoji}</span>
              <p className="mt-3 font-bold text-neutral-900 dark:text-white">{t.name}</p>
              <p className="mt-0.5 text-sm font-medium text-neutral-400 dark:text-neutral-500">{t.blurb}</p>
              <span className="mt-3 inline-block text-xs font-bold text-neutral-900 dark:text-white">Use this →</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
