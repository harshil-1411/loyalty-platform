import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })));
const SignUp = lazy(() => import("@/pages/SignUp").then((m) => ({ default: m.SignUp })));
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
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
