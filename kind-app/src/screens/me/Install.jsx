// me-install · the install experience.
//   default  <InstallCard s />        the Me-tab card. Native prompt (Android / desktop Chromium), the illustrated iOS guide,
//                                     or the "open this in your browser" explanation inside WhatsApp / Facebook. Hidden when
//                                     KIND already runs from the home screen. "Not now" folds it into one quiet row (it is
//                                     never lost: the copy promises "install from Me any time").
//   named    <InstallPrompt />        one compact card for after the first completed lesson (Complete / Learn mount it).
//                                     Shows only when there is a way in, we are not standalone and it was not dismissed
//                                     in the last 14 days.
//   named    <IosGuideSheet open onClose mode? />   the sheet itself. mode 'ios' (default, 3 drawn steps) | 'android' | 'inapp'.
import { useId, useState } from 'react'
import { useInstall } from '../../pwa.js'
import { usePrefs } from '../../prefs.js'
import { installCopy, toastCopy } from '../../copy.js'
import { Button, IconButton, Label, Panel, Row, RowGroup, SegmentBar, Sheet, toast } from '../../ui/index.js'
import { Mark } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'

const REAPPEAR = 14 * 24 * 60 * 60 * 1000
const dismissedRecently = (t) => Boolean(t) && Date.now() - t < REAPPEAR

/** What can this device do right now?  'native' | 'ios' | 'inapp' | 'manual' | null (nothing to offer). */
function routeOf(i) {
  if (i.isStandalone || i.installed) return null
  if (i.inAppBrowser) return 'inapp'
  if (i.needsIosGuide) return 'ios'
  if (i.canInstall) return 'native'
  if (i.platform === 'android') return 'manual'
  return null
}
const copyKey = (route, platform) => (route === 'inapp' ? 'inapp' : route === 'ios' ? 'ios' : route === 'manual' ? 'android' : platform)
const sheetMode = (route) => (route === 'ios' ? 'ios' : route === 'inapp' ? 'inapp' : 'android')

/** Shared behaviour: run the right action for the route, with the app's own sound, haptic and toast. */
function useInstallAction(route, inst) {
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)   // the browser consumed its prompt: hide at once, `appinstalled` follows a moment later
  const [, setPref] = usePrefs()
  const act = async () => {
    if (route !== 'native') { setSheet(true); return }
    setBusy(true)
    const outcome = await inst.install()
    setBusy(false)
    if (outcome === 'accepted') { setAccepted(true); sound.play('unlock'); haptic.success(); toast(toastCopy('installed')) }
    else if (outcome === 'dismissed') { setPref('installDismissed', Date.now()); toast(toastCopy('installLater')) }
  }
  const dismiss = () => { setPref('installDismissed', Date.now()); toast(toastCopy('installLater')) }
  return { sheet, setSheet, busy, accepted, act, dismiss }
}

/* ── the Me card ───────────────────────────────────────────────────────────── */
export default function InstallCard() {
  const inst = useInstall()
  const [p] = usePrefs()
  const route = routeOf(inst)
  const { sheet, setSheet, busy, accepted, act, dismiss } = useInstallAction(route, inst)
  if (!route || accepted) return null

  const c = installCopy(copyKey(route, inst.platform))
  const folded = dismissedRecently(p.installDismissed)
  const cta = route === 'native' ? c.cta : route === 'inapp' ? 'Open it in your browser' : 'Show me how'

  return (
    <>
      {folded ? (
        <RowGroup>
          <Row icon="install" title="Install KIND" sub="Full screen, and it works without data." chevron onClick={act} className="mei-fold" />
        </RowGroup>
      ) : (
        <Panel cut tone="raised" padded className="mei-card" aria-labelledby="mei-card-title">
          <div className="mei-card__head">
            <span className="mei-badge" aria-hidden="true"><Mark size={44} detail="full" /></span>
            <div className="mei-card__text">
              <Label mono tone="tele" dot>{route === 'inapp' ? 'Open in browser' : route === 'ios' ? 'iPhone · 3 taps' : 'Install'}</Label>
              <h3 className="mei-card__title" id="mei-card-title">{c.title}</h3>
              <p className="mei-card__body">{c.body}</p>
            </div>
          </div>
          <ul className="mei-spec" aria-label="What you get">
            <li><Icon name="phone" size={16} />Full screen</li>
            <li><Icon name="wifiOff" size={16} />Offline</li>
            <li><Icon name="rocket" size={16} />One tap</li>
          </ul>
          <div className="mei-card__actions">
            <Button full icon={route === 'native' ? 'install' : route === 'inapp' ? 'external' : 'share'} loading={busy} onClick={act}>{cta}</Button>
            <Button variant="ghost" size="sm" onClick={dismiss}>{c.dismiss || 'Not now'}</Button>
          </div>
        </Panel>
      )}
      {route !== 'native' && <GuideSheet open={sheet} onClose={() => setSheet(false)} mode={sheetMode(route)} />}
    </>
  )
}

