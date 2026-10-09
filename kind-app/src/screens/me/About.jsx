// About — the version line (seven taps wake the developer bay), the privacy promise, the glossary, and the big red reset.
import { useRef, useState } from 'react'
import { getBuild } from '../../pwa.js'
import { glossary, labels, settingsHelp } from '../../copy.js'
import { resetAll } from '../../store.js'
import { Dialog, Label, Row, RowGroup, Sheet, toast } from '../../ui/index.js'

const TAPS = 7
const WINDOW = 1800            // ms between taps before the count starts over

export default function About({ onUnlock }) {
  const H = settingsHelp
  const [words, setWords] = useState(false)
  const [erase, setErase] = useState(false)
  const n = useRef(0), last = useRef(0)

  const tapVersion = () => {
    const t = Date.now()
    n.current = t - last.current > WINDOW ? 1 : n.current + 1
    last.current = t
    if (n.current >= TAPS) {
      n.current = 0
      onUnlock?.()
      toast({ title: 'Developer tools unlocked', icon: 'sliders', tone: 'go' })
    }
  }

  return (
    <section className="me-sec" aria-labelledby="me-about-h">
      <Label as="h2" id="me-about-h" className="me-h">{H.about.label}</Label>
      <div className="me-privacy">
        <p className="me-privacy__line">{H.privacy.line}</p>
        <p className="me-privacy__detail">{H.privacy.detail}</p>
        <p className="me-privacy__warn">{H.privacy.warn}</p>
      </div>
      <RowGroup footer={H.about.help}>
        <Row icon="info" title={labels.app.name} sub={labels.app.org} value={H.about.version(getBuild())} onClick={tapVersion} silent />
        <Row icon="help" title={H.help.label} chevron onClick={() => setWords(true)} />
        <Row icon="trash" tone="nogo" title={H.reset.label} sub={H.reset.help} onClick={() => setErase(true)} />
      </RowGroup>

      <Sheet open={words} onClose={() => setWords(false)} title={H.help.title} detents={['half', 'full']}>
        <dl className="me-gloss">
          {glossary.map((g) => (
            <div key={g.id} className="me-gloss__item">
              <dt>{g.term}</dt>
              <dd>{g.plain}</dd>
            </div>
          ))}
        </dl>
      </Sheet>

      <Dialog
        open={erase} tone="danger" title={H.reset.title} body={H.reset.body}
        confirmLabel={H.reset.confirm} cancelLabel={H.reset.cancel}
        onCancel={() => setErase(false)}
        onConfirm={() => { resetAll(); try { sessionStorage.removeItem('kind-dev') } catch { /* fine */ } location.reload() }}
      />
    </section>
  )
}
