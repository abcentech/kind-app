// Mount once, near the root of the app. Everything else is imperative: import { fx } from './fx/fx.js'.
// Renders nothing in lite (the canvas is the cost); the engine releases it and sleeps.
import { useEffect, useRef } from 'react'
import { useFxLevel } from './motion.js'
import { _attachLayer } from './fx.js'

export function FxLayer() {
  const level = useFxLevel()
  const canvas = useRef(null)
  const flash = useRef(null)

  useEffect(() => {
    if (level === 'lite' || !canvas.current) return undefined
    return _attachLayer(canvas.current, flash.current)
  }, [level])

  if (level === 'lite') return null
  return (
    <>
      <canvas ref={canvas} className="fx-layer" aria-hidden="true" />
      <div ref={flash} className="fx-flash" aria-hidden="true" />
    </>
  )
}

export default FxLayer
