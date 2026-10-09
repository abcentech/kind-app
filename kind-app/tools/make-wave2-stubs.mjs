// Creates every wave-2 module as a stub (only if it does not exist) so cross-imports resolve while specialists build in parallel.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const put = (file, body) => {
  if (existsSync(file)) return
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
}
const comp = (name, owner, extra = '') =>
  `// STUB — owner: ${owner}. Overwrite this file.\n${extra}export default function ${name}(props) { return null }\n`

const S = 'src/screens/'
const groups = {
  'learn-path': ['learn/Path', 'learn/Node', 'learn/StageDivider', 'learn/Sky', 'learn/ArchiveBanner'],
  'learn-hud': ['hud/StreakSheet', 'hud/XpSheet', 'hud/ShieldSheet', 'hud/MissionSheet'],
  'learn-launch': ['LaunchBar'],
  'lesson-shell': ['lesson/Slide'],
  'slides-read': ['lesson/slides/Open', 'lesson/slides/Watch', 'lesson/slides/Read', 'lesson/slides/Truth', 'lesson/slides/Point', 'lesson/slides/Quote'],
  'slides-word': ['lesson/slides/Verse', 'lesson/slides/Do', 'lesson/slides/Ask', 'lesson/slides/Pray'],
  'slides-declare': ['lesson/slides/Declare', 'lesson/HoldToDeclare'],
  'ex-step': ['lesson/ex/Verdict'],
  'ex-choice': ['lesson/ex/Choice', 'lesson/ex/TrueFalse', 'lesson/ex/Plate'],
  'ex-blank-order': ['lesson/ex/Blank', 'lesson/ex/Order'],
  'ex-match': ['lesson/ex/Match'],
  'complete-shell': ['complete/Stage', 'complete/beats/Xp', 'complete/beats/Month', 'complete/beats/Actions'],
  'complete-streak': ['complete/beats/Rings', 'complete/beats/Streak'],
  'complete-reward': ['complete/beats/Card', 'complete/beats/Drop'],
  'complete-rank': ['complete/beats/Rank', 'complete/beats/Medals', 'complete/beats/Patch'],
  'onboard-main': ['onboard/Beat', 'onboard/Hero', 'onboard/Who', 'onboard/Name', 'onboard/Family', 'onboard/Launch'],
  'onboard-commit': ['onboard/Goal', 'onboard/Reminder'],
  'obj-core': ['objectives/Rings', 'objectives/Today'],
  'obj-streak': ['objectives/Streak', 'objectives/Rank'],
  'obj-month': ['objectives/Month', 'objectives/MedalsPreview', 'objectives/Recap'],
  'locker-core': ['locker/Patches', 'locker/Medals'],
  'locker-cards': ['locker/Cards', 'locker/CardViewer'],
  'locker-journal': ['locker/Journal'],
  'shorts-reel': ['shorts/Reel'],
  'shorts-story': ['shorts/Story'],
  'me-core': ['me/Pilot', 'me/Missions', 'me/Family', 'me/Links', 'me/About', 'me/Developer'],
  'me-settings': ['me/Settings'],
  'me-install': ['me/Install'],
}
// wrappers that must pass children through even as stubs
put(`${S}onboard/Beat.jsx`, `// STUB — owner: onboard-main. Props { eyebrow, title, dek, children, footer, step, steps, back }\nexport default function Beat({ children }) { return <div>{children}</div> }\n`)
put(`${S}lesson/Slide.jsx`, `// STUB — owner: lesson-shell.\nexport default function Slide({ children }) { return <div className="lesson-slide">{children}</div> }\n`)
for (const [owner, files] of Object.entries(groups))
  for (const f of files) put(`${S}${f}.jsx`, comp(f.split('/').pop(), owner))

