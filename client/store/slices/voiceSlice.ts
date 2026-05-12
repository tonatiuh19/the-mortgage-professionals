import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchVoiceToken = createAsyncThunk(
  "voice/fetchToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<{ token: string }>(
        "/api/voice/token",
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.token;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch voice token",
      );
    }
  },
);

interface VoiceLogPayload {
  phone: string;
  duration: number;
  call_status: string;
  call_sid?: string;
  client_id?: number;
  application_id?: number;
  client_name?: string;
  direction?: string;
}

export const logVoiceCall = createAsyncThunk(
  "voice/logCall",
  async (payload: VoiceLogPayload, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.post("/api/voice/log", payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return true;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to log call",
      );
    }
  },
);

export const fetchAblyToken = createAsyncThunk(
  "voice/fetchAblyToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/conversations/ably-token", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch Ably token",
      );
    }
  },
);

export const updateVoiceAvailability = createAsyncThunk(
  "voice/updateAvailability",
  async (available: boolean, { getState }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    // fire-and-forget — errors are intentionally swallowed
    axios
      .post(
        "/api/voice/availability",
        { available },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      )
      .catch(() => {});
    return available;
  },
);

export const lookupContact = createAsyncThunk(
  "voice/lookupContact",
  async (phone: string, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get(
        `/api/conversations/lookup-contact?phone=${encodeURIComponent(phone)}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data as {
        found: boolean;
        client_name?: string | null;
        client_id?: number | null;
      };
    } catch (error: any) {
      return rejectWithValue("Lookup failed");
    }
  },
);

export const checkRecordingUrl = createAsyncThunk(
  "voice/checkRecordingUrl",
  async (sid: string, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get(`/api/voice/recording-check/${sid}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data as {
        ready: boolean;
        recording_url?: string;
        recording_duration?: number | null;
        sid: string;
      };
    } catch (error: any) {
      return rejectWithValue("Recording check failed");
    }
  },
);

// ── Call-forwarding thunks ─────────────────────────────────────────────────

export const fetchCallForwardingSettings = createAsyncThunk(
  "voice/fetchCallForwardingSettings",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/voice/call-forwarding", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data as {
        success: boolean;
        call_forwarding_enabled: boolean;
        call_forwarding_number: string | null;
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to load call-forwarding settings",
      );
    }
  },
);

export const saveCallForwardingSettings = createAsyncThunk(
  "voice/saveCallForwardingSettings",
  async (
    payload: { enabled: boolean; phone: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put(
        "/api/voice/call-forwarding",
        { enabled: payload.enabled, phone: payload.phone },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to save call-forwarding settings",
      );
    }
  },
);

// ── Voicemail-settings thunks ─────────────────────────────────────────────

export interface VoicemailSettingsResponse {
  success: boolean;
  broker: {
    voicemail_enabled: boolean | null;
    voicemail_greeting_text: string | null;
    voicemail_greeting_url: string | null;
    has_personal_line: boolean;
  };
  tenant: {
    voicemail_enabled: boolean;
    voicemail_greeting_text: string | null;
    voicemail_greeting_url: string | null;
    voicemail_max_seconds: number;
    voicemail_transcribe: boolean;
  };
}

export const fetchVoicemailSettings = createAsyncThunk(
  "voice/fetchVoicemailSettings",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<VoicemailSettingsResponse>(
        "/api/voice/voicemail-settings",
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load voicemail settings",
      );
    }
  },
);

export const saveVoicemailSettings = createAsyncThunk(
  "voice/saveVoicemailSettings",
  async (
    payload: {
      enabled?: boolean | null;
      greeting_text?: string | null;
      greeting_url?: string | null;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put(
        "/api/voice/voicemail-settings",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data as { success: boolean; error?: string };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to save voicemail settings",
      );
    }
  },
);

export const saveTenantVoicemailSettings = createAsyncThunk(
  "voice/saveTenantVoicemailSettings",
  async (
    payload: {
      enabled?: boolean;
      greeting_text?: string | null;
      greeting_url?: string | null;
      max_seconds?: number;
      transcribe?: boolean;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put(
        "/api/voice/voicemail-settings/tenant",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data as { success: boolean; error?: string };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          "Failed to save tenant voicemail settings",
      );
    }
  },
);

// ── Phone-numbers thunks ──────────────────────────────────────────────────

export const fetchPhoneNumbers = createAsyncThunk(
  "voice/fetchPhoneNumbers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/voice/phone-numbers", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch phone numbers",
      );
    }
  },
);

export const assignPhoneNumber = createAsyncThunk(
  "voice/assignPhoneNumber",
  async (
    { sid, brokerId }: { sid: string; brokerId: number | null },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post(
        `/api/voice/phone-numbers/${sid}/assign`,
        { brokerId },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to assign phone number",
      );
    }
  },
);

export const configurePhoneNumber = createAsyncThunk(
  "voice/configurePhoneNumber",
  async (sid: string, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post(
        `/api/voice/phone-numbers/${sid}/configure`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { ...data, sid };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to configure phone number",
      );
    }
  },
);

export const fixCallSetup = createAsyncThunk(
  "voice/fixCallSetup",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post(
        "/api/voice/fix-call-setup",
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to sync voice configuration",
      );
    }
  },
);

export type DeviceStatus = "idle" | "connecting" | "registered" | "error";

export interface OutboundCallTarget {
  phone: string;
  clientName?: string | null;
  clientId?: number | null;
  applicationId?: number | null;
}

interface VoiceState {
  isAvailable: boolean;
  deviceStatus: DeviceStatus;
  /** When set, GlobalVoiceManager renders a persistent floating outbound call panel. */
  outboundCall: OutboundCallTarget | null;
}

const stored = localStorage.getItem("voice_available");

const initialState: VoiceState = {
  isAvailable: stored === null ? true : stored === "true",
  deviceStatus: "idle",
  outboundCall: null,
};

const voiceSlice = createSlice({
  name: "voice",
  initialState,
  reducers: {
    setVoiceAvailable(state, action: PayloadAction<boolean>) {
      state.isAvailable = action.payload;
      localStorage.setItem("voice_available", String(action.payload));
    },
    setDeviceStatus(state, action: PayloadAction<DeviceStatus>) {
      state.deviceStatus = action.payload;
    },
    startOutboundCall(state, action: PayloadAction<OutboundCallTarget>) {
      state.outboundCall = action.payload;
    },
    resolveOutboundCallName(
      state,
      action: PayloadAction<{
        clientName: string | null;
        clientId?: number | null;
      }>,
    ) {
      if (state.outboundCall) {
        state.outboundCall.clientName = action.payload.clientName;
        if (action.payload.clientId != null) {
          state.outboundCall.clientId = action.payload.clientId;
        }
      }
    },
    endOutboundCall(state) {
      state.outboundCall = null;
    },
  },
});

export const {
  setVoiceAvailable,
  setDeviceStatus,
  startOutboundCall,
  resolveOutboundCallName,
  endOutboundCall,
} = voiceSlice.actions;
export default voiceSlice.reducer;
