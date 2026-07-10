import { useEffect, useRef, useState } from 'react'

export function Stars({ n = 20 }) {
  return (
    <div className="stars" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className="st" style={{
          left: `${3 + Math.round(94 * ((i * 37) % 100) / 100)}%`,
          top: `${2 + ((i * 53) % 55)}%`,
          animationDelay: `${((i * 0.37) % 3).toFixed(2)}s`,
        }} />
      ))}
    </div>
  )
}

export function Countdown() {
  const [txt, setTxt] = useState('–:––:––')
  useEffect(() => {
    const tick = () => {
      const now = new Date(), t = new Date(now)
      t.setHours(20, 0, 0, 0)
      if (t < now) t.setDate(t.getDate() + 1)
      const s = Math.floor((t - now) / 1000)
      setTxt(`${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <div className="cd">{txt}</div>
}

export function Confetti({ fire }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!fire || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cv = ref.current, cx = cv.getContext('2d')
    const r = cv.parentElement.getBoundingClientRect()
    cv.width = r.width; cv.height = r.height
    const colors = ['#f0b23e', '#2e7d4f', '#e0603a', '#ffffff', '#f6c35c']
    const parts = Array.from({ length: 120 }, (_, i) => ({
      x: cv.width / 2, y: cv.height * 0.3,
      vx: (((i * 7919) % 200) / 100 - 1) * 7, vy: -(((i * 104729) % 100) / 100) * 10 - 3,
      c: colors[i % 5], s: 4 + ((i * 31) % 5), rot: i * 3, vr: (((i * 13) % 10) / 10 - 0.5) * 20,
    }))
    let frames = 0, raf
    const loop = () => {
      cx.clearRect(0, 0, cv.width, cv.height)
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rot += p.vr
        cx.save(); cx.translate(p.x, p.y); cx.rotate((p.rot * Math.PI) / 180)
        cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6); cx.restore()
      })
      if (++frames < 130) raf = requestAnimationFrame(loop)
      else cx.clearRect(0, 0, cv.width, cv.height)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [fire])
  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}

export function Mountain({ className }) {
  return (
    <svg className={className} viewBox="0 0 230 120" aria-hidden="true">
      <path d="M20 120 L90 30 L120 66 L150 14 L230 120 Z" fill="rgba(255,255,255,.16)" />
      <path d="M150 14 L165 34 L150 40 L138 32 Z" fill="rgba(255,255,255,.55)" />
      <circle cx="196" cy="26" r="9" fill="rgba(246,195,92,.9)" />
    </svg>
  )
}
