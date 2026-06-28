import { useEffect, useRef } from 'react'

export default function Confetti({ active }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#ffffff']
    const pieces = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      r: Math.random() * 5 + 3,
      d: Math.random() * 20 + 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tiltAngle: Math.random() * Math.PI * 2,
      tiltInc: (Math.random() * 0.07 + 0.05) * (Math.random() < 0.5 ? 1 : -1),
    }))

    let frame = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      for (const p of pieces) {
        p.tiltAngle += p.tiltInc
        p.y += (Math.cos(frame / 14 + p.d) + 1.6) * 2.2
        p.x += Math.sin(frame / 22) * 0.6
        ctx.beginPath()
        ctx.lineWidth = p.r
        ctx.strokeStyle = p.color
        const tilt = Math.sin(p.tiltAngle) * 10
        ctx.moveTo(p.x + tilt + p.r / 3, p.y)
        ctx.lineTo(p.x + tilt, p.y + tilt + p.r / 5)
        ctx.stroke()
      }
      if (pieces.some((p) => p.y < canvas.height + 40)) {
        rafRef.current = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[200]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
