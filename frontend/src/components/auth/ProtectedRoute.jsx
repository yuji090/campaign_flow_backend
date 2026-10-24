import { Navigate, Outlet } from 'react-router-dom'
import { clearSession, getToken, isAdmin, isTokenExpired } from '../../lib/auth'

export default function ProtectedRoute({ adminOnly = false }) {
  const token = getToken()

  if (!token || isTokenExpired(token)) {
    clearSession()
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