/* ── the post-lesson prompt ────────────────────────────────────────────────── */
export function InstallPrompt({ className }) {
  const inst = useInstall()
  const [p] = usePrefs()
  const route = routeOf(inst)
  const { sheet, setSheet, busy, accepted, act, dismiss } = useInstallAction(route, inst)
  if (!route || accepted || route === 'manual' || dismissedRecently(p.installDismissed)) return null
  const c = installCopy(copyKey(route, inst.platform))
  return (
    <>
      <Panel cut="sm" pad="sm" className={'mei-prompt' + (className ? ' ' + className : '')} role="region" aria-label="Install KIND">
        <span className="mei-prompt__mark" aria-hidden="true"><Mark size={32} detail="lite" /></span>
        <p className="mei-prompt__title">{c.title}</p>
        <Button size="sm" loading={busy} onClick={act}>{route === 'native' ? 'Install' : route === 'inapp' ? 'How' : 'Show me'}</Button>
        <IconButton icon="close" label="Not now" size="sm" onClick={dismiss} />
      </Panel>
      {route !== 'native' && <GuideSheet open={sheet} onClose={() => setSheet(false)} mode={sheetMode(route)} />}
    </>
  )
}

/* ── the guide sheet ───────────────────────────────────────────────────────── */
export function IosGuideSheet({ open, onClose, mode = 'ios' }) { return <GuideSheet open={open} onClose={onClose} mode={mode} /> }

const IOS_HEADS = ['Tap Share', 'Add to Home Screen', 'Tap Add']
const IOS_ART = [ArtShare, ArtSheet, ArtAdd]
// Safari hides its toolbar while you scroll; the action list is long; the name can be edited. The three things people get stuck on.
const IOS_NOTES = [
  'Can’t see the toolbar? Scroll up a little, or tap the bottom edge of the screen. Safari hides it while you read.',
  'Not on screen? Scroll the list. Add to Home Screen sits below Add Bookmark and Find on Page.',
  'You can rename it before you tap Add. KIND will be on your home screen straight away.',
]

