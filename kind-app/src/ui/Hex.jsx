// Hex — a bevelled hexagonal plate, machined in layers: extrusion foot → titanium rim → reversed-light slope → carbon plate.
// Every layer is the same pointy-top clip-path, inset by a *uniform* rim width (inset: r·1.1547 r keeps the inner hex
// regular, so the rim is the same thickness on all six edges). Glow lives OUTSIDE the clip on a wrapper filter
// (clip-path would swallow a box-shadow). Interactive hexes sink into their own foot when pressed, like a key.
//   size = the plate's WIDTH in px (flat to flat); height is size / .866. The foot extends `size * .06` below the box.
import { Icon } from '../icons.jsx'

const DEFAULT_TONE = { locked: 'none', open: 'neutral', current: 'ignite', done: 'stage', rare: 'gold' }
const snap = (n) => [16, 20, 24, 32].reduce((b, s) => (Math.abs(s - n) < Math.abs(b - n) ? s : b), 16)

// Regular pointy-top hexagon in a 100 x 115.47 box, inset by `a` from the flat sides.
function hexPath(a) {
  const R = a / 0.8660254, cy = 57.735
  const p = [[50, cy - R], [50 + a, cy - R / 2], [50 + a, cy + R / 2], [50, cy + R], [50 - a, cy + R / 2], [50 - a, cy - R / 2]]
  return 'M' + p.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z'
}

/**
 * Hex { size state:'locked'|'open'|'current'|'done'|'rare' tone:'stage'|'ignite'|'tele'|'gold' ring children glow }
 * ring: true = a static outline, 0..1 = progress around the perimeter from the top. glow defaults on for current/rare.
 * With no children: locked shows a padlock, done a check, rare a star.
 */
export function Hex({ size = 72, state = 'open', tone, ring, children, glow, as, className = '', style, ...rest }) {
  const t = tone || DEFAULT_TONE[state] || 'neutral'
  const halo = glow ?? (state === 'current' || state === 'rare')
  const Tag = as || (rest.onClick ? 'button' : 'div')
  const ico = snap(size * 0.38)
  let face = children
  if (face == null) {
    if (state === 'locked') face = <Icon name="lock" size={ico} />
    else if (state === 'done') face = <Icon name="check" size={ico} weight="solid" />
    else if (state === 'rare') face = <Icon name="star" size={ico} weight="solid" />
  }
  const gap = Math.max(4, Math.round(size * 0.07))
  const vb = size + gap * 2
  const sw = (2.4 * 100) / vb
  const showRing = ring !== undefined && ring !== false && ring !== null
  const prog = typeof ring === 'number' ? Math.max(0, Math.min(1, ring)) : 1

  return (
    <Tag
      className={'k-hex ' + className}
      data-state={state} data-tone={t} data-halo={halo || undefined} data-interactive={Tag === 'button' || rest.onClick ? '' : undefined}
      style={{ '--k-w': size + 'px', '--k-gap': gap + 'px', width: size, ...style }}
      {...(Tag === 'button' && !rest.type ? { type: 'button' } : null)}
      {...rest}
    >
      <span className="k-hex-aura" aria-hidden="true" />
      <span className="k-hex-halo" aria-hidden="true">
        <span className="k-hex-foot" />
        <span className="k-hex-rimstack">
          <span className="k-hex-rim"><span className="k-hex-foil" /></span>
          <span className="k-hex-slope" />
          <span className="k-hex-plate" />
        </span>
      </span>
      {showRing && (
        <svg className="k-hex-ring" viewBox="0 0 100 115.47" aria-hidden="true" focusable="false">
          <path d={hexPath(50 - sw / 2)} className="k-hex-ring-track" strokeWidth={sw} fill="none" strokeLinejoin="round" />
          <path
            d={hexPath(50 - sw / 2)} className="k-hex-ring-fill" strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round"
            pathLength="100" strokeDasharray={`${prog * 100} 100`}
          />
        </svg>
      )}
      <span className="k-hex-face">{face}</span>
    </Tag>
  )
}

export default Hex
