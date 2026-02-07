import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getIdToken } from '../auth/cognito'
import { t, formatDateIndia } from '../i18n'
import { getBillingStatus, createSubscriptionLink } from '../api/billing'
import './Billing.css'

export function Billing() {
  const { state } = useAuth()
  const [status, setStatus] = useState<{
    planId: string | null
    billingStatus: string
    currentPeriodEnd: string | null
    razorpaySubscriptionId: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [idToken, setIdToken] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  const tenantId = state.status === 'authenticated' ? state.user.sub : ''

  const fetchToken = useCallback(async () => {
    const tok = await getIdToken()
    setIdToken(tok)
  }, [])

  const fetchStatus = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const s = await getBillingStatus(tenantId, idToken ?? undefined)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing status')
    } finally {
      setLoading(false)
    }
  }, [tenantId, idToken])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    if (tenantId) void fetchStatus()
  }, [tenantId, idToken, fetchStatus])

  async function handleSubscribe(planKey: string) {
    if (!tenantId) return
    setSubscribing(planKey)
    setError('')
    try {
      const res = await createSubscriptionLink(
        tenantId,
        { planKey },
        idToken ?? undefined
      )
      if (res.shortUrl) window.location.href = res.shortUrl
      else setError('No checkout URL returned')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start subscription')
    } finally {
      setSubscribing(null)
    }
  }

  if (state.status !== 'authenticated') return null

  return (
    <div className="billing-page">
      <h2>{t('billing.title')}</h2>
      {error && <p className="billing-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="billing-status-card">
            <h3>{t('billing.status')}</h3>
            <p><strong>{t('billing.plan')}:</strong> {status?.planId ?? '—'}</p>
            <p><strong>Billing:</strong> {status?.billingStatus ?? 'none'}</p>
            {status?.currentPeriodEnd && (
              <p><strong>{t('billing.currentPeriodEnd')}:</strong> {formatDateIndia(status.currentPeriodEnd)}</p>
            )}
          </div>
          <div className="billing-plans">
            <h3>{t('billing.choosePlan')}</h3>
            <div className="billing-plan-buttons">
              {(['starter', 'growth', 'scale'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="billing-btn"
                  onClick={() => handleSubscribe(key)}
                  disabled={!!subscribing}
                >
                  {t(`billing.${key}`)} {subscribing === key ? '…' : t('billing.subscribe')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
