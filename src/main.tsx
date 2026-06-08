import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrandThemeProvider } from './theme/BrandThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandThemeProvider>
      <App />
    </BrandThemeProvider>
  </StrictMode>,
)
