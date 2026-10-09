// The app's clock. Everything that asks "what day is it?" goes through here, never `new Date()`.
//   ?now=2026-08-12            pretend it is 12 Aug 2026, 09:00 local (time keeps ticking from there)
//   ?now=2026-08-12T19:30      …at 19:30
//   ?now=live                  stop pretending (also clears it)
// The override lives in sessionStorage so it survives reloads and in-app navigation, and dies with the tab.
const KEY = 'kind-now-offset'
let offset = 0
let simulated = false

try {
  const q = new URLSearchParams(location.search).get('now')
  if (q === 'live' || q === '') sessionStorage.removeItem(KEY)
  else if (q) {
    const t = new Date(q.length <= 10 ? q + 'T09:00:00' : q).getTime()
    if (!Number.isNaN(t)) sessionStorage.setItem(KEY, String(t - Date.now()))
  }
  const saved = sessionStorage.getItem(KEY)
  if (saved != null) { offset = Number(saved) || 0; simulated = offset !== 0 }
} catch { /* private mode: run on the real clock */ }

/** The current Date, honouring ?now=. */
export const now = () => new Date(Date.now() + offset)
/** Local calendar day as YYYY-MM-DD (the key progress is stored under). */
export const today = (d = now()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const isSimulated = () => simulated
