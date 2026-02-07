import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import './PremiumDashboard.css'

type DetailedViewWidget = 'points' | 'programs' | 'transactions' | 'rewards' | null

export function PremiumDashboard() {
  const { state } = useAuth()
  const [detailedView, setDetailedView] = useState<DetailedViewWidget>(null)

  const tenantId = state.status === 'authenticated' ? state.user.sub : ''
  const { data, loading, error } = useDashboardMetrics(tenantId)

  if (state.status !== 'authenticated') return null

  if (loading) {
    return (
      <div className="premium-dashboard" role="status" aria-live="polite" aria-busy="true">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="premium-dashboard-metrics">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-6 w-40 mt-6 mb-2" />
        <div className="premium-dashboard-charts-grid">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="premium-dashboard premium-dashboard-error">
        <p role="alert">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { metrics, charts } = data

  return (
    <div className="premium-dashboard" aria-labelledby="premium-dashboard-heading">
      <h2 id="premium-dashboard-heading">Premium Dashboard</h2>

      {/* Quick links – real navigation */}
      <nav className="premium-dashboard-quicklinks" aria-label="Quick links">
        <Link to="/programs" className="premium-dashboard-link">Programs</Link>
        <Link to="/transactions" className="premium-dashboard-link">Transactions</Link>
        <Link to="/rewards" className="premium-dashboard-link">Rewards</Link>
        <Link to="/billing" className="premium-dashboard-link">Billing</Link>
      </nav>

      {/* Critical metrics – clickable widgets (real stats from useDashboardMetrics) */}
      <section aria-label="Key metrics" className="premium-dashboard-metrics">
        <Card
          className="premium-dashboard-widget"
          role="button"
          tabIndex={0}
          onClick={() => setDetailedView((v) => (v === 'points' ? null : 'points'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setDetailedView((v) => (v === 'points' ? null : 'points'))
            }
          }}
        >
          <CardHeader>
            <CardTitle>Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="premium-dashboard-metric-value">{metrics.totalPoints.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card
          className="premium-dashboard-widget"
          role="button"
          tabIndex={0}
          onClick={() => setDetailedView((v) => (v === 'programs' ? null : 'programs'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setDetailedView((v) => (v === 'programs' ? null : 'programs'))
            }
          }}
        >
          <CardHeader>
            <CardTitle>Active Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="premium-dashboard-metric-value">{metrics.activePrograms}</p>
          </CardContent>
        </Card>
        <Card
          className="premium-dashboard-widget"
          role="button"
          tabIndex={0}
          onClick={() => setDetailedView((v) => (v === 'transactions' ? null : 'transactions'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setDetailedView((v) => (v === 'transactions' ? null : 'transactions'))
            }
          }}
        >
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="premium-dashboard-metric-value">{metrics.transactionsCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card
          className="premium-dashboard-widget"
          role="button"
          tabIndex={0}
          onClick={() => setDetailedView((v) => (v === 'rewards' ? null : 'rewards'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setDetailedView((v) => (v === 'rewards' ? null : 'rewards'))
            }
          }}
        >
          <CardHeader>
            <CardTitle>Rewards Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="premium-dashboard-metric-value">{metrics.rewardsRedeemed}</p>
          </CardContent>
        </Card>
      </section>

      {/* Visual Breakdown – charts */}
      <section
        className="premium-dashboard-charts"
        aria-labelledby="visual-breakdown-heading"
      >
        <h3 id="visual-breakdown-heading">Visual Breakdown</h3>
        <div className="premium-dashboard-charts-grid">
          <Card>
            <CardHeader>
              <CardTitle>Points by Program</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="premium-dashboard-chart-list" aria-label="Points by program">
                {charts.pointsByProgram.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.value.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transactions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="premium-dashboard-chart-list" aria-label="Transactions over time">
                {charts.transactionsOverTime.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Detailed View panel */}
      {detailedView && (
        <section
          className="premium-dashboard-detailed-view"
          aria-labelledby="detailed-view-heading"
          role="dialog"
          aria-modal="true"
        >
          <h3 id="detailed-view-heading">Detailed View</h3>
          <p data-testid="detailed-view-widget">
            {detailedView === 'points' && `Total Points: ${metrics.totalPoints.toLocaleString()}`}
            {detailedView === 'programs' && `Active Programs: ${metrics.activePrograms}`}
            {detailedView === 'transactions' && `Transactions: ${metrics.transactionsCount.toLocaleString()}`}
            {detailedView === 'rewards' && `Rewards Redeemed: ${metrics.rewardsRedeemed}`}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDetailedView(null)}
            aria-label="Close detailed view"
          >
            Close
          </Button>
        </section>
      )}
    </div>
  )
}
