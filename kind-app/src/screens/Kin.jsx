import { useEffect, useState } from 'react'
import { SITE, LINKS } from '../config.js'
import { Stars } from './bits.jsx'

const IMPACT = [
  { n: '639', l: 'children' },
  { n: '14', l: 'programmes' },
  { n: '8PM', l: 'nightly · WAT' },
  { n: '1', l: 'movement' },
]

export default function Kin() {
  const [videos, setVideos] = useState(null)

  useEffect(() => {
    fetch(SITE + '/videos.json')
      .then((r) => r.json())
      .then((d) => setVideos((d.channels?.kin?.videos || []).slice(0, 4)))
      .catch(() => setVideos([]))
  }, [])

  return (
    <section className="screen">
      <div className="kinhead">
        <Stars n={18} />
        <span className="eyebrow gold-ey">The Movement</span>
        <h1>KidsInspiring Nation</h1>
        <div className="sub">Raising children of character, purpose &amp; skill — building the next generation of nation builders.</div>
        <div className="impact">
          {IMPACT.map((x) => <div key={x.l}><b>{x.n}</b><span>{x.l}</span></div>)}
        </div>
      </div>

      <div className="fcard">
        <span className="eyebrow">Fresh from our channel</span>
        {videos === null && <p className="fp muted">Loading latest videos…</p>}
        {videos && videos.length === 0 && <p className="fp muted">Visit <a href="https://youtube.com/@KidsInspiringNation" target="_blank" rel="noopener noreferrer">our YouTube channel</a> for the latest.</p>}
        {videos && videos.map((v) => (
          <a key={v.id} className="vidrow" href={`https://youtu.be/${v.id}`} target="_blank" rel="noopener noreferrer">
            <span className="vthumb" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${v.id}/mqdefault.jpg)` }} />
            <span className="vmeta"><b>{v.title}</b><small>{fmtWhen(v.published)}</small></span>
          </a>
        ))}
      </div>

      <div className="fcard">
        <span className="eyebrow">Our programmes</span>
        <LinkRow icon="👑" title="goDs University" sub="Spirit · Skills · Bible & Academic" href={LINKS.gu} />
        <LinkRow icon="🇳🇬" title="Nation Builders Corps" sub="Psalm 119 → community impact" href={LINKS.nbc} />
        <LinkRow icon="✨" title="All 14 programmes" sub="Explore everything we do" href={LINKS.programs} />
        <LinkRow icon="⚡" title="Live impact dashboard" sub="Real-time statistics & trends" href={LINKS.dashboard} />
      </div>

      <div className="fcard">
        <span className="eyebrow">Join &amp; support</span>
        <LinkRow icon="📖" title="KIND Daily on WhatsApp" sub="8PM WAT · every day" href={LINKS.whatsapp} />
        <LinkRow icon="✈️" title="Telegram community" sub="t.me/KidsInspiringNation" href={LINKS.telegram} />
        <LinkRow icon="💛" title="Give" sub="Fuel the movement" href={LINKS.give} />
        <LinkRow icon="🌐" title="kidsinspiringnation.org" sub="Our full website" href={SITE} />
      </div>
    </section>
  )
}

function LinkRow({ icon, title, sub, href }) {
  return (
    <a className="linkrow" href={href} target="_blank" rel="noopener noreferrer">
      <span className="lic">{icon}</span>
      <span className="lmeta"><b>{title}</b><small>{sub}</small></span>
      <span className="chev">›</span>
    </a>
  )
}

function fmtWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso), days = Math.floor((Date.now() - d) / 864e5)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
