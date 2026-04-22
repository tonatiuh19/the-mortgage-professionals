import { configureStore } from "@reduxjs/toolkit";
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
