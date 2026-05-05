import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { applyStoredOptions } from './ui/OptionsMenu/OptionsMenu'

// Apply stored user options (volumes, brightness, accessibility) before
// React mounts so main-menu audio and visuals use the saved values, not
// the bare audio.ts fallbacks.
applyStoredOptions();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
