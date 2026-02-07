import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getIdToken } from '../auth/cognito'
import type { Program } from '../api/programs'
import {
  listPrograms,
  createProgram,
  getProgram,
  updateProgram,
} from '../api/programs'
import './Programs.css'

type View = 'list' | 'create' | 'edit'

export function Programs() {
  const { state } = useAuth()
  const [view, setView] = useState<View>('list')
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [idToken, setIdToken] = useState<string | null>(null)

  const tenantId = state.status === 'authenticated' ? state.user.sub : ''

  const fetchToken = useCallback(async () => {
    const t = await getIdToken()
    setIdToken(t)
  }, [])

  const fetchPrograms = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const res = await listPrograms(tenantId, idToken ?? undefined)
      setPrograms(res.programs ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load programs')
    } finally {
      setLoading(false)
    }
  }, [tenantId, idToken])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    if (tenantId) fetchPrograms()
  }, [tenantId, idToken, fetchPrograms])

  if (state.status !== 'authenticated') return null

  return (
    <div className="programs-page">
      <div className="programs-header">
        <h2>Programs</h2>
        <button
          type="button"
          className="programs-btn primary"
          onClick={() => setView('create')}
        >
          Create program
        </button>
      </div>

      {view === 'list' && (
        <>
          {error && <p className="programs-error">{error}</p>}
          {loading ? (
            <p>Loading programs…</p>
          ) : programs.length === 0 ? (
            <p className="programs-empty">No programs yet. Create one to get started.</p>
          ) : (
            <ul className="programs-list">
              {programs.map((p) => (
                <li key={p.programId} className="programs-item">
                  <span className="programs-item-name">{p.name}</span>
                  <span className="programs-item-meta">{p.currency} · {p.programId}</span>
                  <button
                    type="button"
                    className="programs-btn small"
                    onClick={() => {
                      setSelectedProgramId(p.programId)
                      setView('edit')
                    }}
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {view === 'create' && (
        <ProgramForm
          tenantId={tenantId}
          idToken={idToken}
          onSuccess={() => {
            setView('list')
            fetchPrograms()
          }}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selectedProgramId && (
        <ProgramEditForm
          tenantId={tenantId}
          idToken={idToken}
          programId={selectedProgramId}
          onSuccess={() => {
            setSelectedProgramId(null)
            setView('list')
            fetchPrograms()
          }}
          onCancel={() => {
            setSelectedProgramId(null)
            setView('list')
          }}
        />
      )}
    </div>
  )
}

interface ProgramFormProps {
  tenantId: string
  idToken: string | null
  onSuccess: () => void
  onCancel: () => void
}

function ProgramForm({ tenantId, idToken, onSuccess, onCancel }: ProgramFormProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createProgram(tenantId, { name: name.trim() || undefined, currency }, idToken ?? undefined)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="programs-form-card">
      <h3>New program</h3>
      <form onSubmit={handleSubmit} className="programs-form">
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Loyalty Program"
            disabled={loading}
          />
        </label>
        <label>
          Currency
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="INR"
            disabled={loading}
          />
        </label>
        {error && <p className="programs-error">{error}</p>}
        <div className="programs-form-actions">
          <button type="button" onClick={onCancel} className="programs-btn">Cancel</button>
          <button type="submit" disabled={loading} className="programs-btn primary">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface ProgramEditFormProps {
  tenantId: string
  idToken: string | null
  programId: string
  onSuccess: () => void
  onCancel: () => void
}

function ProgramEditForm({ tenantId, idToken, programId, onSuccess, onCancel }: ProgramEditFormProps) {
  const [program, setProgram] = useState<Program | null>(null)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!programId) return
    let cancelled = false
    getProgram(tenantId, programId, idToken ?? undefined)
      .then((p) => {
        if (!cancelled) {
          setProgram(p)
          setName(p.name ?? '')
          setCurrency(p.currency ?? 'INR')
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load')
      })
    return () => { cancelled = true }
  }, [tenantId, programId, idToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError('')
    setLoading(true)
    try {
      await updateProgram(
        tenantId,
        programId,
        { name: name.trim() || undefined, currency },
        idToken ?? undefined
      )
      onSuccess()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  if (loadError) return <p className="programs-error">{loadError}</p>
  if (!program) return <p>Loading program…</p>

  return (
    <div className="programs-form-card">
      <h3>Edit program</h3>
      <form onSubmit={handleSubmit} className="programs-form">
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </label>
        <label>
          Currency
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
          />
        </label>
        {saveError && <p className="programs-error">{saveError}</p>}
        <div className="programs-form-actions">
          <button type="button" onClick={onCancel} className="programs-btn">Cancel</button>
          <button type="submit" disabled={loading} className="programs-btn primary">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
