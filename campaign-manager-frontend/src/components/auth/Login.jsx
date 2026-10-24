import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiRequest from '../../services/api'
import { saveSession } from '../../lib/auth'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      })

      saveSession(data.token, {
        email: data.email,
        role: data.role,
      })

      // Add id and name for the sidebar and default selections
      try {
        const me = await apiRequest('/api/users/me')
        saveSession(data.token, me)
      } catch {
        // Login still works with email and role only
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f6f8fb]">

      {/* Left branding section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#182d52] to-[#3563e9] text-white p-12 flex-col justify-between">

        <div>
          <div className="flex items-center gap-3">
            {/* Logo yahan baad mein add karenge */}
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold">
              DS
            </div>

            <span className="text-xl font-bold">
              CampaignFlow
            </span>
          </div>

          <div className="mt-24 max-w-lg">
            <h1 className="text-4xl font-bold leading-tight">
              Manage your campaigns.
              <br />
              Work smarter.
            </h1>

            <p className="mt-5 text-blue-100 text-lg leading-relaxed">
              Campaigns, partners, distributions and monthly
              revenue in one simple workspace.
            </p>
          </div>
        </div>

        <p className="text-sm text-blue-200">
          The Digital Sole
        </p>
      </div>

      {/* Login section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="bg-white border border-[#e6eaf0] rounded-[11px] p-8 shadow-sm">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#172033]">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-[#667085]">
                Sign in to your CampaignFlow account
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-[7px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#d92d20]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-[#172033] mb-2">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  className="w-full h-11 rounded-[7px] border border-[#e6eaf0] px-3.5 text-sm text-[#172033] outline-none transition focus:border-[#3563e9] focus:ring-2 focus:ring-[#edf2ff] disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#172033] mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="w-full h-11 rounded-[7px] border border-[#e6eaf0] px-3.5 text-sm text-[#172033] outline-none transition focus:border-[#3563e9] focus:ring-2 focus:ring-[#edf2ff] disabled:bg-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-[8px] bg-[#3563e9] text-white text-sm font-semibold transition hover:bg-[#2854d8] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

            </form>
          </div>

          <p className="text-center text-xs text-[#98a2b3] mt-6">
            © The Digital Sole
          </p>

        </div>
      </div>

    </div>
  )
}