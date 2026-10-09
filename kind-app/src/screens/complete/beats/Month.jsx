// complete-shell · beat "month" — MISSION COMPLETE. Only planned when result.month.completeNow (the biggest moment the app has).
//
//   FULL FX   gold flash + foil cannons from both corners · the stamp slams in · every patch of the mission is stitched on, one by one,
//             each with a detent click · the series' own theme Scripture closes it.  ≤ 4 s, and the Stage's tap skips ahead.
//   LITE      everything present at once, cross-faded; one cue.
// Share opens the Share Studio on the 'month' card. Reads the store so the stats are the real, current ones.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Stat } from '../../../ui/index.js'
import { MissionPatch } from '../../../art/index.js'
import { fx } from '../../../fx/fx.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useFxLevel } from '../../../fx/motion.js'
import { monthCompleteCopy } from '../../../copy.js'
import { seriesProgress } from '../../../lib.js'
import { shareData, useStore } from '../../../store.js'

const TXT = { stamp: ['Mission', 'complete'], patches: 'Mission patches', days: 'Days', cards: 'Cards', rank: 'Rank' }
const STEP = 300                                        // ms between patches

export default function Month({ result, s, day, active, share }) {
  const lite = useFxLevel() === 'lite'
  const st = useStore()
  const weeks = s.weeks || []
  const [n, setN] = useState(lite ? weeks.length : 0)
  const rootRef = useRef(null)
  const copy = useMemo(() => monthCompleteCopy(s, { days: result.month?.total, seed: `${s.id}:${day}` }), [s, day, result.month?.total])
  const prog = useMemo(() => seriesProgress(s, st), [s, st])

  useEffect(() => {
    if (!active) return undefined
    sound.play('rankup'); haptic.cue('rankup')
    if (lite) return undefined
    const ids = [], raf = requestAnimationFrame(() => { fx.celebrate(rootRef.current, { big: true }); fx.cannons() })
    weeks.forEach((_, i) => ids.push(setTimeout(() => { setN((v) => Math.max(v, i + 1)); sound.play('detent'); haptic.tap() }, 900 + i * STEP)))
    ids.push(setTimeout(() => sound.play('rare'), 900 + weeks.length * STEP + 80))
    return () => { cancelAnimationFrame(raf); ids.forEach(clearTimeout) }
  }, [active])                                           // eslint-disable-line react-hooks/exhaustive-deps

  const px = weeks.length <= 4 ? 72 : 60
  return (
    <section ref={rootRef} className="cmp-mo" aria-label={copy.aria}>
      <p className="cmp-mo__eyebrow">{copy.eyebrow}</p>
      <h2 className="cmp-mo__stamp"><span>{TXT.stamp[0]}</span> <span>{TXT.stamp[1]}</span></h2>
      <p className="cmp-mo__series">{s.title}</p>

      <ul className="cmp-mo__patches" aria-label={TXT.patches}>
        {weeks.map((w, i) => (
          <li key={i} className="cmp-mo__patch" data-on={n > i ? '' : undefined}>
            <MissionPatch series={s} stage={i} state="earned" size={px} />
          </li>
        ))}
      </ul>

      <div className="cmp-mo__stats">
        <Stat size="sm" label={TXT.days} value={`${prog.done}/${prog.total}`} />
        <Stat size="sm" label={TXT.cards} value={`${prog.cards}/${prog.cardsTotal}`} />
        <Stat size="sm" label={TXT.rank} value={result.rank?.to?.name || ''} tone="gold" />
      </div>

      <p className="cmp-mo__text">{copy.text}</p>
      <figure className="cmp-mo__word">
        <blockquote>{copy.word.text}</blockquote>
        <figcaption>{copy.word.ref}</figcaption>
      </figure>

      <Button variant="secondary" size="md" icon="share" onClick={() => share({ kind: 'month', data: shareData('month', st, s.id) })}>{copy.shareCta}</Button>
    </section>
  )
}
