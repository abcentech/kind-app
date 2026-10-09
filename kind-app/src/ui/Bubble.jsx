// Bubble — a coach-mark / callout that points at its anchor. Place it inside a `position: relative` element; it
// positions itself on the requested side and lives in the hardware idiom (chamfered corners, a notch for the tail),
// with the tail cut into the same clip-path as the body so the outline is one continuous 1px line.
//   placement: 'top' | 'bottom' | 'left' | 'right', optionally '-start' / '-end' to pin the tail toward an edge.
import { useEffect, useState } from 'react'

/** Bubble { placement tone children } — tone: 'default' | 'ignite' | 'tele' */
export function Bubble({ placement = 'top', tone = 'default', float = true, role = 'note', children, className = '', style, ...rest }) {
  const [side, align = 'center'] = placement.split('-')
  const [lit, setLit] = useState(false)
  useEffect(() => { setLit(true) }, [])                                // the float loop starts after the entrance has landed
  return (
    <span
      className={'k-bubble ' + className} role={role} data-side={side} data-align={align} data-tone={tone}
      data-float={float && lit ? '' : undefined} style={style} {...rest}
    >
      <span className="k-bubble-rim">
        <span className="k-bubble-body">{children}</span>
      </span>
    </span>
  )
}

export default Bubble
