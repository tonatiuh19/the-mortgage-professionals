import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  MortgiChatResponse,
  MortgiConfig,
  MortgiUsage,
  GetMortgiConfigResponse,
  GetMortgiUsageResponse,
  UpdateMortgiConfigRequest,
  UpdateMortgiConfigResponse,
  GetMortgiHistoryResponse,
  MortgiChatHistoryEntry,
  MortgiMessage,
} from "@shared/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MortgiChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

interface MortgiState {
  // Chat
  messages: MortgiChatMessage[];
  sessionKey: string;
  isTyping: boolean;
  chatError: string | null;
  isOpen: boolean;

  // Config (admin)
  config: MortgiConfig | null;
  isLoadingConfig: boolean;
  isSavingConfig: boolean;
  configError: string | null;

  // History (admin)
  history: MortgiChatHistoryEntry[];
  historyTotal: number;
  isLoadingHistory: boolean;
  historyError: string | null;

  // Usage (admin)
  usage: MortgiUsage | null;
  isLoadingUsage: boolean;
  quotaExceeded: boolean;
  quotaExceededAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function brokerAuthHeaders(state: RootState) {
  const token = state.brokerAuth.sessionToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clientAuthHeaders(state: RootState) {
  const token = state.clientAuth.sessionToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function generateSessionKey(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 10);
  return `mortgi_${date}_${rand}`;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: MortgiState = {
  messages: [],
  sessionKey: generateSessionKey(),
  isTyping: false,
  chatError: null,
  isOpen: false,
  config: null,
  isLoadingConfig: false,
  isSavingConfig: false,
  configError: null,
  history: [],
  historyTotal: 0,
  isLoadingHistory: false,
  historyError: null,
  usage: null,
  isLoadingUsage: false,
  quotaExceeded: false,
  quotaExceededAt: "",
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** Send a message as a broker */
export const sendBrokerMessage = createAsyncThunk(
  "mortgi/sendBrokerMessage",
  async (message: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { data } = await axios.post<MortgiChatResponse>(
        "/api/ai/chat",
        { message, session_key: state.mortgi.sessionKey },
        { headers: brokerAuthHeaders(state) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to send message",
      );
    }
  },
);

/** Send a message as a client */
export const sendClientMessage = createAsyncThunk(
  "mortgi/sendClientMessage",
  async (message: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { data } = await axios.post<MortgiChatResponse>(
        "/api/ai/chat",
        { message, session_key: state.mortgi.sessionKey },
        { headers: clientAuthHeaders(state) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to send message",
      );
    }
  },
);

/** Fetch Mortgi config (admin) */
export const fetchMortgiConfig = createAsyncThunk(
  "mortgi/fetchConfig",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetMortgiConfigResponse>(
        "/api/ai/config",
        {
          headers: brokerAuthHeaders(getState() as RootState),
        },
      );
      return data.config;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to load config",
      );
    }
  },
);

/** Update Mortgi config (admin) */
export const updateMortgiConfig = createAsyncThunk(
  "mortgi/updateConfig",
  async (payload: UpdateMortgiConfigRequest, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put<UpdateMortgiConfigResponse>(
        "/api/ai/config",
        payload,
        { headers: brokerAuthHeaders(getState() as RootState) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to update config",
      );
    }
  },
);

/** Fetch chat history (admin) */
export const fetchMortgiHistory = createAsyncThunk(
  "mortgi/fetchHistory",
  async (
    params: { page?: number; limit?: number } | void,
    { getState, rejectWithValue },
  ) => {
    try {
      const page = (params as any)?.page ?? 1;
      const limit = (params as any)?.limit ?? 20;
      const { data } = await axios.get<GetMortgiHistoryResponse>(
        `/api/ai/history?page=${page}&limit=${limit}`,
        { headers: brokerAuthHeaders(getState() as RootState) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to load history",
      );
    }
  },
);

/** Delete a chat session (admin) */
export const deleteMortgiSession = createAsyncThunk(
  "mortgi/deleteSession",
  async (sessionId: number, { getState, rejectWithValue }) => {
    try {
      await axios.delete(`/api/ai/history/${sessionId}`, {
        headers: brokerAuthHeaders(getState() as RootState),
      });
      return sessionId;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to delete session",
      );
    }
  },
);

/** Fetch Mortgi usage stats (admin) */
export const fetchMortgiUsage = createAsyncThunk(
  "mortgi/fetchUsage",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetMortgiUsageResponse>(
        "/api/ai/usage",
        { headers: brokerAuthHeaders(getState() as RootState) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to load usage",
      );
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const mortgiSlice = createSlice({
  name: "mortgi",
  initialState,
  reducers: {
    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },
    openChat(state) {
      state.isOpen = true;
    },
    closeChat(state) {
      state.isOpen = false;
    },
    clearChat(state) {
      state.messages = [];
      state.chatError = null;
      state.sessionKey = generateSessionKey();
    },
    clearChatError(state) {
      state.chatError = null;
    },
  },
  extraReducers: (builder) => {
    // ── sendBrokerMessage ──────────────────────────────────────────────────
    builder.addCase(sendBrokerMessage.pending, (state, action) => {
      const userMsg: MortgiChatMessage = {
        role: "user",
        content: action.meta.arg,
        timestamp: new Date().toISOString(),
      };
      state.messages.push(userMsg);
      state.isTyping = true;
      state.chatError = null;
    });
    builder.addCase(sendBrokerMessage.fulfilled, (state, action) => {
      state.isTyping = false;
      state.messages.push({
        role: "assistant",
        content: action.payload.reply,
        timestamp: new Date().toISOString(),
      });
    });
    builder.addCase(sendBrokerMessage.rejected, (state, action) => {
      state.isTyping = false;
      state.chatError = action.payload as string;
    });

    // ── sendClientMessage ──────────────────────────────────────────────────
    builder.addCase(sendClientMessage.pending, (state, action) => {
      state.messages.push({
        role: "user",
        content: action.meta.arg,
        timestamp: new Date().toISOString(),
      });
      state.isTyping = true;
      state.chatError = null;
    });
    builder.addCase(sendClientMessage.fulfilled, (state, action) => {
      state.isTyping = false;
      state.messages.push({
        role: "assistant",
        content: action.payload.reply,
        timestamp: new Date().toISOString(),
      });
    });
    builder.addCase(sendClientMessage.rejected, (state, action) => {
      state.isTyping = false;
      state.chatError = action.payload as string;
    });

    // ── fetchMortgiConfig ──────────────────────────────────────────────────
    builder.addCase(fetchMortgiConfig.pending, (state) => {
      state.isLoadingConfig = true;
      state.configError = null;
    });
    builder.addCase(fetchMortgiConfig.fulfilled, (state, action) => {
      state.isLoadingConfig = false;
      state.config = action.payload;
    });
    builder.addCase(fetchMortgiConfig.rejected, (state, action) => {
      state.isLoadingConfig = false;
      state.configError = action.payload as string;
    });

    // ── updateMortgiConfig ──────────────────────────────────────────────────
    builder.addCase(updateMortgiConfig.pending, (state) => {
      state.isSavingConfig = true;
    });
    builder.addCase(updateMortgiConfig.fulfilled, (state) => {
      state.isSavingConfig = false;
    });
    builder.addCase(updateMortgiConfig.rejected, (state, action) => {
      state.isSavingConfig = false;
      state.configError = action.payload as string;
    });

    // ── fetchMortgiHistory ─────────────────────────────────────────────────
    builder.addCase(fetchMortgiHistory.pending, (state) => {
      state.isLoadingHistory = true;
      state.historyError = null;
    });
    builder.addCase(fetchMortgiHistory.fulfilled, (state, action) => {
      state.isLoadingHistory = false;
      state.history = action.payload.sessions;
      state.historyTotal = action.payload.total;
    });
    builder.addCase(fetchMortgiHistory.rejected, (state, action) => {
      state.isLoadingHistory = false;
      state.historyError = action.payload as string;
    });

    // ── deleteMortgiSession ────────────────────────────────────────────────
    builder.addCase(deleteMortgiSession.fulfilled, (state, action) => {
      state.history = state.history.filter((s) => s.id !== action.payload);
      state.historyTotal = Math.max(0, state.historyTotal - 1);
    });

    // ── fetchMortgiUsage ───────────────────────────────────────────────────
    builder.addCase(fetchMortgiUsage.pending, (state) => {
      state.isLoadingUsage = true;
    });
    builder.addCase(fetchMortgiUsage.fulfilled, (state, action) => {
      state.isLoadingUsage = false;
      state.usage = action.payload.usage;
      state.quotaExceeded = action.payload.quota_exceeded;
      state.quotaExceededAt = action.payload.quota_exceeded_at;
    });
    builder.addCase(fetchMortgiUsage.rejected, (state) => {
      state.isLoadingUsage = false;
    });
  },
});

export const { toggleChat, openChat, closeChat, clearChat, clearChatError } =
  mortgiSlice.actions;

export default mortgiSlice.reducer;
