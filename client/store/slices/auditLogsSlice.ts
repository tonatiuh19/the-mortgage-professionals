import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

export interface AuditLog {
  id: number;
  user_id: number | null;
  broker_id: number | null;
  actor_type: "user" | "broker";
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  changes: any;
  status: "success" | "failure" | "warning";
  error_message: string | null;
  request_id: string | null;
  duration_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor_email?: string;
  actor_name?: string;
}

export interface AuditLogStats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byActorType: Array<{ actor_type: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

interface AuditLogsState {
  logs: AuditLog[];
  stats: AuditLogStats | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  limit: number;
  offset: number;
}

const initialState: AuditLogsState = {
  logs: [],
  stats: null,
  isLoading: false,
  error: null,
  total: 0,
  limit: 100,
  offset: 0,
};

export const fetchAuditLogs = createAsyncThunk(
  "auditLogs/fetchAll",
  async (
    params: {
      actor_type?: string;
      action?: string;
      entity_type?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
      offset?: number;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/audit-logs", {
        params,
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch audit logs",
      );
    }
  },
);

export const fetchAuditLogStats = createAsyncThunk(
  "auditLogs/fetchStats",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/audit-logs/stats", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.stats;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch audit log stats",
      );
    }
  },
);

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch audit logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.logs;
        state.total = action.payload.total;
        state.limit = action.payload.limit;
        state.offset = action.payload.offset;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch stats
      .addCase(fetchAuditLogStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAuditLogStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = auditLogsSlice.actions;
export default auditLogsSlice.reducer;
