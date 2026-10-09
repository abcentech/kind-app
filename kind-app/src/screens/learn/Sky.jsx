// Sky — the Ascent's backdrop, one layer behind the scroller. It reads --scroll (0 on the pad → 1 in orbit), which Learn writes onto THIS
// element (not the scroller, not <html>): the style recalc a scroll tick causes stays inside five nodes.
//   AscentSky   the base — dusk + ember at the foot, deep space and thickening stars at the summit
//   deep        a second, denser, parallaxed Starfield that only wakes in the upper half
//   limb        the Earth's curved edge, peaking mid-climb and sinking away
//   pad         the dusk spaceport + gantry; it drops out of frame in the first quarter of the climb
// Opacity and transform only. Lite = the base alone (no parallax, no extra stars, no heavy SVG): the sky still darkens as you climb,
// which is information, not effect.
import { forwardRef } from 'react'
import { AscentSky, Horizon, Starfield } from '../../art/index.js'
import { useFxLevel } from '../../fx/motion.js'

const Sky = forwardRef(function Sky(_, ref) {
  const lite = useFxLevel() === 'lite'
  return (
    <div className="learn-sky" ref={ref} aria-hidden="true">
      <AscentSky seed={3} />
      {!lite && (
        <>
          <div className="learn-sky__deep"><Starfield seed={11} density={2.2} parallax band={false} /></div>
          <div className="learn-sky__limb"><Horizon variant="limb" stars={false} /><i className="learn-sky__ground" data-v="limb" /></div>
          <div className="learn-sky__pad"><Horizon variant="pad" seed={5} /><i className="learn-sky__ground" data-v="pad" /></div>
        </>
      )}
    </div>
  )
})

export default Sky
