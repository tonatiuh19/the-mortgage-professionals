import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";
import type {
  BrokerPublicInfoResponse,
  BrokerPublicProfile,
  MyShareLinkResponse,
  RegenerateShareLinkResponse,
  SendShareLinkEmailRequest,
  SendShareLinkEmailResponse,
} from "@shared/api";
import type { RootState } from "../index";

const DRAFT_KEY = "themortgageprofessionals_wizard_draft";

export interface WizardDraft {
  values: Omit<PublicApplicationPayload, "broker_token">;
  currentStep: number;
  brokerToken?: string;
  savedAt: string;
  draftApplicationId?: number;
}

export interface PublicApplicationPayload {
  // Step 1 – Identity
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  // Step 2 – Property
  loan_type: string;
  property_value: string;
  down_payment: string;
  property_type: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  loan_purpose: string;
  // Step 3 – Finances
  annual_income: string;
  credit_score_range: string;
  income_type: string;
  // Step 4 – Employment
  employment_status: string;
  employer_name: string;
  years_employed: string;
  // Step 1 – Citizenship / immigration
  citizenship_status: string; // 'us_citizen' | 'permanent_resident' | 'non_resident' | 'other'
  // Optional broker association (from share link)
  broker_token?: string;
}

interface ApplicationWizardState {
  loading: boolean;
  error: string | null;
  submittedApplicationNumber: string | null;
  submittedApplicationId: number | null;
  // Broker public info (for share link landing page)
  brokerInfo: BrokerPublicProfile | null;
  brokerInfoLoading: boolean;
  brokerInfoError: string | null;
  // Share link state (for broker dashboard)
  shareLink: string | null;
  shareToken: string | null;
  shareLinkLoading: boolean;
  shareLinkError: string | null;
  sendingShareEmail: boolean;
  sendShareEmailError: string | null;
  // Draft (persisted to localStorage)
  draft: WizardDraft | null;
  draftApplicationId: number | null;
}

const initialState: ApplicationWizardState = {
  loading: false,
  error: null,
  submittedApplicationNumber: null,
  submittedApplicationId: null,
  brokerInfo: null,
  brokerInfoLoading: false,
  brokerInfoError: null,
  shareLink: null,
  shareToken: null,
  shareLinkLoading: false,
  shareLinkError: null,
  sendingShareEmail: false,
  sendShareEmailError: null,
  draft: null,
  draftApplicationId: null,
};

export const saveDraftToServer = createAsyncThunk(
  "applicationWizard/saveDraftToServer",
  async (
    payload: {
      values: Omit<PublicApplicationPayload, "broker_token">;
      currentStep: number;
      brokerToken?: string;
    },
    { getState, dispatch },
  ) => {
    const { values, currentStep, brokerToken } = payload;
    // Need at minimum email + name to create a server record
    if (
      !values.email?.trim() ||
      !values.first_name?.trim() ||
      !values.last_name?.trim()
    ) {
      // Not enough data yet — save only to localStorage
      dispatch(
        saveDraft({
          values,
          currentStep,
          brokerToken,
          savedAt: new Date().toISOString(),
        }),
      );
      return null;
    }

    const state = getState() as RootState;
    const draftApplicationId = state.applicationWizard.draftApplicationId;

    try {
      const { data } = await axios.post<{
        success: boolean;
        draft_id: number;
        application_number: string;
      }>("/api/apply/draft", {
        ...values,
        broker_token: brokerToken,
        wizard_step: currentStep,
        draft_id: draftApplicationId || undefined,
      });
      dispatch(
        saveDraft({
          values,
          currentStep,
          brokerToken,
          savedAt: new Date().toISOString(),
          draftApplicationId: data.draft_id,
        }),
      );
      return data;
    } catch {
      // Server save failed — still persist locally
      dispatch(
        saveDraft({
          values,
          currentStep,
          brokerToken,
          savedAt: new Date().toISOString(),
          draftApplicationId: draftApplicationId ?? undefined,
        }),
      );
      return null;
    }
  },
);

export const submitPublicApplication = createAsyncThunk(
  "applicationWizard/submit",
  async (payload: PublicApplicationPayload, { rejectWithValue, getState }) => {
    try {
      const { draftApplicationId } = (getState() as RootState)
        .applicationWizard;
      const { data } = await axios.post<{
        success: boolean;
        application_number: string;
        application_id: number;
        client_id: number;
      }>("/api/apply", {
        ...payload,
        draft_id: draftApplicationId ?? undefined,
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit application",
      );
    }
  },
);

export const fetchBrokerPublicInfo = createAsyncThunk(
  "applicationWizard/fetchBrokerPublicInfo",
  async (token: string, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<BrokerPublicInfoResponse>(
        `/api/public/broker/${token}`,
      );
      return data.broker;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Broker not found");
    }
  },
);