function GuideSheet({ open, onClose, mode }) {
  const inst = useInstall()
  const [step, setStep] = useState(0)
  const c = installCopy(mode === 'ios' ? 'ios' : mode === 'inapp' ? 'inapp' : 'android')
  const ios = mode === 'ios'
  const last = step === 2
  const exit = () => { onClose?.(); setTimeout(() => setStep(0), 400) }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); toast(toastCopy('copiedLink')) }
    catch { toast({ title: 'Select the link in the address bar and copy it', icon: 'link' }) }
  }

  const eyebrow = ios ? 'iPhone · Safari' : mode === 'inapp' ? 'This window cannot install' : 'Android · Chrome'
  const title = ios ? 'Add KIND to your Home Screen' : mode === 'inapp' ? c.title : 'Install KIND from the menu'
  const footer = ios ? (
    <div className="mei-foot">
      <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)} icon="arrowLeft" aria-label="Previous step" />
      <Button full onClick={last ? exit : () => setStep(step + 1)} iconRight={last ? 'check' : 'arrowRight'}>{last ? 'Done' : 'Next step'}</Button>
    </div>
  ) : (
    <div className="mei-foot">
      {mode === 'inapp' && <Button variant="secondary" icon="link" onClick={copyLink}>Copy link</Button>}
      <Button full onClick={exit} iconRight="check">Got it</Button>
    </div>
  )

  return (
    <Sheet open={open} onClose={exit} title={title} eyebrow={eyebrow} detents={['auto', 'full']} footer={footer} className="mei-sheet">
      {ios ? (
        <div className="mei-guide">
          <SegmentBar total={3} done={step + 1} current={step} label="Step" />
          <p className="mei-count" aria-live="polite"><span>STEP {step + 1} / 3</span></p>
          <div className="mei-stage" key={step}>
            {(() => { const Art = IOS_ART[step]; return <Art /> })()}
          </div>
          <h3 className="mei-head" key={'h' + step}>
            {step === 0 && <Icon name="share" size={20} />}{IOS_HEADS[step]}
          </h3>
          <p className="mei-text" aria-live="polite">{c.steps[step].text}</p>
          <p className="mei-note">{inst.browser !== 'safari' && inst.platform === 'ios' && step === 0 ? c.note : IOS_NOTES[step]}</p>
        </div>
      ) : (
        <div className="mei-guide">
          <div className="mei-stage"><ArtMenu mode={mode} platform={inst.platform} /></div>
          <p className="mei-text mei-text--lead">{mode === 'inapp' ? c.body : 'No Install button on this page? The browser menu has it.'}</p>
          <ol className="mei-steps">
            {(mode === 'inapp' ? INAPP_STEPS[inst.platform === 'ios' ? 'ios' : 'android'] : c.steps).map((st, i) => (
              <li key={i}>
                <span className="mei-steps__n" aria-hidden="true">{i + 1}</span>
                <span className="mei-steps__t">{st.text}</span>
              </li>
            ))}
          </ol>
          {c.note && mode !== 'inapp' && <p className="mei-note">{c.note}</p>}
        </div>
      )}
    </Sheet>
  )
}

// copy.js carries one in-app step ("copy the link"); how to leave each host app is device-specific, so it lives here.
const INAPP_STEPS = {
  ios: [
    { text: 'Tap the compass icon, or the three dots, in the corner of this window.' },
    { text: 'Choose Open in Safari.' },
    { text: 'In Safari, tap Share, then Add to Home Screen.' },
  ],
  android: [
    { text: 'Tap the three dots in the corner of this window.' },
    { text: 'Choose Open in Chrome, or Open in browser.' },
    { text: 'There, tap Install app, or Add to Home screen.' },
  ],
}

/* ── the drawings ──────────────────────────────────────────────────────────── *
 * 320 x 168 drawings of iOS 17/18 Safari: the bottom toolbar (back, forward, Share, Bookmarks, Tabs), the share sheet's
 * action list (…Find on Page, Add to Home Screen, Markup), and the Add to Home Screen sheet (Cancel · title · Add).
 * Everything is stroked/filled by CSS tokens in me-install.css; the highlight ring is the single --tele accent.
 */
const SHARE = 'M-5 -3H-7a2 2 0 0 0-2 2V9a2 2 0 0 0 2 2H7a2 2 0 0 0 2-2V-1a2 2 0 0 0-2-2H5M0 5V-11M-4 -7L0 -11 4 -7'
const Tap = ({ x, y, n, pin = [17, -17] }) => (
  <g className="mei-tap" transform={`translate(${x} ${y})`}>
    <circle className="mei-ring mei-ring--pulse" r="21" />
    <circle className="mei-ring" r="21" />
    {n != null && (
      <g transform={`translate(${pin[0]} ${pin[1]})`}><circle className="mei-pin" r="9" /><text className="mei-pin__n" textAnchor="middle" y="4">{n}</text></g>
    )}
  </g>
)
const Frame = ({ children, label }) => (
  <svg className="mei-art" viewBox="0 0 320 168" role="img" aria-label={label} preserveAspectRatio="xMidYMax meet">{children}</svg>
)

