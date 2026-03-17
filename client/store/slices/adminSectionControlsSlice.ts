import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  AdminSectionControl,
  GetAdminSectionControlsResponse,
  UpdateAdminSectionControlsRequest,
  UpdateAdminSectionControlsResponse,
} from "@shared/api";
import { initAdminSession } from "./brokerAuthSlice";

// ─── State ────────────────────────────────────────────────────────────────────

interface AdminSectionControlsState {
  controls: AdminSectionControl[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: AdminSectionControlsState = {
  controls: [],
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

export const fetchAdminSectionControls = createAsyncThunk(
  "adminSectionControls/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetAdminSectionControlsResponse>(
        "/api/admin/section-controls",
        { headers: authHeaders(getState() as RootState) },
      );
      return data.controls;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to fetch section controls",
      );
    }
  },
);

export const updateAdminSectionControls = createAsyncThunk(
  "adminSectionControls/update",
  async (
    payload: UpdateAdminSectionControlsRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { data } = await axios.put<UpdateAdminSectionControlsResponse>(
        "/api/admin/section-controls",
        payload,
        { headers: authHeaders(getState() as RootState) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to update section controls",
      );
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminSectionControlsSlice = createSlice({
  name: "adminSectionControls",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAdminSectionControls
      .addCase(fetchAdminSectionControls.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminSectionControls.fulfilled, (state, action) => {
        state.isLoading = false;
        state.controls = action.payload;
      })
      .addCase(fetchAdminSectionControls.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateAdminSectionControls
      .addCase(updateAdminSectionControls.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateAdminSectionControls.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(updateAdminSectionControls.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      // initAdminSession — cross-slice: populate controls from merged bootstrap
      .addCase(initAdminSession.fulfilled, (state, action) => {
        state.controls = action.payload.controls;
      });
  },
});

export const { clearError } = adminSectionControlsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Returns a map of section_id → AdminSectionControl for fast lookup */
export const selectSectionControlsMap = createSelector(
  (state: RootState) => state.adminSectionControls.controls,
  (controls) =>
    controls.reduce<Record<string, AdminSectionControl>>((acc, ctrl) => {
      acc[ctrl.section_id] = ctrl;
      return acc;
    }, {}),
);

export default adminSectionControlsSlice.reducer;
