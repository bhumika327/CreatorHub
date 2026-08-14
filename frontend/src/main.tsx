import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from './context/ToastContext'
import { SocketProvider } from './context/SocketContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </ToastProvider>
  </StrictMode>,
)
