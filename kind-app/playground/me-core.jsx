// me-core playground — the Me tab in the real shell frame.
//   ?seed=new | parent | adv     writes a demo state to localStorage once per tab, before the store boots (hence the dynamic imports)
//   ?now=2026-08-12  ?series=secrets-of-longevity  ?fx=lite   (shell knobs)
const q = new URLSearchParams(location.search)
const seed = q.get('seed')
const KEY = 'kind-app-v4'
const FLAG = 'me-core-seeded:' + (seed || '')

async function main() {
  if (seed && !sessionStorage.getItem(FLAG)) {
    const { demoState } = await import('../src/store.js')
    const parent = { name: 'Oluwadamilọlá Ọlábísí Adébáyọ̀', role: 'parent', familyName: 'Adébáyọ̀', kids: [{ name: 'Tèmídayọ̀' }, { name: 'Ifeoluwa' }, { name: 'Chukwuemeka' }] }
    const st = seed === 'adv' ? { ...demoState('veteran'), name: 'Kemi' }
      : seed === 'parent' ? { ...demoState('mid'), ...parent }
      : demoState('fresh')
    localStorage.setItem(KEY, JSON.stringify(st))
    sessionStorage.setItem(FLAG, '1')
    location.reload()
    return
  }
  const [{ mountScreen }, { default: Me }, { default: Hud }] = await Promise.all([
    import('./_shell.jsx'), import('../src/screens/Me.jsx'), import('../src/screens/Hud.jsx'),
  ])
  mountScreen(<Me />, { hud: Hud, dock: true, tab: 'me' })
}
main()
