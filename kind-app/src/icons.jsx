/**
 * One icon system: 24-grid, 1.6 stroke, round caps, no fills, no emoji.
 * Everything inherits currentColor so icons take the tone of their context.
 */
const S = ({ children, size = 24, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
)

export const Icon = {
  today: (p) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" /></S>,
  journey: (p) => <S {...p}><path d="M6 3.5v13M6 20.5v-1M18 7.5v13" /><circle cx="6" cy="18.5" r="2" /><circle cx="18" cy="5.5" r="2" /><path d="M8 18.5h4a2 2 0 0 0 2-2V9a2 2 0 0 1 2-2" /></S>,
  vault: (p) => <S {...p}><rect x="3" y="7" width="18" height="14" rx="3.4" /><path d="M6.5 4.5h11M8.5 12.5h7M8.5 16h4" /></S>,
  shorts: (p) => <S {...p}><rect x="6.5" y="2.8" width="11" height="18.4" rx="3.4" /><path d="m10.8 9.2 4.2 2.8-4.2 2.8z" /></S>,
  me: (p) => <S {...p}><circle cx="12" cy="8.2" r="3.6" /><path d="M4.8 20.4c.5-3.7 3.5-6 7.2-6s6.7 2.3 7.2 6" /></S>,

  chevron: (p) => <S {...p}><path d="m9 5 7 7-7 7" /></S>,
  close: (p) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>,
  check: (p) => <S {...p}><path d="m5 12.8 4.4 4.4L19 7.4" /></S>,
  lock: (p) => <S {...p}><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></S>,
  play: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="m10 8.6 5.4 3.4-5.4 3.4z" /></S>,
  share: (p) => <S {...p}><path d="M12 15.5V3.8M8.2 7.4 12 3.6l3.8 3.8" /><path d="M5.5 13v5.6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V13" /></S>,
  flame: (p) => <S {...p}><path d="M12 21c3.6 0 6-2.4 6-5.6 0-4.3-4-6.2-4.6-11.4-2.2 1.6-3.6 3.7-3.6 5.8 0 1.5.8 2.4.8 3.4 0 1-.8 1.8-1.8 1.8s-1.6-.7-1.8-1.7C6.3 14.4 6 15.3 6 16.4 6 19 8.5 21 12 21Z" /></S>,
  card: (p) => <S {...p}><rect x="2.8" y="6.5" width="14" height="11" rx="2.6" /><path d="M19 8.6a2.6 2.6 0 0 1 2.2 2.6v6a2.6 2.6 0 0 1-2.6 2.6H8.4" /></S>,
  arrow: (p) => <S {...p}><path d="M12 5v14M6.4 13.4 12 19l5.6-5.6" /></S>,
  up: (p) => <S {...p}><path d="M12 19V5M6.4 10.6 12 5l5.6 5.6" /></S>,
  external: (p) => <S {...p}><path d="M14 4.5h5.5V10M19 5l-8 8" /><path d="M18 14.5v3.8a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V8.8a2 2 0 0 1 2-2h3.8" /></S>,
  plus: (p) => <S {...p}><path d="M12 5.5v13M5.5 12h13" /></S>,
  quote: (p) => <S {...p}><path d="M9.5 7.5C7 8.4 5.5 10.4 5.5 13v3.5h4V12h-2c0-1.4.7-2.4 2-3zM18 7.5c-2.5.9-4 2.9-4 5.5v3.5h4V12h-2c0-1.4.7-2.4 2-3z" /></S>,
}

/** Small monospaced ordinal used instead of decorative emoji. */
export const Ord = ({ n, className = '' }) => (
  <span className={'ord ' + className}>{String(n).padStart(2, '0')}</span>
)
