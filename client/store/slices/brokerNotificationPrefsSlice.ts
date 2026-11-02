import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/store";
import type { BrokerNotificationPrefsResponse } from "@shared/api";
import { defaultBrokerNotificationPrefs } from "@shared/broker-notification-prefs";

interface BrokerNotificationPrefsState {
  preferences: BrokerNotificationPrefsResponse | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: BrokerNotificationPrefsState = {
  preferences: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchBrokerNotificationPreferences = createAsyncThunk(
  "brokerNotificationPrefs/fetch",
  async (_, { getState, rejectWithValue }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    try {
      const { data } = await axios.get<{
        success: boolean;
        preferences: BrokerNotificationPrefsResponse;
        error?: string;
      }>("/api/broker/notification-preferences", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to load preferences");
      }
      return data.preferences;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || err.message || "Failed to load preferences",
      );
    }
  },
);

export const updateBrokerNotificationPreferences = createAsyncThunk(
  "brokerNotificationPrefs/update",
  async (
    patch: Partial<BrokerNotificationPrefsResponse>,
    { getState, rejectWithValue },
  ) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    try {
      const { data } = await axios.put<{
        success: boolean;
        preferences: BrokerNotificationPrefsResponse;
        error?: string;
      }>("/api/broker/notification-preferences", patch, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to save preferences");
      }
      return data.preferences;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || err.message || "Failed to save preferences",
      );
    }
  },
);

const brokerNotificationPrefsSlice = createSlice({
  name: "brokerNotificationPrefs",
  initialState,
  reducers: {
    clearBrokerNotificationPrefsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrokerNotificationPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrokerNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchBrokerNotificationPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload || action.error.message);
        if (!state.preferences) {
          const d = defaultBrokerNotificationPrefs();
          state.preferences = {
            ...d,
            account_email: "",
            account_email_sendable: false,
          };
        }
      })
      .addCase(updateBrokerNotificationPreferences.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateBrokerNotificationPreferences.fulfilled, (state, action) => {
        state.saving = false;
        state.preferences = action.payload;
      })
      .addCase(updateBrokerNotificationPreferences.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload || action.error.message);
      });
  },
});

export const { clearBrokerNotificationPrefsError } =
  brokerNotificationPrefsSlice.actions;
export default brokerNotificationPrefsSlice.reducer;
