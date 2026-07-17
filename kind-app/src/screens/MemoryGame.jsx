import { useMemo, useState } from 'react'
import { buzz } from './bits.jsx'

/** Memory-verse game: words disappear a few at a time — say the verse aloud,
 *  tap to hide more. Kids love beating the last level. */
export default function MemoryGame({ text, refr }) {
  const words = useMemo(() => text.split(/\s+/), [text])
  const [level, setLevel] = useState(0)
  const maxLevel = 3
  // deterministic scatter: hide roughly level/maxLevel of the words
  const hidden = (i) => level > 0 && ((i * 2654435761) % maxLevel) < level

  const next = () => { setLevel((l) => Math.min(maxLevel, l + 1)); buzz(15) }

  return (
    <div className="memgame">
      <p className="mem-verse">
        {words.map((w, i) => (
          <span key={i} className={'mw' + (hidden(i) ? ' hid' : '')}>{hidden(i) ? '____' : w} </span>
        ))}
      </p>
      <div className="mem-ref">{refr}</div>
      {level < maxLevel ? (
        <button className="btn gold" onClick={next}>
          {level === 0 ? 'Start — hide some words 🙈' : `Level ${level + 1} — hide more!`}
        </button>
      ) : (
        <button className="btn" onClick={() => setLevel(0)}>🏆 You said it all from memory! Again?</button>
      )}
    </div>
  )
}
