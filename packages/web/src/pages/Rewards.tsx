import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getIdToken } from '../auth/cognito'
import type { Program } from '../api/programs'
import type { Reward } from '../api/rewards'
import { listPrograms } from '../api/programs'
import { listRewards, createReward, redeem } from '../api/rewards'
import { formatINR } from '../i18n'
import './Rewards.css'

type Tab = 'catalog' | 'redeem'

export function Rewards() {
  const { state } = useAuth()
  const [tab, setTab] = useState<Tab>('catalog')
  const [programs, setPrograms] = useState<Program[]>([])
  const [programId, setProgramId] = useState('')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [loadingRewards, setLoadingRewards] = useState(false)
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

  const fetchRewards = useCallback(async () => {
    if (!tenantId || !programId) return
    setLoadingRewards(true)
    setError('')
    try {
      const res = await listRewards(tenantId, programId, idToken ?? undefined)
      setRewards(res.rewards ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rewards')
      setRewards([])
    } finally {
      setLoadingRewards(false)
    }
  }, [tenantId, programId, idToken])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    if (tenantId) void fetchPrograms()
  }, [tenantId, idToken, fetchPrograms])

  useEffect(() => {
    if (programId) void fetchRewards()
    else setRewards([])
  }, [programId, fetchRewards])

  if (state.status !== 'authenticated') return null

  return (
    <div className="rewards-page">
      <h2>Rewards</h2>
      <div className="rewards-tabs">
        <button
          type="button"
          className={tab === 'catalog' ? 'active' : ''}
          onClick={() => setTab('catalog')}
        >
          Catalog
        </button>
        <button
          type="button"
          className={tab === 'redeem' ? 'active' : ''}
          onClick={() => setTab('redeem')}
        >
          Redeem
        </button>
      </div>

      {loadingPrograms ? (
        <p>Loading programs…</p>
      ) : programs.length === 0 ? (
        <p className="rewards-empty">Create a program first (Programs page).</p>
      ) : (
        <>
          <div className="rewards-program-select">
            <label>
              Program
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="rewards-select"
              >
                {programs.map((p) => (
                  <option key={p.programId} value={p.programId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="rewards-error">{error}</p>}

          {tab === 'catalog' && (
            <RewardsCatalog
              rewards={rewards}
              loading={loadingRewards}
              tenantId={tenantId}
              programId={programId}
              idToken={idToken}
              onCreated={() => void fetchRewards()}
              setError={setError}
            />
          )}

          {tab === 'redeem' && (
            <RedeemFlow
              rewards={rewards}
              loading={loadingRewards}
              tenantId={tenantId}
              programId={programId}
              idToken={idToken}
              setError={setError}
            />
          )}
        </>
      )}
    </div>
  )
}

interface RewardsCatalogProps {
  rewards: Reward[]
  loading: boolean
  tenantId: string
  programId: string
  idToken: string | null
  onCreated: () => void
  setError: (s: string) => void
}

function RewardsCatalog({
  rewards,
  loading,
  tenantId,
  programId,
  idToken,
  onCreated,
  setError,
}: RewardsCatalogProps) {
  const [name, setName] = useState('')
  const [pointsCost, setPointsCost] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await createReward(
        tenantId,
        programId,
        { name: name.trim(), pointsCost: Math.max(0, pointsCost) },
        idToken ?? undefined
      )
      setName('')
      setPointsCost(10)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="rewards-catalog">
        <h3>Rewards catalog</h3>
        {loading ? (
          <p>Loading…</p>
        ) : rewards.length === 0 ? (
          <p className="rewards-empty-inline">No rewards yet. Add one below.</p>
        ) : (
          <ul className="rewards-list">
            {rewards.map((r) => (
              <li key={r.rewardId} className="rewards-item">
                <span className="rewards-item-name">{r.name}</span>
                <span className="rewards-item-cost">{r.pointsCost} pts ({formatINR(r.pointsCost)} equiv.)</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rewards-form-card">
        <h3>Add reward</h3>
        <form onSubmit={handleCreate} className="rewards-form">
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Free coffee"
              disabled={submitting}
              className="rewards-input"
            />
          </label>
          <label>
            Points cost
            <input
              type="number"
              min={0}
              value={pointsCost}
              onChange={(e) => setPointsCost(Number(e.target.value))}
              disabled={submitting}
              className="rewards-input"
            />
          </label>
          <button type="submit" disabled={submitting || !name.trim()} className="rewards-btn primary">
            {submitting ? 'Adding…' : 'Add reward'}
          </button>
        </form>
      </div>
    </>
  )
}

interface RedeemFlowProps {
  rewards: Reward[]
  loading: boolean
  tenantId: string
  programId: string
  idToken: string | null
  setError: (s: string) => void
}

function RedeemFlow({
  rewards,
  loading,
  tenantId,
  programId,
  idToken,
  setError,
}: RedeemFlowProps) {
  const [memberId, setMemberId] = useState('')
  const [rewardId, setRewardId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId.trim() || !rewardId) return
    setError('')
    setSuccess(null)
    setSubmitting(true)
    try {
      const res = await redeem(
        tenantId,
        programId,
        { memberId: memberId.trim(), rewardId },
        idToken ?? undefined
      )
      setSuccess(`Redeemed! New balance: ${res.balance} pts.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redeem failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rewards-redeem-card">
      <h3>Redeem reward</h3>
      <p className="rewards-redeem-intro">Select a member and reward to deduct points and complete redemption.</p>

      {loading ? (
        <p>Loading rewards…</p>
      ) : rewards.length === 0 ? (
        <p className="rewards-empty-inline">Add rewards in the Catalog tab first.</p>
      ) : (
        <form onSubmit={handleRedeem} className="rewards-form">
          <label>
            Member ID
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="e.g. member_123"
              required
              disabled={submitting}
              className="rewards-input"
            />
          </label>
          <label>
            Reward
            <select
              value={rewardId}
              onChange={(e) => setRewardId(e.target.value)}
              required
              disabled={submitting}
              className="rewards-select"
            >
              <option value="">Select reward</option>
              {rewards.map((r) => (
                <option key={r.rewardId} value={r.rewardId}>
                  {r.name} — {r.pointsCost} pts
                </option>
              ))}
            </select>
          </label>
          {success && <p className="rewards-success">{success}</p>}
          <button
            type="submit"
            disabled={submitting || !memberId.trim() || !rewardId}
            className="rewards-btn primary"
          >
            {submitting ? 'Redeeming…' : 'Redeem'}
          </button>
        </form>
      )}
    </div>
  )
}
