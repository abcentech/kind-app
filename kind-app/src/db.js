// Data layer — Neon Data API (PostgREST semantics) with Neon Auth JWT.
// Every call is scoped by Row Level Security (see db/schema.sql); the client
// never sees rows outside the signed-in user's family.
// The auth layer injects its token/user getters at sign-in time (see
// _setAuth below), so this module stays dormant — and the app keeps building —
// until the Neon project exists and config.js is filled in.
import { NEON_DATA_API } from './config.js'

export const dbConfigured = () => Boolean(NEON_DATA_API)

let getAccessToken = async () => null
let userId = async () => null
export const _setAuth = ({ token, user }) => {
  if (token) getAccessToken = token
  if (user) userId = user
}

async function req(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await getAccessToken()
  const res = await fetch(NEON_DATA_API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || data?.error || `db_${res.status}`)
  return data
}

/* ---- members ---- */
export const myMember = async () => (await req('/members?user_id=eq.' + encodeURIComponent(await userId()) + '&limit=1'))[0] || null
export const familyMembers = () => req('/members?order=created_at.asc')
export const upsertSelf = (fields) =>
  req('/members?on_conflict=user_id', {
    method: 'POST', body: [fields],
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  }).then((r) => r[0])
export const addManagedKid = (family_id, display_name, emoji) =>
  req('/members', {
    method: 'POST', body: [{ family_id, role: 'kid', display_name, emoji }],
    headers: { Prefer: 'return=representation' },
  }).then((r) => r[0])
export const updateMember = (id, fields) =>
  req('/members?id=eq.' + id, { method: 'PATCH', body: fields })
export const removeMember = (id) => req('/members?id=eq.' + id, { method: 'DELETE' })

/* ---- families ---- */
export const myFamily = async () => (await req('/families?limit=1'))[0] || null
export const createFamily = (name) => req('/rpc/create_family', { method: 'POST', body: { family_name: name } })
export const joinFamily = (code) => req('/rpc/join_family', { method: 'POST', body: { code } })

/* ---- checkins ---- */
export const recordCheckin = (family_id, member_id, series, day, streak) =>
  req('/checkins?on_conflict=member_id,series,day', {
    method: 'POST', body: [{ family_id, member_id, series, day, streak }],
    headers: { Prefer: 'resolution=ignore-duplicates' },
  }).catch(() => {})
export const familyCheckins = (series) => req('/checkins?series=eq.' + encodeURIComponent(series))
