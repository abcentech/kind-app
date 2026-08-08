/**
 * One icon system: 24-grid, stroked, round caps, no fills, no emoji.
 * Weights are heavier than usual on purpose — they sit inside big, chunky
 * shapes and have to read at a glance.
 */
const S = ({ children, size, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
)

export const Icon = {
  /* tabs */
  learn: (p) => <S {...p}><path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H10a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h3.8A2.2 2.2 0 0 1 20 5.2v11.3a2 2 0 0 1-2 2h-4a2 2 0 0 0-2 1.5 2 2 0 0 0-2-1.5H6a2 2 0 0 1-2-2z" /><path d="M12 4v16" /></S>,
  quests: (p) => <S {...p}><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r=".6" /></S>,
  shorts: (p) => <S {...p}><rect x="6.4" y="2.8" width="11.2" height="18.4" rx="3.4" /><path d="m10.8 9.2 4.4 2.8-4.4 2.8z" /></S>,
  vault: (p) => <S {...p}><rect x="2.6" y="6.4" width="14" height="11.2" rx="2.8" /><path d="M19 8.6a2.6 2.6 0 0 1 2.4 2.6v6a2.6 2.6 0 0 1-2.6 2.6H8.6" /></S>,
  me: (p) => <S {...p}><circle cx="12" cy="8" r="3.8" /><path d="M4.6 20.4c.6-3.8 3.6-6.2 7.4-6.2s6.8 2.4 7.4 6.2" /></S>,

  /* trail node marks */
  book: (p) => <S {...p}><path d="M4.5 4.6A1.6 1.6 0 0 1 6.1 3h11.8a1.6 1.6 0 0 1 1.6 1.6v13.8a1.6 1.6 0 0 1-1.6 1.6H6.1a1.6 1.6 0 0 1-1.6-1.6z" /><path d="M8.4 7.6h7.2M8.4 11.4h7.2M8.4 15.2h4.4" /></S>,
  star: (p) => <S {...p}><path d="m12 3.4 2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.8l6-.9z" /></S>,
  trophy: (p) => <S {...p}><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 5.6H5a2 2 0 0 0 2.6 3.2M16.5 5.6H19a2 2 0 0 1-2.6 3.2" /><path d="M12 13.5V17M8.8 20h6.4" /></S>,
  flag: (p) => <S {...p}><path d="M6 21V4" /><path d="M6 4.6h10.5l-2 3.7 2 3.7H6" /></S>,
  lock: (p) => <S {...p}><rect x="5" y="10.4" width="14" height="10.2" rx="3" /><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4" /></S>,
  check: (p) => <S {...p}><path d="m5 12.6 4.6 4.6L19 7.6" /></S>,
  close: (p) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>,

  /* HUD + misc */
  flame: (p) => <S {...p}><path d="M12 21c3.6 0 6-2.4 6-5.6 0-4.3-4-6.2-4.6-11.4-2.2 1.6-3.6 3.7-3.6 5.8 0 1.5.8 2.4.8 3.4a1.8 1.8 0 0 1-3.6.1C6.3 14.4 6 15.3 6 16.4 6 19 8.5 21 12 21Z" /></S>,
  bolt: (p) => <S {...p}><path d="M13.4 2.6 4.8 13.4h5.6L10 21.4l8.8-10.8h-5.6z" /></S>,
  chest: (p) => <S {...p}><path d="M3.6 10.4a8.4 8.4 0 0 1 16.8 0" /><rect x="3.6" y="10.4" width="16.8" height="9.2" rx="2" /><path d="M3.6 14h16.8" /><path d="M10.6 14h2.8v2.6h-2.8z" /></S>,
  chevron: (p) => <S {...p}><path d="m9 5 7 7-7 7" /></S>,
  play: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="m10 8.4 5.6 3.6-5.6 3.6z" /></S>,
  external: (p) => <S {...p}><path d="M14 4.4h5.6V10M19.2 4.8l-8.4 8.4" /><path d="M18 14.4v3.8a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2V8.6a2 2 0 0 1 2-2h3.8" /></S>,
  plus: (p) => <S {...p}><path d="M12 5.4v13.2M5.4 12h13.2" /></S>,
  pen: (p) => <S {...p}><path d="M4 20.2h4.2L19 9.4a2.4 2.4 0 0 0-3.4-3.4L4.8 16.8z" /></S>,
  home: (p) => <S {...p}><path d="M3.4 11.4 12 4l8.6 7.4M5.8 10v9.6h12.4V10" /></S>,
  heart: (p) => <S {...p}><path d="M12 20s-7.4-4.6-7.4-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.4 2.8C19.4 15.4 12 20 12 20Z" /></S>,
}