function ArtShare() {
  return (
    <Frame label="Safari on iPhone. The Share button, a square with an arrow, is in the middle of the bottom toolbar.">
      <rect className="mei-page" x="0" y="0" width="320" height="168" rx="22" />
      <g className="mei-ghost"><rect x="28" y="22" width="120" height="9" rx="4.5" /><rect x="28" y="40" width="200" height="6" rx="3" /><rect x="28" y="54" width="170" height="6" rx="3" /><rect x="28" y="68" width="190" height="6" rx="3" /></g>
      <path className="mei-chrome" d="M0 90H320V146a22 22 0 0 1-22 22H22A22 22 0 0 1 0 146Z" />
      <rect className="mei-pill" x="18" y="98" width="284" height="28" rx="14" />
      <text className="mei-aa" x="34" y="117">AA</text>
      <g transform="translate(160 112)"><rect className="mei-lock" x="-26" y="-1" width="7" height="6" rx="1.4" /><path className="mei-glyph" d="M-24.6 -1V-3a2 2 0 0 1 4 0V-1" /><rect className="mei-skel" x="-14" y="-3" width="46" height="6" rx="3" /></g>
      <path className="mei-glyph" transform="translate(286 112)" d="M5 -2A5.5 5.5 0 1 0 5.5 2M5.5 -6.5V-2H1" />
      <g className="mei-bar">
        <path className="mei-glyph" transform="translate(48 142)" d="M3 -7L-4 0 3 7" />
        <path className="mei-glyph mei-dim" transform="translate(104 142)" d="M-3 -7L4 0 -3 7" />
        <path className="mei-glyph mei-hot" transform="translate(160 142)" d={SHARE} />
        <path className="mei-glyph" transform="translate(216 142)" d="M0 -5C-3-7-7-7-10-6V7C-7 6-3 6 0 8 3 6 7 6 10 7V-6C7-7 3-7 0-5ZM0 -5V8" />
        <g className="mei-glyph" transform="translate(272 142)"><rect x="-8" y="-4" width="12" height="12" rx="2.4" /><path d="M-4 -8H8a2 2 0 0 1 2 2V6" /></g>
      </g>
      <Tap x={160} y={142} n={1} />
    </Frame>
  )
}

function ArtSheet() {
  const row = (y, label, glyph, hot) => (
    <g key={label} className={hot ? 'mei-row mei-row--hot' : 'mei-row'}>
      {hot && <rect className="mei-hl" x="22" y={y} width="276" height="32" rx="10" />}
      <text className="mei-lab" x="36" y={y + 21}>{label}</text>
      <g className="mei-glyph" transform={`translate(278 ${y + 16})`}>{glyph}</g>
    </g>
  )
  return (
    <Frame label="The share sheet. Scroll the list and tap Add to Home Screen, the row with a plus in a square.">
      <rect className="mei-page" x="0" y="0" width="320" height="168" rx="22" />
      <path className="mei-chrome" d="M0 40A18 18 0 0 1 18 22H302A18 18 0 0 1 320 40V168H0Z" transform="translate(0 -6)" />
      <rect className="mei-grab" x="143" y="8" width="34" height="4" rx="2" />
      <rect className="mei-icon" x="18" y="22" width="30" height="30" rx="7" />
      <text className="mei-icon__k" x="33" y="44" textAnchor="middle">K</text>
      <text className="mei-lab mei-lab--b" x="58" y="34">KIND</text>
      <rect className="mei-skel" x="58" y="40" width="74" height="5" rx="2.5" />
      <circle className="mei-x" cx="292" cy="36" r="10" /><path className="mei-glyph" transform="translate(292 36)" d="M-3.6 -3.6L3.6 3.6M3.6 -3.6L-3.6 3.6" />
      <rect className="mei-group" x="18" y="62" width="284" height="106" rx="12" />
      {row(66, 'Find on Page', <><circle cx="-1.5" cy="-1.5" r="5" /><path d="M2 2L6 6" /></>)}
      {row(98, 'Add to Home Screen', <><rect x="-7" y="-7" width="14" height="14" rx="3" /><path d="M0 -3V3M-3 0H3" /></>, true)}
      {row(130, 'Markup', <><path d="M-6 6L-6 2 3 -7 7 -3 -2 6Z" /></>)}
      <rect className="mei-scroll" x="310" y="70" width="3" height="46" rx="1.5" />
      <g transform="translate(298 98)"><circle className="mei-pin" r="9" /><text className="mei-pin__n" textAnchor="middle" y="4">2</text></g>
    </Frame>
  )
}

