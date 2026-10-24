import { clearSession, getToken } from '../lib/auth'

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

    // The backend always answers errors with { status, error, message, errors? }
    try {
      const data = await response.json()
      message = data.message || message

      // Validation errors: show the first field error
      if (data.errors) {
        const [field, error] = Object.entries(data.errors)[0] || []
        if (field) message = `${field}: ${error}`
      }
    } catch {
      // Response body is not JSON
    }

    // 401 = token missing, expired or invalid: back to login (403 just means the role is not allowed)
    if (response.status === 401 && endpoint !== '/api/auth/login') {
      clearSession()
      window.location.href = '/login'
    }

    const error = new Error(message)
    error.status = response.status
    throw error
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
