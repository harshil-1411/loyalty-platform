import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { SuperAdminGuard } from "@/components/layout/SuperAdminGuard";

/* ---- Tenant pages ---- */
const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })));
const SignUp = lazy(() => import("@/pages/SignUp").then((m) => ({ default: m.SignUp })));
const ForgotPassword = lazy(() =>
  import("@/pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword }))
);
const PremiumDashboard = lazy(() =>
  import("@/pages/PremiumDashboard").then((m) => ({ default: m.PremiumDashboard }))
);
const Programs = lazy(() => import("@/pages/Programs").then((m) => ({ default: m.Programs })));
const Transactions = lazy(() =>
  import("@/pages/Transactions").then((m) => ({ default: m.Transactions }))
);
const Rewards = lazy(() => import("@/pages/Rewards").then((m) => ({ default: m.Rewards })));
const Billing = lazy(() => import("@/pages/Billing").then((m) => ({ default: m.Billing })));
const Contact = lazy(() => import("@/pages/Contact").then((m) => ({ default: m.Contact })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));

/* ---- Super-admin pages ---- */
const PlatformDashboard = lazy(() =>
  import("@/pages/superadmin/PlatformDashboard").then((m) => ({ default: m.PlatformDashboard }))
);
const TenantList = lazy(() =>
  import("@/pages/superadmin/TenantList").then((m) => ({ default: m.TenantList }))
);
const TenantDetail = lazy(() =>
  import("@/pages/superadmin/TenantDetail").then((m) => ({ default: m.TenantDetail }))
);
const PricingPlans = lazy(() =>
  import("@/pages/superadmin/PricingPlans").then((m) => ({ default: m.PricingPlans }))
);
const BillingOverview = lazy(() =>
  import("@/pages/superadmin/BillingOverview").then((m) => ({ default: m.BillingOverview }))
);
const UserManagement = lazy(() =>
  import("@/pages/superadmin/UserManagement").then((m) => ({ default: m.UserManagement }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<RouteFallback />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/signup",
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SignUp />
      </Suspense>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <Suspense fallback={<RouteFallback />}>
        <ForgotPassword />
      </Suspense>
    ),
  },

  /* ── Super-admin routes ── */
  {
    path: "/admin",
    element: <SuperAdminGuard />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <PlatformDashboard />
          </Suspense>
        ),
      },
      {
        path: "tenants",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TenantList />
          </Suspense>
        ),
      },
      {
        path: "tenants/:tenantId",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TenantDetail />
          </Suspense>
        ),
      },
      {
        path: "plans",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <PricingPlans />
          </Suspense>
        ),
      },
      {
        path: "billing",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <BillingOverview />
          </Suspense>
        ),
      },
      {
        path: "users",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <UserManagement />
          </Suspense>
        ),
      },
    ],
  },

  /* ── Tenant-admin routes ── */
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <PremiumDashboard />
          </Suspense>
        ),
      },
      {
        path: "programs",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Programs />
          </Suspense>
        ),
      },
      {
        path: "transactions",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Transactions />
          </Suspense>
        ),
      },
      {
        path: "rewards",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Rewards />
          </Suspense>
        ),
      },
      {
        path: "billing",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Billing />
          </Suspense>
        ),
      },
      {
        path: "contact",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Contact />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
