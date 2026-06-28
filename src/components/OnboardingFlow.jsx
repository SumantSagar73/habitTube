import { useState } from 'react'

const STEP_ICONS = [
  <svg key="habit" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  <svg key="goal" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  <svg key="timer" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>,
]

const STEPS = [
  {
    title: 'Create your first habit',
    desc: 'Habits are the foundation. Pick something small — 10 minutes of reading, a glass of water, a short walk. Consistency beats intensity every time.',
    cta: 'Create a habit',
    skip: 'Skip for now',
    action: 'habit',
  },
  {
    title: 'Set your first goal',
    desc: 'Goals give your habits direction. Link them together to see how daily actions build toward big outcomes — year → quarter → month → week.',
    cta: 'Create a goal',
    skip: 'Skip for now',
    action: 'goal',
  },
  {
    title: 'Try the focus timer',
    desc: "Deep work sessions compound over time. Use the Pomodoro timer on Today's view to log focused work — it all adds up in your Insights.",
    cta: "Let's go",
    skip: null,
    action: 'done',
  },
]

export default function OnboardingFlow({ onComplete, onOpenHabit, onOpenGoal }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  function handleCta() {
    if (s.action === 'habit') { onOpenHabit(); setStep(1) }
    else if (s.action === 'goal') { onOpenGoal(); setStep(2) }
    else onComplete()
  }

  function handleSkip() {
    if (step < STEPS.length - 1) setStep((v) => v + 1)
    else onComplete()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-fade-up w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl dark:border-neutral-800 dark:bg-[#111]">
        {/* progress dots */}
        <div className="mb-7 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-neutral-900 dark:bg-white'
                  : i < step
                  ? 'w-1.5 bg-neutral-400 dark:bg-neutral-600'
                  : 'w-1.5 bg-neutral-200 dark:bg-neutral-800'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <div className="mb-5 flex justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              {STEP_ICONS[step]}
            </span>
          </div>
          <h2 className="mb-2 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{s.title}</h2>
          <p className="mb-7 text-sm font-medium leading-relaxed text-neutral-500 dark:text-neutral-400">{s.desc}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleCta}
            className="w-full rounded-full bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {s.cta}
          </button>
          {s.skip && (
            <button
              onClick={handleSkip}
              className="w-full py-2 text-sm font-semibold text-neutral-400 transition hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              {s.skip}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
