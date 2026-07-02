// Synthesized sounds via Web Audio API — no audio files required.

function ac() {
  return new (window.AudioContext || window.webkitAudioContext)()
}

// Short two-tone chime for notifications
export function playNotification() {
  try {
    const ctx = ac()
    const pairs = [[880, 0], [1320, 0.12]]
    for (const [freq, delay] of pairs) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.28)
    }
  } catch {}
}

// Three ascending tones for focus timer alarm
export function playAlarm() {
  try {
    const ctx = ac()
    const steps = [[520, 0], [660, 0.22], [880, 0.44]]
    for (const [freq, delay] of steps) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      gain.gain.setValueAtTime(0.35, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.22)
    }
  } catch {}
}
