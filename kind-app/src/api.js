// Client for the KIND App API (Apps Script web app — see apps-script/SETUP.md).
// All POSTs are urlencoded (simple requests, no CORS preflight — same trick as
// the site's Form Hub); reads are plain GETs returning JSON.
import { KIND_API } from './config.js'

const TOKEN_KEY = 'kind-app-token'

export const apiConfigured = () => Boolean(KIND_API)
export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))
export const loggedIn = () => apiConfigured() && Boolean(getToken())

async function post(params) {
  const res = await fetch(KIND_API, {
    method: 'POST',
    body: new URLSearchParams(params),
  })
  return res.json()
}

export const requestCode = (email) => post({ action: 'request_code', email })
export const verifyCode = async (email, code) => {
  const r = await post({ action: 'verify_code', email, code })
  if (r.ok) setToken(r.token)
  return r
}

export async function fetchFamily() {
  const res = await fetch(`${KIND_API}?action=family&token=${encodeURIComponent(getToken())}`)
  const r = await res.json()
  if (!r.ok && r.error === 'unauthorized') setToken('')
  return r
}

export function reportCheckin({ day, streak, gems }) {
  if (!loggedIn()) return
  // fire-and-forget; failures never block the devotional flow
  post({ action: 'checkin', token: getToken(), day, streak, gems }).catch(() => {})
}

export const logout = () => setToken('')
