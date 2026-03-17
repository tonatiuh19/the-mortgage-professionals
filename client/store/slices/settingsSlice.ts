import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  SystemSetting,
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from "@shared/api";

// ─── State ────────────────────────────────────────────────────────────────────

interface SettingsState {
  settings: SystemSetting[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(state: RootState) {
  const token = state.brokerAuth.sessionToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchSettings = createAsyncThunk(
  "settings/fetchSettings",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetSettingsResponse>("/api/settings", {
        headers: authHeaders(getState() as RootState),
      });
      return data.settings;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to fetch settings",
      );
    }
  },
);

export const updateSettings = createAsyncThunk(
  "settings/updateSettings",
  async (payload: UpdateSettingsRequest, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put<UpdateSettingsResponse>(
        "/api/settings",
        payload,
        { headers: authHeaders(getState() as RootState) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to update settings",
      );
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchSettings
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateSettings
      .addCase(updateSettings.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });
  },
});

// ─── Selector helpers ─────────────────────────────────────────────────────────

export function selectSettingValue(
  settings: SystemSetting[],
  key: string,
): string {
  return settings.find((s) => s.setting_key === key)?.setting_value ?? "";
}

export default settingsSlice.reducer;