export const fetchMyShareLink = createAsyncThunk(
  "applicationWizard/fetchMyShareLink",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<MyShareLinkResponse>(
        "/api/brokers/my-share-link",
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch share link",
      );
    }
  },
);

export const regenerateShareLink = createAsyncThunk(
  "applicationWizard/regenerateShareLink",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<RegenerateShareLinkResponse>(
        "/api/brokers/my-share-link/regenerate",
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to regenerate share link",
      );
    }
  },
);

export const sendShareLinkEmail = createAsyncThunk(
  "applicationWizard/sendShareLinkEmail",
  async (payload: SendShareLinkEmailRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<SendShareLinkEmailResponse>(
        "/api/brokers/my-share-link/email",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to send email",
      );
    }
  },
);

const applicationWizardSlice = createSlice({
  name: "applicationWizard",
  initialState,
  reducers: {
    resetWizard(state) {
      state.loading = false;
      state.error = null;
      state.submittedApplicationNumber = null;
      state.submittedApplicationId = null;
    },
    saveDraft(state, action: PayloadAction<WizardDraft>) {
      state.draft = action.payload;
      if (action.payload.draftApplicationId) {
        state.draftApplicationId = action.payload.draftApplicationId;
      }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(action.payload));
      } catch {}
    },
    loadDraft(state) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WizardDraft;
          state.draft = parsed;
          if (parsed.draftApplicationId) {
            state.draftApplicationId = parsed.draftApplicationId;
          }
        }
      } catch {}
    },
    clearDraft(state) {
      state.draft = null;
      state.draftApplicationId = null;
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    },
    clearBrokerInfo(state) {
      state.brokerInfo = null;
      state.brokerInfoError = null;
    },
    clearShareLinkError(state) {
      state.shareLinkError = null;
      state.sendShareEmailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitPublicApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitPublicApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.submittedApplicationNumber = action.payload.application_number;
        state.submittedApplicationId = action.payload.application_id;
      })
      .addCase(submitPublicApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchBrokerPublicInfo
      .addCase(fetchBrokerPublicInfo.pending, (state) => {
        state.brokerInfoLoading = true;
        state.brokerInfoError = null;
      })
      .addCase(fetchBrokerPublicInfo.fulfilled, (state, action) => {
        state.brokerInfoLoading = false;
        state.brokerInfo = action.payload;
      })
      .addCase(fetchBrokerPublicInfo.rejected, (state, action) => {
        state.brokerInfoLoading = false;
        state.brokerInfoError = action.payload as string;
      })
      // fetchMyShareLink
      .addCase(fetchMyShareLink.pending, (state) => {
        state.shareLinkLoading = true;
        state.shareLinkError = null;
      })
      .addCase(fetchMyShareLink.fulfilled, (state, action) => {
        state.shareLinkLoading = false;
        state.shareLink = action.payload.share_url;
        state.shareToken = action.payload.public_token;
      })
      .addCase(fetchMyShareLink.rejected, (state, action) => {
        state.shareLinkLoading = false;
        state.shareLinkError = action.payload as string;
      })
      // regenerateShareLink
      .addCase(regenerateShareLink.pending, (state) => {
        state.shareLinkLoading = true;
        state.shareLinkError = null;
      })
      .addCase(regenerateShareLink.fulfilled, (state, action) => {
        state.shareLinkLoading = false;
        state.shareLink = action.payload.share_url;
        state.shareToken = action.payload.public_token;
      })
      .addCase(regenerateShareLink.rejected, (state, action) => {
        state.shareLinkLoading = false;
        state.shareLinkError = action.payload as string;
      })
      // sendShareLinkEmail
      .addCase(sendShareLinkEmail.pending, (state) => {
        state.sendingShareEmail = true;
        state.sendShareEmailError = null;
      })
      .addCase(sendShareLinkEmail.fulfilled, (state) => {
        state.sendingShareEmail = false;
      })
      .addCase(sendShareLinkEmail.rejected, (state, action) => {
        state.sendingShareEmail = false;
        state.sendShareEmailError = action.payload as string;
      });
  },
});

export const {
  resetWizard,
  saveDraft,
  loadDraft,
  clearDraft,
  clearBrokerInfo,
  clearShareLinkError,
} = applicationWizardSlice.actions;
export default applicationWizardSlice.reducer;
