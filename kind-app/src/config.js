// Deployment configuration.
// ---- Neon (database + auth) ----
// From console.neon.tech after enabling Neon Auth + Data API on the project:
//   NEON_DATA_API : the Data API (PostgREST) endpoint URL
//   STACK_PROJECT_ID / STACK_PUBLISHABLE_KEY : Neon Auth client credentials
// Leave empty for local-only mode — the app works fully on this device;
// accounts/family sync simply stay hidden.
export const NEON_DATA_API = ''
export const STACK_PROJECT_ID = ''
export const STACK_PUBLISHABLE_KEY = ''

// KIND_API: the Apps Script web app /exec URL (see apps-script/SETUP.md).
// Leave empty for demo mode — the app works fully, parent login shows a
// "coming soon" state instead of calling a backend.
export const KIND_API = ''

// The main website (source of live videos.json and destination for site links).
export const SITE = 'https://kidsinspiringnation.org'

export const LINKS = {
  give: SITE + '/give',
  about: SITE + '/about',
  programs: SITE + '/#programs',
  dashboard: SITE + '/dashboard',
  nbc: SITE + '/nation-builders',
  gu: SITE + '/gU',
  whatsapp: 'https://whatsapp.com/channel/0029Va8XnCuGE56c4SMaT41w',
  telegram: 'https://t.me/KidsInspiringNation',
  instagram: 'https://instagram.com/KidsInspiringNation',
}
