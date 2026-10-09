// Playground bootstrap — mount one module in isolation on the real tokens + base + fonts, no app around it.
//   playground/ui.html:  <div id="root"></div><script type="module" src="./ui.jsx"></script>
//   playground/ui.jsx:   import { mount } from './_boot.jsx';  mount(<Sheet />)
import React from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'

export function mount(node, { fx = 'full' } = {}) {
  document.documentElement.dataset.fx = fx
  const el = document.getElementById('root')
  createRoot(el).render(<React.StrictMode>{node}</React.StrictMode>)
}
