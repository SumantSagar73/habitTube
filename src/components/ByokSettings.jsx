import { useState } from 'react'
import { aiTest } from '../ai'
import { BYOK_PROVIDERS, listByokModels, loadByok, saveByok } from '../byok'
import Select from './Select'

const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white'
const ghostBtn =
  'rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'

// "Use my own key": pick a provider, paste a key, choose a model (listed from the
// provider with that key, or typed). Stored only in this browser (see byok.js).
export default function ByokSettings() {
  const [cfg, setCfg] = useState(loadByok)
  const [models, setModels] = useState([])
  const [busy, setBusy] = useState('') // '', 'models', 'test'
  const [msg, setMsg] = useState({ ok: true, text: '' })
  const provider = BYOK_PROVIDERS[cfg.provider]

  function update(patch) {
    const next = { ...cfg, ...patch }
    setCfg(next)
    saveByok(next)
  }

  function changeProvider(id) {
    setModels([])
    setMsg({ ok: true, text: '' })
    update({ provider: id, model: BYOK_PROVIDERS[id].defaultModel })
  }

  async function loadModels() {
    setBusy('models')
    setMsg({ ok: true, text: '' })
    try {
      const list = await listByokModels(cfg.provider, cfg.key)
      setModels(list)
      setMsg({ ok: true, text: `${list.length} models available with this key.` })
      if (!cfg.model && list.length) update({ model: list.includes(provider.defaultModel) ? provider.defaultModel : list[0] })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy('')
    }
  }

  async function test() {
    setBusy('test')
    setMsg({ ok: true, text: '' })
    try {
      const ok = await aiTest()
      setMsg(ok ? { ok: true, text: `✓ Connected to ${provider.label}` } : { ok: false, text: 'Got a reply, but not the expected one.' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy('')
    }
  }

  const active = cfg.enabled && cfg.key.trim() && cfg.model.trim()

  return (
    <div className="mt-4 glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-neutral-900 dark:text-white">Use my own AI key</p>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
            {active ? `Using ${provider.label} (${cfg.model})` : 'Bring a Gemini, OpenAI, Groq or OpenRouter key'}
          </p>
        </div>
        <button
          onClick={() => update({ enabled: !cfg.enabled, model: cfg.model || provider.defaultModel })}
          aria-label="Use my own AI key"
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${cfg.enabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${cfg.enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {cfg.enabled && (
        <>
          <label className={`${labelCls} mt-5`}>Provider</label>
          <Select value={cfg.provider} onChange={(e) => changeProvider(e.target.value)}>
            {Object.entries(BYOK_PROVIDERS).map(([id, p]) => (
              <option key={id} value={id}>{p.label}</option>
            ))}
          </Select>

          <label className={`${labelCls} mt-4`}>API key</label>
          <input
            type="password"
            autoComplete="off"
            className={inputCls}
            value={cfg.key}
            onChange={(e) => update({ key: e.target.value })}
            placeholder="Paste your key"
          />
          <p className="mt-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
            Stored only in this browser and sent straight to {provider.label} — never to our servers or your synced data.{' '}
            <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="underline">Get a key</a>
          </p>

          <label className={`${labelCls} mt-4`}>Model</label>
          <input
            className={inputCls}
            list="byok-models"
            value={cfg.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder={provider.defaultModel}
            spellCheck={false}
          />
          <datalist id="byok-models">
            {models.map((m) => <option key={m} value={m} />)}
          </datalist>
          <p className="mt-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
            Type any model ID, or load the list your key can use.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className={ghostBtn} onClick={loadModels} disabled={!cfg.key.trim() || busy !== ''}>
              {busy === 'models' ? 'Loading…' : 'Load models'}
            </button>
            <button className={ghostBtn} onClick={test} disabled={!active || busy !== ''}>
              {busy === 'test' ? 'Testing…' : 'Test connection'}
            </button>
          </div>
          {msg.text && (
            <p className={`mt-2 text-xs font-medium ${msg.ok ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>{msg.text}</p>
          )}
        </>
      )}
    </div>
  )
}
