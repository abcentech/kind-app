// Shell plumbing for an installed app: service-worker lifecycle, the install prompt, connectivity, boot hand-off.
//
//   main.jsx (first import, so `beforeinstallprompt` is caught before React mounts — it fires once and is never repeated):
//     import './pwa.js'
//     import { registerSW, removeBoot } from './pwa.js'
//     registerSW({ onUpdate: (apply) => toast({ title: 'New version ready', action: { label: 'Refresh', onClick: apply } }) })
//     createRoot(...).render(<App />);  removeBoot()           // after the first render is committed
//   anywhere:  const { canInstall, install, isStandalone, platform, needsIosGuide } = useInstall()
//              const online = useOnline()
//
// Never reloads on its own: a lesson in progress is sacred. The update is applied only when the user taps Refresh.
import { useSyncExternalStore } from 'react'

const hasWindow = typeof window !== 'undefined'
const nav = hasWindow ? navigator : {}
const UA = nav.userAgent || ''

/** A tiny external store: `compute()` builds an immutable snapshot, `refresh()` replaces it and notifies. */
function createStore(compute) {
  const subs = new Set()
  let snap = compute()
  return {
    get: () => snap,
    refresh() { const next = compute(); if (shallowDiffers(snap, next)) { snap = next; subs.forEach((f) => f()) } },
    subscribe(f) { subs.add(f); return () => subs.delete(f) },
  }
}
function shallowDiffers(a, b) {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return true
  return ka.some((k) => a[k] !== b[k])
}

