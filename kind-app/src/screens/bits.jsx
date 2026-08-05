import { useEffect, useState } from 'react'

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
export const buzz = (pattern = 8) => { try { navigator.vibrate?.(pattern) } catch {} }

/** Time until tonight's 8PM premiere. */
export function Countdown() {
  const [txt, setTxt] = useState('—')
  useEffect(() => {
    const tick = () => {
      const now = new Date(), t = new Date(now)
      t.setHours(20, 0, 0, 0)
      if (t < now) t.setDate(t.getDate() + 1)
      const s = Math.floor((t - now) / 1000)
      const p = (n) => String(n).padStart(2, '0')
      setTxt(`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <>{txt}</>
}
