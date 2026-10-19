import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, Download, Flag, LogOut, Moon, Plus, Repeat, Rocket, Settings, Sun, Timer } from 'lucide-react'
import NotificationCenter from '../NotificationCenter'

const iconBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
const menuItem =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800'

// Closes a dropdown on outside click / Escape.
function useDismiss(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const key = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, onClose])
  return ref
}

function NewMenu({ onHabit, onGoal, onArc }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const pick = (fn) => () => { setOpen(false); fn() }
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} /> New
      </button>
      {open && (
        <div className="glass-strong absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border p-1 shadow-xl">
          <button onClick={pick(onHabit)} className={menuItem}>
            <Repeat className="h-4 w-4 shrink-0 text-neutral-500" /> Habit <span className="text-xs font-normal text-neutral-400">recurring</span>
          </button>
          <button onClick={pick(onGoal)} className={menuItem}>
            <Flag className="h-4 w-4 shrink-0 text-neutral-500" /> Goal <span className="text-xs font-normal text-neutral-400">one-time</span>
          </button>
          <button onClick={pick(onArc)} className={menuItem}>
            <Rocket className="h-4 w-4 shrink-0 text-neutral-500" /> Arc <span className="text-xs font-normal text-neutral-400">1–3 months</span>
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ name, email, dark, onSettings, onExport, onToggleTheme, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const pick = (fn) => () => { setOpen(false); fn() }
  const initial = (name || email || '?')[0].toUpperCase()
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        aria-expanded={open}
        title="Profile"
        className="flex h-10 items-center gap-1.5 rounded-full border border-neutral-200 pl-1 pr-2.5 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">{initial}</span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>
      {open && (
        <div className="glass-strong absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border p-1 shadow-xl">
          <div className="px-3 pb-2 pt-2.5">
            <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{name || 'You'}</p>
            {email && <p className="truncate text-xs font-medium text-neutral-400 dark:text-neutral-500">{email}</p>}
          </div>
          <div className="my-1 border-t border-neutral-200/70 dark:border-neutral-800" />
          <button onClick={pick(onSettings)} className={menuItem}>
            <Settings className="h-4 w-4 shrink-0 text-neutral-500" /> Settings
          </button>
          <button onClick={pick(onExport)} className={menuItem}>
            <Download className="h-4 w-4 shrink-0 text-neutral-500" /> Export to Excel
          </button>
          <a
            href="https://sumantsagar73.github.io/habitTube/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={menuItem}
          >
            <BookOpen className="h-4 w-4 shrink-0 text-neutral-500" /> User manual
          </a>
          <button onClick={onToggleTheme} className={menuItem}>
            {dark ? <Sun className="h-4 w-4 shrink-0 text-neutral-500" /> : <Moon className="h-4 w-4 shrink-0 text-neutral-500" />}
            {dark ? 'Light theme' : 'Dark theme'}
          </button>
          <div className="my-1 border-t border-neutral-200/70 dark:border-neutral-800" />
          <button onClick={pick(onSignOut)} className={menuItem}>
            <LogOut className="h-4 w-4 shrink-0 text-neutral-500" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// Logo + tabs on the left; sync, focus clock, New, bell and one profile menu on the right.
export default function AppHeader({
  tabs, tab, onTab, hidden, syncStatus, focusClock, onFocusClick,
  onNewHabit, onNewGoal, onNewArc, notifications, onMarkRead, onMarkAllRead, onClear,
  name, email, dark, onSettings, onExport, onToggleTheme, onSignOut,
}) {
  return (
    <header className={`flex items-center justify-between gap-3 border-b border-neutral-200 py-5 dark:border-neutral-800 ${hidden ? 'hidden' : ''}`}>
      <div className="flex items-center gap-6">
        <h1 className="shrink-0 text-[22px] font-extrabold tracking-tight">
          HabitTube<span className="text-neutral-400 dark:text-neutral-600">.</span>
        </h1>
        <nav className="hidden gap-1 rounded-full border border-neutral-200 p-1 md:flex dark:border-neutral-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={`rounded-full px-4.5 py-1.5 text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-2.5">
        <span
          title={syncStatus === 'synced' ? 'Synced to Supabase' : syncStatus === 'syncing' ? 'Syncing…' : 'Offline — saved on this device'}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'animate-pulse bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'
            }`}
          />
          <span className="hidden lg:inline">{syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing' : 'Offline'}</span>
        </span>
        {focusClock && (
          <button
            onClick={onFocusClick}
            title="Focus session — go to Today"
            className="flex items-center gap-1.5 rounded-full border border-neutral-900 px-3 py-2 text-sm font-bold tabular-nums text-neutral-900 transition hover:bg-neutral-50 dark:border-white dark:text-white dark:hover:bg-neutral-900"
          >
            <Timer className="h-3.5 w-3.5" strokeWidth={2.25} />
            {focusClock}
          </button>
        )}
        <NewMenu onHabit={onNewHabit} onGoal={onNewGoal} onArc={onNewArc} />
        <NotificationCenter notifications={notifications} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} onClear={onClear} />
        <ProfileMenu name={name} email={email} dark={dark} onSettings={onSettings} onExport={onExport} onToggleTheme={onToggleTheme} onSignOut={onSignOut} />
      </div>
    </header>
  )
}

export { iconBtn }