// ── Environment ───────────────────────────────────────────────────────────────────────────────────────────────────
/** 'ios' | 'android' | 'desktop'. iPadOS 13+ presents itself as a Mac, so touch points give it away. */
function detectPlatform() {
  if (/iPhone|iPad|iPod/.test(UA)) return 'ios'
  if (/Macintosh/.test(UA) && nav.maxTouchPoints > 1) return 'ios'
  if (/Android/.test(UA)) return 'android'
  return 'desktop'
}
/** Browser family, and whether we are inside another app's web view (WhatsApp, Facebook, Instagram…) where install is impossible. */
function detectBrowser(platform) {
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|MicroMessenger|GSA\/|; wv\)/i.test(UA)
  if (platform === 'ios') {
    if (/CriOS/.test(UA)) return { browser: 'chrome', inAppBrowser: inApp }
    if (/FxiOS/.test(UA)) return { browser: 'firefox', inAppBrowser: inApp }
    if (/EdgiOS/.test(UA)) return { browser: 'edge', inAppBrowser: inApp }
    if (/OPiOS|OPT\//.test(UA)) return { browser: 'opera', inAppBrowser: inApp }
    // Real Safari carries "Version/x … Safari/x"; a WKWebView host (WhatsApp, Telegram, …) has neither.
    if (/Version\/[\d.]+.*Safari\//.test(UA) && !inApp) return { browser: 'safari', inAppBrowser: false }
    return { browser: 'webview', inAppBrowser: true }
  }
  if (inApp) return { browser: 'webview', inAppBrowser: true }
  if (/SamsungBrowser/.test(UA)) return { browser: 'samsung', inAppBrowser: false }
  if (/Firefox\//.test(UA)) return { browser: 'firefox', inAppBrowser: false }
  if (/EdgA?\//.test(UA)) return { browser: 'edge', inAppBrowser: false }
  if (/OPR\//.test(UA)) return { browser: 'opera', inAppBrowser: false }
  if (/Chrome\//.test(UA)) return { browser: 'chrome', inAppBrowser: false }
  if (/Safari\//.test(UA)) return { browser: 'safari', inAppBrowser: false }
  return { browser: 'other', inAppBrowser: false }
}
const platform = detectPlatform()
const { browser, inAppBrowser } = detectBrowser(platform)

const mq = (q) => (hasWindow && window.matchMedia ? window.matchMedia(q) : null)
/** Running as an installed app (any display mode but 'browser'), incl. iOS' own flag and an Android TWA. */
export function isStandaloneNow() {
  if (!hasWindow) return false
  return Boolean(
    mq('(display-mode: standalone)')?.matches || mq('(display-mode: fullscreen)')?.matches ||
    mq('(display-mode: minimal-ui)')?.matches || mq('(display-mode: window-controls-overlay)')?.matches ||
    nav.standalone === true || (document.referrer || '').startsWith('android-app://'),
  )
}

// ── Install ───────────────────────────────────────────────────────────────────────────────────────────────────────
let deferredPrompt = null      // the captured BeforeInstallPromptEvent (Chromium/Android/desktop only)
let installedFlag = false

const installStore = createStore(() => {
  const isStandalone = installedFlag ? true : isStandaloneNow()
  return {
    canInstall: !!deferredPrompt && !isStandalone,
    installed: installedFlag || isStandalone,
    isStandalone,
    platform,
    browser,
    inAppBrowser,
    // iOS never fires beforeinstallprompt: the only way in is Share → Add to Home Screen, so we show a guide.
    needsIosGuide: platform === 'ios' && !isStandalone,
    install,
  }
})

/** Show the browser's install dialog. Resolves 'accepted' | 'dismissed' | 'unavailable'. One-shot: the event is consumed. */
export async function install() {   // hoisted: the store snapshot above references it
  const ev = deferredPrompt
  if (!ev) return 'unavailable'
  deferredPrompt = null
  installStore.refresh()
  try {
    await ev.prompt()
    const { outcome } = await ev.userChoice
    return outcome
  } catch {
    return 'unavailable'
  }
}

if (hasWindow) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()                 // we show our own, timed after the first completed lesson
    deferredPrompt = e
    installStore.refresh()
  })
  window.addEventListener('appinstalled', () => {
    installedFlag = true
    deferredPrompt = null
    installStore.refresh()
  })
  for (const q of ['(display-mode: standalone)', '(display-mode: fullscreen)', '(display-mode: minimal-ui)']) {
    const m = mq(q)
    if (m) (m.addEventListener ? m.addEventListener('change', () => installStore.refresh()) : m.addListener?.(() => installStore.refresh()))
  }
}

/**
 * @returns {{ canInstall:boolean, install:()=>Promise<string>, isStandalone:boolean, installed:boolean,
 *   platform:'ios'|'android'|'desktop', needsIosGuide:boolean, browser:string, inAppBrowser:boolean }}
 *   canInstall — a native prompt is ready (Android/desktop Chromium).
 *   needsIosGuide — iOS and not yet on the Home Screen; show the Share → Add to Home Screen steps.
 *   inAppBrowser — inside WhatsApp/Facebook/etc.; neither route works there, tell the user to open it in Safari / Chrome.
 */
export const useInstall = () => useSyncExternalStore(installStore.subscribe, installStore.get, installStore.get)

// ── Connectivity ──────────────────────────────────────────────────────────────────────────────────────────────────
const onlineStore = createStore(() => ({ online: hasWindow ? nav.onLine !== false : true }))
if (hasWindow) {
  window.addEventListener('online', () => onlineStore.refresh())
  window.addEventListener('offline', () => onlineStore.refresh())
}
/** navigator.onLine: a reliable "no" and a hopeful "yes" (a phone on a dead tower still says true). Don't gate features on it — degrade on failure. */
export const useOnline = () => useSyncExternalStore(onlineStore.subscribe, () => onlineStore.get().online, () => true)

// ── Service worker ────────────────────────────────────────────────────────────────────────────────────────────────
let updateReady = false
let offlineReady = false
let regRef = null
let waitingWorker = null
let userApplied = false
let registered = false
const handlers = { onUpdate: null, onReady: null }
const updateStore = createStore(() => ({ ready: updateReady, offlineReady, apply: applyUpdate, check: checkForUpdate }))

/** The build id stamped into index.html at build time ('dev' under the dev server). */
export const getBuild = () => (hasWindow ? document.querySelector('meta[name="kind-build"]')?.content || 'dev' : 'dev')

/** Reactive state of the update flow: `ready` = a new version is installed and waiting; `offlineReady` = the offline pack is complete. */
export const useUpdate = () => useSyncExternalStore(updateStore.subscribe, updateStore.get, updateStore.get)

/** Activate the waiting worker; the page reloads once it takes over. Safe to call when nothing is waiting (no-op). */
export function applyUpdate() {
  if (!waitingWorker) return
  userApplied = true
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  // If the worker vanished (superseded) and controllerchange never comes, don't leave the user hanging.
  setTimeout(() => { if (userApplied) location.reload() }, 4000)
}
/** Ask the browser to look for a newer sw.js now. */
export function checkForUpdate() {
  return regRef ? regRef.update().catch(() => {}) : Promise.resolve()
}

const idle = (fn) => (hasWindow && 'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 800))

/**
 * Register the service worker (production builds only; the dev server unregisters strays instead). Idempotent: a second
 * call (React StrictMode, HMR) only swaps the callbacks.
 * @param {{ onUpdate?:(apply:()=>void)=>void, onReady?:()=>void, onError?:(e:Error)=>void, force?:boolean }} [o]
 *   onUpdate — a new version is installed and waiting: show "New version ready — Refresh", call `apply()` on tap.
 *   onReady  — first install finished: the app now works offline (show once, quietly).
 * @returns {{ update:()=>Promise<void>, apply:()=>void }}
 */
export function registerSW({ onUpdate, onReady, onError, force = false } = {}) {
  const api = { update: checkForUpdate, apply: applyUpdate }
  if (!hasWindow || !('serviceWorker' in nav)) return api
  if (!force && !import.meta.env?.PROD) { devCleanup(); return api }

  handlers.onUpdate = onUpdate || null
  handlers.onReady = onReady || null
  if (updateReady && onUpdate) call(() => onUpdate(applyUpdate))
  if (registered) return api
  registered = true

  let controlled = !!nav.serviceWorker.controller
  const firstInstall = !controlled

  nav.serviceWorker.addEventListener('controllerchange', () => {
    const wasControlled = controlled
    controlled = true
    if (!wasControlled) return                               // first install claiming this page: nothing to swap
    if (userApplied || document.visibilityState === 'hidden') { userApplied = false; location.reload() }
    // else: another tab accepted an update. Keep this session (and any lesson in it) intact; the next launch picks it up.
  })

  const offer = (worker) => {
    waitingWorker = worker
    updateReady = true; updateStore.refresh()
    call(() => handlers.onUpdate && handlers.onUpdate(applyUpdate))
  }

  const go = async () => {
    try {
      const url = new URL(`${import.meta.env?.BASE_URL || './'}sw.js`, location.href)
      const reg = await nav.serviceWorker.register(url, { updateViaCache: 'none' })   // scope = the folder sw.js lives in
      regRef = reg
      if (reg.waiting && nav.serviceWorker.controller) offer(reg.waiting)
      reg.addEventListener('updatefound', () => {
        const w = reg.installing
        if (!w) return
        w.addEventListener('statechange', () => { if (w.state === 'installed' && nav.serviceWorker.controller) offer(w) })
      })
      nav.serviceWorker.ready.then(() => {
        offlineReady = true; updateStore.refresh()
        if (firstInstall) call(() => handlers.onReady && handlers.onReady())
      })
      scheduleChecks()
    } catch (e) {
      registered = false
      call(() => onError && onError(e))
    }
  }
  if (document.readyState === 'complete') idle(go)
  else window.addEventListener('load', () => idle(go), { once: true })
  return api
}
const call = (fn) => { try { fn() } catch { /* a bad callback must not break the lifecycle */ } }

/** Installed PWAs stay open for days: look for a new build when the app returns to the foreground, reconnects, or every 30 min. */
function scheduleChecks() {
  const EVERY = 30 * 60 * 1000
  let last = Date.now()
  const check = () => { last = Date.now(); checkForUpdate() }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - last > EVERY) check() })
  window.addEventListener('online', check)
  setInterval(() => { if (document.visibilityState === 'visible') check() }, EVERY)
}

/** Dev: a worker left over from a production preview on this origin would serve stale files. Remove it quietly. */
function devCleanup() {
  nav.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {})
  if (window.caches) caches.keys().then((ks) => ks.filter((k) => k.startsWith('kind-')).forEach((k) => caches.delete(k))).catch(() => {})
}