function ArtAdd() {
  const id = useId().replace(/:/g, '')
  return (
    <Frame label="The Add to Home Screen sheet shows the KIND icon and name. Tap Add in the top right corner.">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="mei-st1" /><stop offset="1" className="mei-st3" />
        </linearGradient>
      </defs>
      <rect className="mei-page" x="0" y="0" width="320" height="168" rx="22" />
      <path className="mei-chrome" d="M0 28A18 18 0 0 1 18 10H302A18 18 0 0 1 320 28V168H0Z" />
      <text className="mei-lab" x="22" y="40">Cancel</text>
      <text className="mei-lab mei-lab--b" x="160" y="40" textAnchor="middle">Add to Home Screen</text>
      <text className="mei-add" x="298" y="40" textAnchor="end">Add</text>
      <rect className="mei-group" x="18" y="54" width="284" height="78" rx="12" />
      <rect x="30" y="64" width="40" height="40" rx="9.5" fill={`url(#g${id})`} />
      <text className="mei-icon__k mei-icon__k--lg" x="50" y="93" textAnchor="middle">K</text>
      <text className="mei-lab mei-lab--b" x="84" y="89">KIND</text>
      <path className="mei-hair" d="M84 112H302" />
      <rect className="mei-skel" x="84" y="119" width="92" height="5" rx="2.5" />
      <rect className="mei-skel" x="18" y="142" width="220" height="5" rx="2.5" />
      <rect className="mei-skel" x="18" y="153" width="170" height="5" rx="2.5" />
      <g transform="translate(284 34)"><ellipse className="mei-ring mei-ring--pulse mei-ring--pill" rx="26" ry="15" /><ellipse className="mei-ring mei-ring--pill" rx="26" ry="15" /></g>
      <g transform="translate(298 18)"><circle className="mei-pin" r="9" /><text className="mei-pin__n" textAnchor="middle" y="4">3</text></g>
    </Frame>
  )
}

/** Android / in-app: the browser's address row with its menu key ringed and the menu row that matters lit. */
function ArtMenu({ mode, platform }) {
  const inapp = mode === 'inapp'
  const label = inapp ? (platform === 'ios' ? 'Open in Safari' : 'Open in browser') : 'Install app'
  return (
    <Frame label={inapp ? 'The menu in the corner of this window has an Open in browser choice.' : 'The browser menu, three dots in the corner, has an Install app choice.'}>
      <rect className="mei-page" x="0" y="0" width="320" height="168" rx="22" />
      <path className="mei-chrome" d="M0 22A22 22 0 0 1 22 0H298A22 22 0 0 1 320 22V44H0Z" />
      <rect className="mei-pill" x="18" y="9" width="236" height="26" rx="13" />
      <g transform="translate(36 22)"><rect className="mei-lock" x="-4" y="-1" width="7" height="6" rx="1.4" /><path className="mei-glyph" d="M-2.6 -1V-3a2 2 0 0 1 4 0V-1" /></g>
      <rect className="mei-skel" x="56" y="19" width="70" height="6" rx="3" />
      <g className="mei-glyph mei-hot" transform="translate(290 22)"><circle cy="-6" r="1.5" className="mei-dot" /><circle r="1.5" className="mei-dot" /><circle cy="6" r="1.5" className="mei-dot" /></g>
      <rect className="mei-menu" x="150" y="50" width="160" height="110" rx="12" />
      <g className="mei-row"><text className="mei-lab" x="166" y="76">New tab</text></g>
      <g className="mei-row mei-row--hot"><rect className="mei-hl" x="158" y="87" width="144" height="30" rx="9" /><text className="mei-lab mei-lab--b" x="166" y="107">{label}</text></g>
      <g className="mei-row"><text className="mei-lab" x="166" y="138">Find in page</text></g>
      <Tap x={290} y={22} n={1} pin={[-18, 15]} />
    </Frame>
  )
}
