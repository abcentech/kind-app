// ex-step · the verdict sheet: Go / No-Go. Own markup (not <Sheet>): it is not dismissable, has no backdrop and no grabber,
// it sits inside the step so the answered plates stay visible above it, and it must not steal the lesson's focus trap.
//
//   <Verdict right verdict ex answerText explain xp leaving onContinue ctaRef rootRef />
//
//   verdict   the object from copy.verdictRight / verdictWrong  { tone, status, head, text, ref?, note?, cta }
//   xp        the delta to pop (0 hides it: wrong, or an answer that earned nothing)
//   ctaRef    ref to the CONTINUE button (the step moves focus there)   rootRef  ref to the sheet (the step measures it)
//
// Never colour alone: the LED lens carries a glyph, the status reads GO / NO-GO, the head says it in words.
// A wrong answer is never scolded: the LED is lit, the button is neutral titanium, and the answer is simply set down.
import { Button, Label } from '../../../ui/index.js'
import { Icon } from '../../../icons.jsx'
import { answerLabel, xpDelta } from '../../../copy.js'

const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()     // punctuation never makes a restatement new

/** The explain line is skipped when it only restates the answer that is already on screen. */
export function explainIsNew(explain, answerText, showAnswer) {
  const e = norm(explain)
  if (!e) return false
  // right or wrong, the answer is on screen (the lit plate above the sheet, or THE ANSWER inside it): never say it twice
  void showAnswer
  const a = norm(answerText)
  if (!a) return true
  const sentence = a.split(' ').length >= 3                 // a one-word answer is always "inside" its explanation: keep that explain
  return !(e === a || (sentence && (e.includes(a) || a.includes(e))))
}

export default function Verdict({ right, verdict, ex, answerText, explain, xp = 0, leaving = false, onContinue, ctaRef, rootRef }) {
  const { status, head, text, ref: cite, note, cta } = verdict
  const showAnswer = !right
  const showExplain = explainIsNew(explain, answerText, showAnswer)
  const word = ex.type === 'order' || ex.source === 'scripture' || ex.source === 'declaration'
  return (
    <div
      ref={rootRef}
      className="ex-verdict"
      role="group"
      aria-label={head}
      data-tone={right ? 'go' : 'nogo'}
      data-leaving={leaving ? '' : undefined}
    >
      <i className="ex-verdict__bar" aria-hidden="true" />
      <div className="ex-verdict__scroll">
        <header className="ex-verdict__head">
          <span className="ex-led" aria-hidden="true">
            <span className="ex-led__lens">{right ? <Icon.check size={24} /> : <Icon.close size={20} />}</span>
          </span>
          <div className="ex-verdict__title">
            <Label mono tone={right ? 'go' : 'nogo'} className="ex-verdict__status">{status}</Label>
            <h2 className="ex-verdict__head-text">{head}</h2>
          </div>
          {xp > 0 && (
            <span className="ex-xp" aria-hidden="true"><Icon.bolt size={16} weight="solid" />{xpDelta(xp)}</span>
          )}
        </header>

        {cite ? (
          <figure className="ex-quote">
            <blockquote><p>{text}</p></blockquote>
            <figcaption>{cite}</figcaption>
          </figure>
        ) : (
          <p className="ex-line">{text}</p>
        )}

        {showAnswer && (
          <div className="ex-answer" data-type={ex.type}>
            <div className="ex-answer__in">
              <Label mono tone="go" className="ex-answer__label"><Icon.check size={16} />{answerLabel(ex)}</Label>
              {ex.type === 'match' && Array.isArray(ex.pairs) ? (
                <ul className="ex-pairs">
                  {ex.pairs.map((p) => (<li key={p.id}><span>{p.left}</span><span>{p.right}</span></li>))}
                </ul>
              ) : (
                <p className="ex-answer__text" data-word={word ? '' : undefined} data-short={answerText.length <= 18 ? '' : undefined}>{answerText}</p>
              )}
            </div>
          </div>
        )}

        {showExplain && <p className="ex-explain">{explain}</p>}
        {note && <p className="ex-note"><Icon.refresh size={16} />{note}</p>}
      </div>

      <div className="ex-verdict__cta">
        <Button
          ref={ctaRef}
          variant={right ? 'go' : 'secondary'}
          size="lg"
          full
          silent
          iconRight="arrowRight"
          onClick={onContinue}
        >
          {cta}
        </Button>
      </div>
    </div>
  )
}
