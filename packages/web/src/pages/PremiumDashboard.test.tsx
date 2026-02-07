import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PremiumDashboard } from './PremiumDashboard'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <PremiumDashboard />
    </MemoryRouter>
  )
}

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    state: {
      status: 'authenticated',
      user: { sub: 'tenant-123', email: 'user@example.com', username: 'user' },
    },
  }),
}))

vi.mock('@/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: vi.fn(),
}))

const mockDashboardData = {
  metrics: {
    totalPoints: 125_000,
    activePrograms: 3,
    transactionsCount: 1_420,
    rewardsRedeemed: 89,
  },
  charts: {
    pointsByProgram: [
      { name: 'Loyalty Plus', value: 52000 },
      { name: 'Rewards Gold', value: 48000 },
      { name: 'Cashback', value: 25000 },
    ],
    transactionsOverTime: [
      { name: 'Mon', value: 210 },
      { name: 'Tue', value: 185 },
      { name: 'Wed', value: 240 },
    ],
  },
}

function mockUseDashboardMetrics(overrides: {
  data?: typeof mockDashboardData | null
  loading?: boolean
  error?: string | null
} = {}) {
  vi.mocked(useDashboardMetrics).mockReturnValue({
    data: overrides.data ?? mockDashboardData,
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    refetch: vi.fn(),
  })
}

describe('PremiumDashboard', () => {
  beforeEach(() => {
    mockUseDashboardMetrics()
  })

  it('renders without crashing', () => {
    const { container } = renderDashboard()
    expect(container).toBeInTheDocument()
  })

  it('displays critical metrics', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /total points/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /active programs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^transactions$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /rewards redeemed/i })).toBeInTheDocument()

    expect(screen.getByText('125,000')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1,420')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
  })

  it('displays Visual Breakdown section and chart data', () => {
    renderDashboard()

    const breakdownHeading = screen.getByRole('heading', { name: /visual breakdown/i })
    expect(breakdownHeading).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /points by program/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /transactions over time/i })).toBeInTheDocument()

    expect(screen.getByText('Loyalty Plus')).toBeInTheDocument()
    expect(screen.getByText('Rewards Gold')).toBeInTheDocument()
    expect(screen.getByText('Cashback')).toBeInTheDocument()
    expect(screen.getByLabelText('Points by program')).toBeInTheDocument()
    expect(screen.getByLabelText('Transactions over time')).toBeInTheDocument()
  })

  it('navigates to Detailed View when a widget is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    expect(screen.queryByRole('dialog', { name: /detailed view/i })).not.toBeInTheDocument()

    const totalPointsWidget = screen.getByRole('button', { name: /total points/i })
    await user.click(totalPointsWidget)

    const dialog = screen.getByRole('dialog', { name: /detailed view/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByTestId('detailed-view-widget')).toHaveTextContent(
      /Total Points: 125,000/
    )
  })

  it('shows Detailed View for Active Programs when that widget is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const programsWidget = screen.getByRole('button', { name: /active programs/i })
    await user.click(programsWidget)

    const dialog = screen.getByRole('dialog', { name: /detailed view/i })
    expect(within(dialog).getByTestId('detailed-view-widget')).toHaveTextContent(
      /Active Programs: 3/
    )
  })

  it('closes Detailed View when Close is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await user.click(screen.getByRole('button', { name: /total points/i }))
    expect(screen.getByRole('dialog', { name: /detailed view/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close detailed view/i }))
    expect(screen.queryByRole('dialog', { name: /detailed view/i })).not.toBeInTheDocument()
  })

  it('shows loading state when loading', () => {
    mockUseDashboardMetrics({ data: null, loading: true })
    renderDashboard()
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
  })

  it('shows error state when error is set', () => {
    mockUseDashboardMetrics({ data: null, error: 'Network error' })
    renderDashboard()
    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
  })
})
