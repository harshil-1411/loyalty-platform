import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import './Auth.css'

interface SignUpProps {
  onSwitchToLogin: () => void
}

type Step = 'form' | 'confirm'

export function SignUp({ onSwitchToLogin }: SignUpProps) {
  const { signUp, confirmSignUp } = useAuth()
  const [step, setStep] = useState<Step>('form')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(username.trim(), email.trim(), password)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmSignUp(username, code.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'confirm') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Confirm your email</h1>
          <p className="auth-subtitle">We sent a code to {email}</p>
          <form onSubmit={handleConfirm} className="auth-form">
            <label>
              Confirmation code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                disabled={loading}
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Confirming…' : 'Confirm'}
            </button>
          </form>
          <p className="auth-switch">
            <button type="button" onClick={() => setStep('form')} className="auth-link">
              Back
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Loyalty Platform</p>
        <form onSubmit={handleSignUp} className="auth-form">
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label>
            Password (min 10 chars, upper, lower, digit)
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              disabled={loading}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="auth-link">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