// real registries (small, but they let composers import everything now)
put(`${S}lesson/steps.js`, `// STUB — owner: lesson-shell.\nexport const buildSteps = () => []\n`)
put(`${S}lesson/slides/index.js`, `// owner: lesson-shell. kind -> slide component (deckFor card kinds).
import Open from './Open.jsx'
import Watch from './Watch.jsx'
import Read from './Read.jsx'
import Truth from './Truth.jsx'
import Point from './Point.jsx'
import Quote from './Quote.jsx'
import Verse from './Verse.jsx'
import Do from './Do.jsx'
import Ask from './Ask.jsx'
import Pray from './Pray.jsx'
import Declare from './Declare.jsx'
export const SLIDES = { open: Open, watch: Watch, read: Read, truth: Truth, point: Point, quote: Quote, verse: Verse, do: Do, ask: Ask, pray: Pray, declare: Declare }
`)
put(`${S}lesson/ex/index.js`, `// owner: ex-step. exercise type -> view.
import Choice from './Choice.jsx'
import TrueFalse from './TrueFalse.jsx'
import Blank from './Blank.jsx'
import Order from './Order.jsx'
import Match from './Match.jsx'
export const VIEWS = { choice: Choice, tf: TrueFalse, blank: Blank, order: Order, match: Match }
`)
put(`${S}complete/beats/index.js`, `// owner: complete-shell. beat id (from completionBeats) -> component.
import Xp from './Xp.jsx'
import Rings from './Rings.jsx'
import Streak from './Streak.jsx'
import Card from './Card.jsx'
import Drop from './Drop.jsx'
import Rank from './Rank.jsx'
import Medals from './Medals.jsx'
import Patch from './Patch.jsx'
import Month from './Month.jsx'
import Actions from './Actions.jsx'
export const BEATS = { xp: Xp, rings: Rings, streak: Streak, shield: Streak, milestone: Streak, card: Card, drop: Drop, rank: Rank, 'rank-up': Rank, medals: Medals, patch: Patch, month: Month, actions: Actions }
`)
put('src/lib/shareCanvas.js', `// STUB — owner: share-canvas.\nexport const TEMPLATES = { verse: [], card: [], streak: [], month: [] }\nexport const ASPECTS = [{ id: 'story', w: 1080, h: 1920, label: 'Story' }, { id: 'square', w: 1080, h: 1080, label: 'Square' }, { id: 'portrait', w: 1080, h: 1350, label: 'Portrait' }]\nexport async function renderShare() { return document.createElement('canvas') }\nexport const canvasToBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'))\n`)
for (const k of ['verse', 'card', 'streak', 'month']) put(`src/lib/share/${k}.js`, `// STUB — owner: share-canvas.\nexport default function draw() {}\n`)

// stylesheets
const css = (file, owner, prefix) => put(`src/styles/${file}.css`, `/* owner: ${owner} (prefix ${prefix}) */\n@layer screen {\n}\n`)
const sheets = [
  ['hud', 'learn-hud', '.hud-'], ['launchbar', 'learn-launch', '.launch-'], ['slides', 'slides-read', '.slr-'], ['slides-word', 'slides-word', '.slw-'],
  ['declare', 'slides-declare', '.sld-'], ['ex-choice', 'ex-choice', '.exc-'], ['ex-blank', 'ex-blank-order', '.exb-'], ['ex-match', 'ex-match', '.exm-'],
  ['complete-streak', 'complete-streak', '.cms-'], ['complete-reward', 'complete-reward', '.cmr-'], ['complete-rank', 'complete-rank', '.cmk-'],
  ['onboard-commit', 'onboard-commit', '.onc-'], ['objectives-streak', 'obj-streak', '.obs-'], ['objectives-month', 'obj-month', '.obm-'],
  ['locker-cards', 'locker-cards', '.lcc-'], ['locker-journal', 'locker-journal', '.lcj-'], ['shorts-story', 'shorts-story', '.shs-'],
  ['me-settings', 'me-settings', '.mes-'], ['me-install', 'me-install', '.mei-'],
]
for (const [f, o, p] of sheets) css(f, o, p)
put('src/styles/launchbar.css', '/* owner: learn-launch (prefix .launch-) */\n@layer screen {\n  :root { --launch-h: 148px; }\n}\n')

const order = ['tokens', 'fonts', 'base', 'ui', 'ui-overlay', 'art', 'art2', 'fx', 'shell',
  'ignition', 'onboard', 'onboard-commit', 'hud', 'learn', 'launchbar', 'lesson', 'slides', 'slides-word', 'declare',
  'exercises', 'ex-choice', 'ex-blank', 'ex-match', 'complete', 'complete-streak', 'complete-reward', 'complete-rank',
  'objectives', 'objectives-streak', 'objectives-month', 'locker', 'locker-cards', 'locker-journal', 'shorts', 'shorts-story',
  'me', 'me-settings', 'me-install', 'share']
writeFileSync('src/styles/index.css', `/* The one stylesheet the app imports. Layer order is declared in tokens.css (first import). */\n${order.map((n) => `@import './${n}.css';`).join('\n')}\n`)
console.log('stubs ok')
