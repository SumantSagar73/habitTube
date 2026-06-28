import { useState } from 'react'
import { supabase } from '../utils/supabase'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setInfo('Check your email to confirm your account, then log in.')
        setMode('login')
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onAuth(data.user)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          HabitTube<span className="text-neutral-400 dark:text-neutral-600">.</span>
        </h1>
        <p className="mb-8 text-sm font-medium text-neutral-400 dark:text-neutral-500">
          {mode === 'login' ? 'Sign in to sync your habits across devices.' : 'Create an account to get started.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
          />

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {info && <p className="text-sm font-medium text-emerald-500">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm font-medium text-neutral-400 dark:text-neutral-500">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
            className="font-bold text-neutral-900 underline underline-offset-2 transition hover:no-underline dark:text-white"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
