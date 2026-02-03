import "./global.css";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import { store } from "./store";
import AppRoutes from "./AppRoutes";
import { validateClientSession } from "./store/slices/clientAuthSlice";
import { validateSession as validateBrokerSession } from "./store/slices/brokerAuthSlice";

const queryClient = new QueryClient();

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

  return <AppRoutes />;
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
