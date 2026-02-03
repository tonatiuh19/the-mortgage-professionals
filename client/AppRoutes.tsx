import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BrokerLogin from "./pages/BrokerLogin";
import ClientLogin from "./pages/ClientLogin";
import ApplicationWizard from "./pages/ApplicationWizard";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import AdminLayout from "./components/layout/AdminLayout";
import ClientLayout from "./components/layout/ClientLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import Pipeline from "./pages/admin/Pipeline";
import Clients from "./pages/admin/Clients";
import Tasks from "./pages/admin/Tasks";
import Marketing from "./pages/admin/Marketing";
import Documents from "./pages/admin/Documents";
import Settings from "./pages/admin/Settings";
import CommunicationTemplates from "./pages/admin/CommunicationTemplates";
import Reports from "./pages/admin/Reports";
import Compliance from "./pages/admin/Compliance";
import Notifications from "./pages/admin/Notifications";
import Brokers from "./pages/admin/Brokers";
import ClientDashboard from "./pages/client/Dashboard";
import ClientLoans from "./pages/client/Loans";
import ClientTasks from "./pages/client/Tasks";
import ClientProfile from "./pages/client/Profile";

const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route
      path="/"
      element={
        <AppLayout showHeader={true} showFooter={true}>
          <Index />
        </AppLayout>
      }
    />
    <Route
      path="/portal"
      element={
        <ClientLayout>
          <ClientDashboard />
        </ClientLayout>
      }
    />
    <Route
      path="/portal/loans"
      element={
        <ClientLayout>
          <ClientLoans />
        </ClientLayout>
      }
    />
    <Route
      path="/portal/tasks"
      element={
        <ClientLayout>
          <ClientTasks />
        </ClientLayout>
      }
    />
    <Route
      path="/portal/profile"
      element={
        <ClientLayout>
          <ClientProfile />
        </ClientLayout>
      }
    />
    <Route
      path="/broker-login"
      element={
        <AppLayout showHeader={false} showFooter={false}>
          <BrokerLogin />
        </AppLayout>
      }
    />
    <Route path="/client-login" element={<ClientLogin />} />
    <Route
      path="/wizard"
      element={
        <AppLayout showHeader={false} showFooter={false}>
          <ApplicationWizard />
        </AppLayout>
      }
    />
    <Route
      path="/apply"
      element={
        <AppLayout showHeader={false} showFooter={false}>
          <ApplicationWizard />
        </AppLayout>
      }
    />

    {/* Admin Routes */}
    <Route
      path="/admin"
      element={
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/pipeline"
      element={
        <AdminLayout>
          <Pipeline />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/clients"
      element={
        <AdminLayout>
          <Clients />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/tasks"
      element={
        <AdminLayout>
          <Tasks />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/marketing"
      element={
        <AdminLayout>
          <Marketing />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/documents"
      element={
        <AdminLayout>
          <Documents />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/communication-templates"
      element={
        <AdminLayout>
          <CommunicationTemplates />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/reports"
      element={
        <AdminLayout>
          <Reports />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/compliance"
      element={
        <AdminLayout>
          <Compliance />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/notifications"
      element={
        <AdminLayout>
          <Notifications />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/brokers"
      element={
        <AdminLayout>
          <Brokers />
        </AdminLayout>
      }
    />
    <Route
      path="/admin/settings"
      element={
        <AdminLayout>
          <Settings />
        </AdminLayout>
      }
    />

    {/* Catch-all 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
