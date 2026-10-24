import { clearSession, getToken, isTokenExpired } from '../lib/auth'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080'

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = 'Something went wrong'
    let hasBody = false

    try {
      const data = await response.json()
      hasBody = true
      message = data.message || message

      // Validation errors: show the first field error
      if (data.errors) {
        const [field, error] = Object.entries(data.errors)[0] || []
        if (field) message = `${field}: ${error}`
      }
    } catch {
      // Response body is not JSON
    }

    if (!hasBody && (response.status === 401 || response.status === 403)) {
      // Expired token: back to login. Valid token: the role is not allowed.
      if (endpoint === '/api/auth/login') {
        message = 'Invalid email or password'
      } else if (token && isTokenExpired(token)) {
        clearSession()
        window.location.href = '/login'
        message = 'Session expired, please sign in again'
      } else {
        message = 'You do not have access to this'
      }
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
}

export default apiRequest
