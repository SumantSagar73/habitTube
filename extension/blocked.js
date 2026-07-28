// Blocked page: shows the live countdown + what you're working toward, counts
// this block, offers a friction-gated "end early" (15s), and a temporary
// "allow this one site for 10 minutes" (10s friction) for one-off resources.

const FRICTION_END = 15
const FRICTION_ALLOW = 10
const TEMP_MINUTES = 10
let session = null

// The site we were trying to reach was passed as ?u=<original full url>
const orig = location.href.includes('?u=') ? location.href.split('?u=')[1] : ''
let host = ''
try { host = new URL(orig).hostname.replace(/^www\./, '') } catch { host = '' }

const clockEl = document.getElementById('clock')
const goalEl = document.getElementById('goal')
const subEl = document.getElementById('sub')
const blockedEl = document.getElementById('blocked')
const controlsEl = document.getElementById('controls')
const endBtn = document.getElementById('endBtn')
const allowBtn = document.getElementById('allowBtn')

function fmt(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function domainMatch(h, list) {
  return (list || []).some((d) => h === d || h.endsWith('.' + d))
}

if (host) {
  subEl.innerHTML = `<span class="host">${host}</span> is blocked during focus. Get back to it. 🎯`
}

function render() {
  if (!session) return
  const left = session.endsAt - Date.now()
  clockEl.textContent = fmt(left)
  goalEl.textContent = session.label ? `Working toward: ${session.label}` : ''
  blockedEl.innerHTML = session.blocked ? `Blocked <b>${session.blocked}</b> distraction${session.blocked > 1 ? 's' : ''} this session 💪` : ''
  if (left <= 0) {
    clockEl.textContent = '00:00'
    controlsEl.innerHTML = '<p class="done">Focus complete ✓ — you can browse freely now.</p>'
  }
}

chrome.runtime.sendMessage({ type: 'BLOCKED_HIT' }, (resp) => {
  session = resp && resp.session
  // Off-limits sites get no temp-allow escape hatch
  if (host && session) {
    if (domainMatch(host, session.block)) {
      subEl.innerHTML = `<span class="host">${host}</span> is <b>off-limits</b> during focus — no exceptions. 🔒`
      allowBtn.style.display = 'none'
    } else {
      allowBtn.style.display = ''
    }
  }
  render()
})
setInterval(render, 1000)

// Reusable two-stage friction: wait N seconds, then require a confirm click.
function friction(btn, seconds, waitLabel, confirmLabel, onConfirm) {
  btn.addEventListener('click', () => {
    if (btn.dataset.stage === 'confirm') { onConfirm(); return }
    let n = seconds
    btn.disabled = true
    btn.textContent = `${waitLabel} ${n}s`
    const iv = setInterval(() => {
      n -= 1
      if (n > 0) { btn.textContent = `${waitLabel} ${n}s` }
      else { clearInterval(iv); btn.disabled = false; btn.dataset.stage = 'confirm'; btn.textContent = confirmLabel }
    }, 1000)
  })
}

// End the whole session early
friction(endBtn, FRICTION_END, 'Sit with the urge…', 'Still want to quit? Confirm end', () => {
  chrome.runtime.sendMessage({ type: 'END_EARLY' }, () => {
    controlsEl.innerHTML = '<p class="done">Focus ended. Sites unblocked.</p>'
  })
})

// Temporarily allow just this site for 10 minutes, then navigate back to it
if (host) {
  friction(allowBtn, FRICTION_ALLOW, 'Sure you need it?', `Open ${host} for ${TEMP_MINUTES} min`, () => {
    chrome.runtime.sendMessage({ type: 'TEMP_ALLOW', domain: host, minutes: TEMP_MINUTES }, () => {
      allowBtn.textContent = 'Opening…'
      // Rules update instantly; go back to the site you wanted
      if (orig) location.href = orig
    })
  })
}
