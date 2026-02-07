import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global cleanup after each test (e.g. unmount, clear DOM)
afterEach(() => {
  cleanup()
})

// --- JSDOM polyfills ---

// ResizeObserver is not implemented in JSDOM
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// window.scrollTo is often used by layouts/scroll components
window.scrollTo = vi.fn()

// --- Radix UI: render portals inline for easier DOM assertions ---
// Dialogs, Popovers, Tooltips render into document.body by default; this keeps them in the tree.
vi.mock('@radix-ui/react-portal', () => ({
  Portal: ({ children }: { children: unknown }) => children,
}))

// --- sonner (toast): resolve in test env ---
vi.mock('sonner', () => ({
  toast: { success: () => {}, error: () => {} },
  Toaster: () => null,
}))
