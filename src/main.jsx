import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ensureSeed } from './db.js'
import { initSync } from './sync.js'

ensureSeed().then(() => initSync()).catch(() => initSync())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
