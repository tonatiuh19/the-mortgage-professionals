import "./global.css";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Provider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import { store } from "./store";
import AppRoutes from "./AppRoutes";
import { validateClientSession } from "./store/slices/clientAuthSlice";
import { validateSession as validateBrokerSession } from "./store/slices/brokerAuthSlice";

const queryClient = new QueryClient();

// Scrolls to hash element after navigation (e.g. /#contact)
const ScrollToHash = () => {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) {
      // Small delay to allow page to render first
      const timer = setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hash, pathname]);
  return null;
};

// Detects subdomain and enforces route scope synchronously (no flash):
// admin.* → only /admin and /broker-login are accessible
// portal.* → only /portal, /client-login, /wizard, /apply are accessible
// Wraps children so the redirect happens in the same render pass — no useEffect delay.
const SubdomainGate = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const subdomain = window.location.hostname.split(".")[0];

  if (subdomain === "admin") {
    const allowed =
      pathname.startsWith("/admin") || pathname.startsWith("/broker-login");
    if (!allowed) return <Navigate to="/admin" replace />;
  } else if (subdomain === "portal") {
    const allowed =
      pathname.startsWith("/portal") ||
      pathname.startsWith("/client-login") ||
      pathname.startsWith("/wizard") ||
      pathname.startsWith("/apply") ||
      pathname.startsWith("/scheduler");
    if (!allowed) return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  useEffect(() => {
    // Validate client session on app load
    const clientToken = localStorage.getItem("client_session_token");
    if (clientToken) {
      store.dispatch(validateClientSession());
    }

    // Validate broker session on app load
    const brokerToken = localStorage.getItem("broker_session");
    if (brokerToken) {
      store.dispatch(validateBrokerSession());
    }
  }, []);

  return (
    <>
      <ScrollToHash />
      <SubdomainGate>
        <AppRoutes />
      </SubdomainGate>
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  </HelmetProvider>
);

export default App;