/** "Something is wrong, start clean": drops the worker and the offline pack (never progress, which lives in localStorage), then reloads. */
export async function repairOfflinePack({ reload = true } = {}) {
  try {
    const rs = (await nav.serviceWorker?.getRegistrations?.()) || []
    await Promise.all(rs.map((r) => r.unregister()))
    if (window.caches) await Promise.all((await caches.keys()).filter((k) => k.startsWith('kind-')).map((k) => caches.delete(k)))
  } catch { /* nothing to clean */ }
  if (reload) location.reload()
}

// ── Storage + badge ───────────────────────────────────────────────────────────────────────────────────────────────
/** Ask the browser not to evict our data under storage pressure (it holds the streak). Granted silently to installed apps. */
export async function persistStorage() {
  try {
    if (!nav.storage?.persist) return false
    return (await nav.storage.persisted()) || (await nav.storage.persist())
  } catch { return false }
}
/** Home-screen badge (installed Android/desktop; iOS 16.4+ with notification permission). Pass 0 to clear. No-op elsewhere. */
export function setAppBadge(count = 0) {
  try { return count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.() } catch { /* unsupported */ }
}

// ── Boot hand-off ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Take down the inline #boot splash (index.html). The inline script already does this by itself as soon as React puts
 * its first element in #root, so calling this is optional; it exists to say "now" explicitly (e.g. after Ignition is
 * painted). Two animation frames so the app's first paint lands underneath before the splash leaves; a short fade,
 * none under reduced motion / lite fx. Idempotent.
 */
export function removeBoot() {
  if (!hasWindow) return
  if (typeof window.__kindBootOut === 'function') { window.__kindBootOut(); return }
  document.getElementById('boot')?.remove()
}
