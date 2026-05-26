import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import { closeSharedAblyClient } from "@/lib/ably-client";
import clientAuthReducer from "./slices/clientAuthSlice";
import brokerAuthReducer from "./slices/brokerAuthSlice";
import applicationsReducer from "./slices/applicationsSlice";
import leadsReducer from "./slices/leadsSlice";
import documentsReducer from "./slices/documentsSlice";
import tasksReducer from "./slices/tasksSlice";
import notificationsReducer from "./slices/notificationsSlice";
import pipelineReducer from "./slices/pipelineSlice";
import clientsReducer from "./slices/clientsSlice";
import brokersReducer from "./slices/brokersSlice";
import communicationTemplatesReducer from "./slices/communicationTemplatesSlice";
import conversationsReducer from "./slices/conversationsSlice";
import dashboardReducer from "./slices/dashboardSlice";
import clientPortalReducer from "./slices/clientPortalSlice";
import auditLogsReducer from "./slices/auditLogsSlice";
import reportsReducer from "./slices/reportsSlice";
import applicationWizardReducer from "./slices/applicationWizardSlice";
import preApprovalReducer from "./slices/preApprovalSlice";
import settingsReducer from "./slices/settingsSlice";
import reminderFlowsReducer from "./slices/reminderFlowsSlice";
import adminSectionControlsReducer from "./slices/adminSectionControlsSlice";
import contactSubmissionsReducer from "./slices/contactSubmissionsSlice";
import schedulerReducer from "./slices/schedulerSlice";
import calendarEventsReducer from "./slices/calendarEventsSlice";
import clientDetailReducer from "./slices/clientDetailSlice";
import voiceReducer from "./slices/voiceSlice";
import realtorProspectingReducer from "./slices/realtorProspectingSlice";
import emailReducer from "./slices/emailSlice";
import mortgiReducer from "./slices/mortgiSlice";

export const store = configureStore({
  reducer: {
    clientAuth: clientAuthReducer,
    brokerAuth: brokerAuthReducer,
    applications: applicationsReducer,
    leads: leadsReducer,
    documents: documentsReducer,
    tasks: tasksReducer,
    notifications: notificationsReducer,
    pipeline: pipelineReducer,
    clients: clientsReducer,
    brokers: brokersReducer,
    communicationTemplates: communicationTemplatesReducer,
    conversations: conversationsReducer,
    dashboard: dashboardReducer,
    clientPortal: clientPortalReducer,
    auditLogs: auditLogsReducer,
    reports: reportsReducer,
    applicationWizard: applicationWizardReducer,
    preApproval: preApprovalReducer,
    settings: settingsReducer,
    reminderFlows: reminderFlowsReducer,
    adminSectionControls: adminSectionControlsReducer,
    contactSubmissions: contactSubmissionsReducer,
    scheduler: schedulerReducer,
    calendarEvents: calendarEventsReducer,
    voice: voiceReducer,
    clientDetail: clientDetailReducer,
    realtorProspecting: realtorProspectingReducer,
    email: emailReducer,
    mortgi: mortgiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          "clientAuth/login/fulfilled",
          "clientAuth/verify/fulfilled",
          "brokerAuth/verifyCode/fulfilled",
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["meta.arg", "payload.timestamp"],
        // Ignore these paths in the state
        ignoredPaths: ["clientAuth.lastLogin"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ─── Global 401 interceptor ───────────────────────────────────────────────────
// If any API call returns 401 (expired/invalid token), immediately clear auth
// state and redirect to the broker login page. Without this, the UI gets stuck
// in a broken loop of repeated 401 failures with no user-visible feedback.
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const state = store.getState();
      // Only act when a broker session is present AND the failing request was
      // a broker API call (not a /api/client/* route which has its own auth
      // flow — a client 401 must not inadvertently log out the broker).
      const requestPath: string = err?.config?.url ?? "";
      const isClientRoute = requestPath.includes("/api/client/");
      if (state.brokerAuth?.sessionToken && !isClientRoute) {
        localStorage.removeItem("broker_session");
        localStorage.removeItem("broker_user");
        closeSharedAblyClient();
        // Hard redirect so all in-flight state is cleared and the login page
        // starts fresh without stale Redux data.
        window.location.href = "/broker-login";
      }
    }
    return Promise.reject(err);
  },
);
