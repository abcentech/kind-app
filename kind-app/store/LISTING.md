# KIND — Google Play listing

Copy and shot-list for the Play Console (and, with small edits, the App Store). Written for the real audience: Nigerian teens and the
families who lead them, mostly on mid-range Android and mobile data. Voice follows `docs/V7-DESIGN.md` §7: confident, spare, reverent;
short declaratives; no exclamation marks outside milestones; no emoji; never cute with kids, never clinical with Scripture.

The three fenced blocks below carry a language tag (`title`, `short`, `long`, `whatsnew`) so `node scripts/make-icons.mjs` can
count characters against the Play limits on every run — if you edit them and break a limit, the build says so.

## Store text (English — Nigeria, en-NG)

**Title** (max 30)

```title
KIND: Daily Family Devotional
```

**Short description** (max 80)

```short
Six minutes a day: Scripture, one truth, a challenge, a prayer. Free, offline.
```

**Full description** (max 4,000)

```long
Raising goDs. Building nations.

KIND is the daily family devotional from Kids Inspiring Nation. One short launch a day, about six minutes: read the Word, learn one truth, answer it, pray it.

HOW A DAY WORKS
Every day opens with Scripture, set large like the cover of a book. Then one central truth, short teaching points, a challenge you can do today, a prayer and a declaration. Between the reading and the amen is a quick check: choose, fill the gap, put the words in order, match the pairs, true or false. Miss one and it returns once at the end, not as a punishment but as a second look. Every day ends on the Word, never on a score.

BUILT FOR THE LONG WALK
Thirty-one days is a mission. Each week is a stage. Climb from Day 1 on the pad to Day 31 in orbit, and earn a patch for every stage you clear.

- Streak: protect it. A Shield, earned every seven days, holds your streak on a day you miss.
- Daily rings: Lesson, XP and Accuracy close as you go.
- Ranks and medals: seven ranks and more than twenty-four medals.
- Code cards: one for every day you finish, and every seventh is gold.
- Journal: every answer you wrote, kept in one place.
- Shorts: the short videos that go with each day.

TWO MISSIONS TO START
The Stewardship Code: Secrets to Managing Money. Four stages: Ownership, Faithfulness, Mastery, Multiplication. Christ my Master, money my servant.
Secrets of Longevity: Seven Decades of Serving God. Five stages: Foundation, Faith, Focus, Fitness, Finishing.

BUILT FOR HOW YOU LIVE
- Works offline. Open it once, take it anywhere. No data, no problem.
- Light on your phone. Made to run smoothly on mid-range Android and to use very little data.
- Private by design. No account, no sign-up, no ads, no tracking. Your streak and your journal stay on your device.
- Free. Always.
- Teens can fly solo, or a parent can lead the whole family. Choose at the start.
- Add a daily reminder to your calendar in one tap.

KIND is made by Kids Inspiring Nation, a ministry raising a generation that knows the Word and builds the nation.

Faithful in little. Your labour is not in vain.
```

**What's new** (max 500) — for the first release

```whatsnew
Version 7, Ascent. A new way to walk the month: a flight path from Day 1 to Day 31, a launch for every day, daily rings, Shields to protect your streak, code cards, medals and a journal of your own answers. Faster, lighter, and it works offline.
```

### Other fields

| Field | Value | Note |
|---|---|---|
| Default language | English (Nigeria) — en-NG | Add en-GB, en-US as copies when ready |
| App or game | App | |
| Category | **Lifestyle** (alt: Education) | Play has no religion category; Lifestyle is where devotionals sit |
| Tags | pick the closest "Religion & spirituality / Bible / Prayer" tags in the Console | max 5 |
| Price | Free, no in-app purchases, no ads | the product sells nothing — see `CLAUDE.md` standing constraints |
| Contact email | `TODO` — a monitored KIN support address | **not invented here** |
| Website | `TODO` — the KIN site URL | |
| Privacy policy URL | `TODO` — required even for no-data apps | wording below |
| Hi-res icon | `store/icon-512.png` | full-bleed square; Google applies the mask |
| Feature graphic | `store/feature-graphic-1024x500.png` | |
| Phone screenshots | 8 × 1080×1920 → `store/screenshots/play/` | shot-list below |
| Tablet screenshots | optional: 7" and 10", reuse the same 8 from `device: tablet` | |

## Policy answers (draft — confirm against the shipped build)

- **Data safety:** *No data collected, no data shared.* Progress, settings and the journal live in `localStorage` on the device.
  The only third-party contact is the YouTube privacy-enhanced player, loaded **only after the user taps play**; say so in the privacy policy.
- **Content rating (IARC):** no violence, no sexual content, no gambling, no profanity, no user-generated content shared with others,
  no location sharing, no purchases → expect the lowest rating. Religious content is declared as such.
- **Target audience — a decision for the founder.** The brief says "teens and families". If under-13s are a target audience, Google's
  **Families Policy** applies (ads/SDK restrictions, privacy-policy wording, "designed for families" review). Declaring 13+ and adults
  and describing the family mode in text is the lighter path; declaring 5–12 is possible because there are no ads or trackers, but is a
  larger review. Pick deliberately.
- **App access:** no login. Nothing to provide to reviewers. Tip for the reviewer notes: the live month only unlocks on its dates; the app
  runs in *archive mode* (every day open) outside them.
