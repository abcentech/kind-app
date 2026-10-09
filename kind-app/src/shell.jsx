// The app shell's public surface for screens. App.jsx provides it; screens consume it — they take no navigation props.
//   const { s, openDay, goTab, share } = useShell()
//     s                  the active series (same object as getSeries(seriesId))
//     seriesId/setSeriesId
//     tab                'learn' | 'objectives' | 'shorts' | 'locker' | 'me'
//     goTab(id)          switch tab (plays nav sound/haptic itself)
//     openDay(day, sid?) open the lesson overlay for a day (default: active series). Gated: locked days toast instead.
//     closeLesson()
//     share({ kind:'verse'|'card'|'streak'|'month', data })   opens the Share Studio sheet
//     mode               'live' | 'archive' | 'upcoming' for the active series
import { createContext, useContext } from 'react'
export const ShellContext = createContext(null)
export const useShell = () => useContext(ShellContext)
