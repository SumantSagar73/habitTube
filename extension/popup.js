// Popup: mirror the active session with a friction-gated early exit.
const FRICTION_SECONDS = 15
let session = null

const activeEl = document.getElementById('active')
const idleEl = document.getElementById('idle')
const clockEl = document.getElementById('clock')
const goalEl = document.getElementById('goal')
const endBtn = document.getElementById('endBtn')

function fmt(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function render() {
  if (session && session.endsAt > Date.now()) {
    activeEl.style.display = 'block'
    idleEl.style.display = 'none'
    clockEl.textContent = fmt(session.endsAt - Date.now())
    goalEl.textContent = session.label || ''
  } else {
    activeEl.style.display = 'none'
    idleEl.style.display = 'block'
  }
}

chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (resp) => {
  session = resp && resp.session
  render()
})
setInterval(render, 1000)

let friction = null
endBtn.addEventListener('click', () => {
  if (endBtn.dataset.stage === 'confirm') {
    chrome.runtime.sendMessage({ type: 'END_EARLY' }, () => {
      activeEl.innerHTML = '<p class="done">Focus ended.</p>'
    })
    return
  }
  let n = FRICTION_SECONDS
  endBtn.disabled = true
  endBtn.textContent = `Sit with the urge… ${n}s`
  friction = setInterval(() => {
    n -= 1
    if (n > 0) { endBtn.textContent = `Sit with the urge… ${n}s` }
    else { clearInterval(friction); endBtn.disabled = false; endBtn.dataset.stage = 'confirm'; endBtn.textContent = 'Confirm end' }
  }, 1000)
})