- **Permissions:** none requested (reminders are a downloaded `.ics`, not notifications).
- **Packaging:** the PWA ships to Play as a Trusted Web Activity (Bubblewrap). Inputs from this folder: `icon-maskable-512.png`,
  `icon-monochrome-512.png`, `background_color` and `theme_color` = `#06070d` (`store/manifest-icons.json`), signing key kept by KIN.

### Privacy-policy wording (starter)

> KIND does not collect, store on our servers, or share personal information. Your name, progress, streak and journal are saved only
> on your own device. KIND has no accounts, no advertising and no analytics. If you choose to watch a video, KIND loads the YouTube
> player (youtube-nocookie.com) after you tap play; YouTube's own privacy policy applies to that playback.

## Claims → where they are true

Before submitting, tick each against the build. If a claim is not true yet, cut the sentence, not the truth.

| Claim in the listing | Where it lives |
|---|---|
| ~6 minutes a day | lesson length in the Launch Bar copy (`src/copy.js`) |
| Check types: choose, fill, order, match, true/false · missed returns once | `src/quiz.js` + lesson screen |
| Ends on the Word | declaration is the last slide |
| 31 days, weekly stages, a patch per stage | `library.series[*].calendar`, `weeks` |
| Shield every seven days, holds the streak | `src/store.js` shields, `finishDay` |
| Three rings: Lesson / XP / Accuracy | `rings(st)` |
| Seven ranks, 24+ medals | `RANKS` (≥ 7), `ACHIEVEMENTS` (≥ 24) |
| Code card per day, every seventh gold | `codes[].rare` |
| Journal of your own answers | `saveNote` / Locker |
| Offline | service worker precache (`public/sw.js`) |
| Private, no account, no ads, no tracking | design doc §10 |
| Calendar reminder in one tap | onboarding step 5 → `.ics` |
| Parent/teen roles | onboarding step 2 |

## Screenshot shot-list

Eight phone screens, in this order (Play shows the first three most). Capture the **raw** app at `device: iphone` (390×844 @3) with the
clock set so the month is live, save to `store/screenshots/raw/NN-slug.png`, then run

```
node scripts/make-icons.mjs --screenshots
```

which frames each one onto the starfield/horizon background with its caption (from `store/screenshots/captions.json`) and writes
1080×1920 files to `store/screenshots/play/`. Captions are four words or fewer; the verb is always the user's.

| # | File | Screen & state | Clock | Caption | What must be in frame |
|---|---|---|---|---|---|
| 1 | `01-ascent` | **Learn** — the Ascent, today's node mid-climb, rocket with exhaust, Launch Bar pinned | `?now=2026-08-12` | **Climb the month** | glass HUD (streak, XP, shields), lit flight path, stage banner with a cleared patch, Launch Bar with the ignition button |
| 2 | `02-word` | **Lesson** — a Scripture slide (large serif verse + mono reference) | `?now=2026-08-12` | **Start with the Word** | verse ≥ 28 px, segmented ticker at the top, nothing else |
| 3 | `03-check` | **Lesson** — order-the-words exercise, one plate picked, CHECK enabled | `?now=2026-08-12` | **Learn it. Then prove it.** | chamfered answer plates with keycaps, the CHECK control |
| 4 | `04-verdict` | **Verdict sheet** — a correct answer, green LED, CONTINUE | `?now=2026-08-12` | **Know where you stand** | status LED + line + the XP delta |
| 5 | `05-orbit` | **Orbit insertion** — completion, rings closing, a dealt code card (gold) | `?now=2026-08-12` | **Finish strong** | XP count-up, three rings, the card |
| 6 | `06-objectives` | **Objectives** — rings on the bezel, quests with rewards, the flame heat-calendar | `?now=2026-08-19` | **Build the habit** | heat calendar with a streak, ≥ 7 flames |
| 7 | `07-locker` | **Locker** — quilted code-card grid, one gold card catching light | `?now=2026-08-19` | **Collect what you earn** | gold card with foil, stage patches |
| 8 | `08-private` | **Me** — pilot card, settings, the line *Nothing leaves this device.* | none | **Private by design** | the privacy line, offline indicator |

Capture notes:

- Use the Ada test profile (`tools/browser.mjs` default state) with a believable mid-month history; no real children's names anywhere.
- Hide the dev-server banner and any console toasts. Sound toast ("Sound on") must not be in frame.
- Shots 1 and 5 are the money shots — wait for the entrance motion to finish (`settle: 900`).
- For tablets: `device: 'tablet'` (820×1180 @2), same eight states; `--screenshots` frames them 1600×2560.
- Do not add UI that does not exist. If a screen changes, retake the shot.

## Optional: 30-second promo video (YouTube link in the listing)

Storyboard (all captured live from the app, no stock footage): 0–3 s Ignition splash (needle sweeps, wordmark tracks in) ·
3–9 s the Ascent scrolling up, the rocket on today's node · 9–15 s Launch (button sinks, ignite flash) into a Scripture slide ·
15–21 s a check, the verdict sheet, XP flying to the HUD · 21–27 s Orbit insertion, the gold card turning · 27–30 s the lockup on the
horizon with *Raising goDs. Building nations.* Music: the synth score only (no stock tracks).
