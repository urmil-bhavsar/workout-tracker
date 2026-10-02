import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './firebase/AuthContext'
import { applyTheme, getInitialAppearance, getInitialPalette } from './utils/theme'
import './styles.css'

applyTheme(getInitialAppearance(), getInitialPalette(), false)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)