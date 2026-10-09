// owner: ex-step · exercise type -> renderer View.
// Every View default-exports function View({ ex, value, onChange, locked, graded, onSubmit }); the shell (Exercises.jsx)
// owns the eyebrow, the prompt, CHECK and the verdict sheet, so a View draws only the answering surface.
// VIEWS is deliberately a plain mutable object: the playground swaps entries for fakes while the real ones are built.
import Choice from './Choice.jsx'
import TrueFalse from './TrueFalse.jsx'
import Blank from './Blank.jsx'
import Order from './Order.jsx'
import Match from './Match.jsx'

export const VIEWS = { choice: Choice, tf: TrueFalse, blank: Blank, order: Order, match: Match }

/** The View for an exercise type, or undefined (the shell then renders a skip-only fallback instead of crashing). */
export const viewFor = (type) => VIEWS[type]
