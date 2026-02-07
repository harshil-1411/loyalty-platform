import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { initTheme } from "./stores/ui";
import { useLocaleStore } from "./stores/locale";
import { initLocale, getLocale } from "./i18n";
import { router } from "./routes.tsx";
import "./index.css";

initTheme();
initLocale();
useLocaleStore.getState().setLocale(getLocale());

function AppRoot() {
  const locale = useLocaleStore((s) => s.locale);
  return (
    <StrictMode>
      <AuthProvider key={locale}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<AppRoot />);
