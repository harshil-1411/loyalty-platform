import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { Programs } from './pages/Programs'
import './App.css'

type Page = 'dashboard' | 'programs' | 'contact'

function AuthenticatedApp() {
  const { state, signOut } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')

  if (state.status !== 'authenticated') return null

  const { user } = state
  const tenantContext = user.email ?? user.username

  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">Loyalty Platform</span>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={page === 'programs' ? 'active' : ''} onClick={() => setPage('programs')}>Programs</button>
        <button className={page === 'contact' ? 'active' : ''} onClick={() => setPage('contact')}>Contact</button>
        <span className="nav-tenant" title="Signed in">{tenantContext}</span>
        <button type="button" onClick={signOut} className="nav-signout">Sign out</button>
      </nav>
      <main className="main">
        {page === 'dashboard' && (
          <div>
            <h2>Dashboard</h2>
            <p><strong>Tenant context:</strong> {tenantContext}</p>
            <p>Overview and quick actions (placeholder).</p>
          </div>
        )}
        {page === 'programs' && <Programs />}
        {page === 'contact' && (
          <div>
            <h2>Contact &amp; Support</h2>
            <p>Email: <a href="mailto:support@loyalty.example.com">support@loyalty.example.com</a></p>
            <p>Support number: <a href="tel:+911234567890">+91 1234567890</a></p>
          </div>
        )}
      </main>
      <footer className="footer">
        Loyalty Platform &middot; Support: support@loyalty.example.com &middot; +91 1234567890
      </footer>
    </div>
  )
}

function App() {
  const { state } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  if (state.status === 'loading') {
    return (
      <div className="app app-loading">
        <p>Loading…</p>
      </div>
    )
  }

  if (state.status === 'disabled') {
    return (
      <div className="app app-loading">
        <p>Auth not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.</p>
        <p className="auth-disabled-reason">{state.reason}</p>
      </div>
    )
  }

  if (state.status === 'unauthenticated') {
    return authView === 'login' ? (
      <Login onSwitchToSignUp={() => setAuthView('signup')} />
    ) : (
      <SignUp onSwitchToLogin={() => setAuthView('login')} />
    )
  }

  return <AuthenticatedApp />
}

export default App
