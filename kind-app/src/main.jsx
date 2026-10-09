import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { applyFxLevel } from './fx/motion.js'
import App from './App.jsx'

applyFxLevel()
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
