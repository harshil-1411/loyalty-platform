import { useState } from 'react'
import './App.css'

type Page = 'dashboard' | 'programs' | 'contact'

function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">Loyalty Platform</span>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={page === 'programs' ? 'active' : ''} onClick={() => setPage('programs')}>Programs</button>
        <button className={page === 'contact' ? 'active' : ''} onClick={() => setPage('contact')}>Contact</button>
      </nav>
      <main className="main">
        {page === 'dashboard' && <div><h2>Dashboard</h2><p>Tenant context and overview (placeholder).</p></div>}
        {page === 'programs' && <div><h2>Programs</h2><p>Create and manage loyalty programs (placeholder).</p></div>}
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

export default App
