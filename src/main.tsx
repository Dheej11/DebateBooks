import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import App from './App.tsx'
import Landing from './Landing.tsx'
import LoginPage from './LoginPage.tsx'
import Drive from './Drive.tsx'
import DebateTimer from './DebateTimer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drive"
            element={
              <ProtectedRoute>
                <Drive />
              </ProtectedRoute>
            }
          />
          <Route path="/timer" element={<DebateTimer />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
)
