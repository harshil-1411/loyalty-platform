import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getIdToken } from '../auth/cognito'
import type { Program } from '../api/programs'
import { listPrograms } from '../api/programs'
import { getBalance, earn, burn } from '../api/transactions'
import './Transactions.css'

export function Transactions() {
  const { state } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [programId, setProgramId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [error, setError] = useState('')
  const [idToken, setIdToken] = useState<string | null>(null)

  const tenantId = state.status === 'authenticated' ? state.user.sub : ''

  const fetchToken = useCallback(async () => {
    const t = await getIdToken()
    setIdToken(t)
  }, [])

  const fetchPrograms = useCallback(async () => {
    if (!tenantId) return
    setLoadingPrograms(true)
    setError('')
    try {
      const res = await listPrograms(tenantId, idToken ?? undefined)
      setPrograms(res.programs ?? [])
      if (res.programs?.length && !programId) setProgramId(res.programs[0].programId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load programs')
    } finally {
      setLoadingPrograms(false)
    }
  }, [tenantId, idToken])

  const fetchBalance = useCallback(async () => {
    if (!tenantId || !programId || !memberId.trim()) {
      setBalance(null)
      return
    }
    setLoadingBalance(true)
    setError('')
    try {
      const res = await getBalance(tenantId, programId, memberId.trim(), idToken ?? undefined)
      setBalance(res.balance)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load balance')
      setBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }, [tenantId, programId, memberId, idToken])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    if (tenantId) fetchPrograms()
  }, [tenantId, idToken, fetchPrograms])

  useEffect(() => {
    if (programId && memberId.trim()) void fetchBalance()
    else setBalance(null)
  }, [programId, memberId, fetchBalance])

  async function handleEarn(e: React.FormEvent, points: number) {
    e.preventDefault()
    if (!tenantId || !programId || !memberId.trim() || points <= 0) return
    setError('')
    try {
      const res = await earn(
        tenantId,
        programId,
        { memberId: memberId.trim(), points },
        idToken ?? undefined
      )
      setBalance(res.balance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Earn failed')
    }
  }

  async function handleBurn(e: React.FormEvent, points: number) {
    e.preventDefault()
    if (!tenantId || !programId || !memberId.trim() || points <= 0) return
    setError('')
    try {
      const res = await burn(
        tenantId,
        programId,
        { memberId: memberId.trim(), points },
        idToken ?? undefined
      )
      setBalance(res.balance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Burn failed')
    }
  }

  if (state.status !== 'authenticated') return null

  const selectedProgram = programs.find((p) => p.programId === programId)

  return (
    <div className="transactions-page">
      <h2>Balance &amp; transactions</h2>
      <p className="transactions-intro">
        View balance and earn or burn points for a member in a program.
      </p>

      {loadingPrograms ? (
        <p>Loading programs…</p>
      ) : programs.length === 0 ? (
        <p className="transactions-empty">Create a program first (Programs page).</p>
      ) : (
        <>
          <div className="transactions-filters">
            <label>
              Program
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="transactions-select"
              >
                {programs.map((p) => (
                  <option key={p.programId} value={p.programId}>
                    {p.name} ({p.programId})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Member ID
              <input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="e.g. member_123 or user sub"
                className="transactions-input"
              />
            </label>
          </div>

          {error && <p className="transactions-error">{error}</p>}

          {memberId.trim() && (
            <>
              <div className="transactions-balance-card">
                <h3>Balance</h3>
                {loadingBalance ? (
                  <p>Loading…</p>
                ) : balance !== null ? (
                  <p className="transactions-balance-value">
                    <strong>{balance}</strong> points
                    {selectedProgram?.currency ? ` (${selectedProgram.currency})` : ''}
                  </p>
                ) : null}
              </div>

              <div className="transactions-actions">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const pts = Number((e.currentTarget.elements.namedItem('earnPoints') as HTMLInputElement).value)
                    if (!Number.isNaN(pts) && pts > 0) void handleEarn(e, pts)
                  }}
                  className="transactions-form"
                >
                  <h3>Earn points</h3>
                  <label>
                    Points
                    <input type="number" name="earnPoints" min={1} defaultValue={10} className="transactions-input" />
                  </label>
                  <button type="submit" className="transactions-btn primary">Earn</button>
                </form>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const pts = Number((e.currentTarget.elements.namedItem('burnPoints') as HTMLInputElement).value)
                    if (!Number.isNaN(pts) && pts > 0) void handleBurn(e, pts)
                  }}
                  className="transactions-form"
                >
                  <h3>Burn points</h3>
                  <label>
                    Points
                    <input type="number" name="burnPoints" min={1} defaultValue={5} className="transactions-input" />
                  </label>
                  <button type="submit" className="transactions-btn">Burn</button>
                </form>
              </div>

              <p className="transactions-history-note">
                Transaction history will be available when the API supports listing transactions.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
