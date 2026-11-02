import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  RoleSectionPermission,
  GetRoleSectionPermissionsResponse,
  UpdateRoleSectionPermissionsRequest,
  UpdateRoleSectionPermissionsResponse,
} from "@shared/api";
import { initAdminSession } from "./brokerAuthSlice";

// ─── State ────────────────────────────────────────────────────────────────────

interface RoleSectionPermissionsState {
  permissions: RoleSectionPermission[];
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: RoleSectionPermissionsState = {
  permissions: [],
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(state: RootState) {
  const token = state.brokerAuth.sessionToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchRoleSectionPermissions = createAsyncThunk(
  "roleSectionPermissions/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetRoleSectionPermissionsResponse>(
        "/api/admin/role-section-permissions",
        { headers: authHeaders(getState() as RootState) },
      );
      return data.permissions;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to fetch role section permissions",
      );
    }
  },
);

export const updateRoleSectionPermissions = createAsyncThunk(
  "roleSectionPermissions/update",
  async (
    payload: UpdateRoleSectionPermissionsRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { data } = await axios.put<UpdateRoleSectionPermissionsResponse>(
        "/api/admin/role-section-permissions",
        payload,
        { headers: authHeaders(getState() as RootState) },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error ??
          "Failed to update role section permissions",
      );
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const roleSectionPermissionsSlice = createSlice({
  name: "roleSectionPermissions",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    /**
     * Optimistically patch a single permission in local state.
     * Upserts when the section_id is new (e.g. loan-calculator before a seed row exists)
     * so Settings toggles persist on Save via PUT upsert.
     */
    setPermission(
      state,
      action: {
        payload: {
          broker_role: string;
          section_id: string;
          is_visible: boolean;
        };
      },
    ) {
      const { broker_role, section_id, is_visible } = action.payload;
      const existing = state.permissions.find(
        (p) => p.broker_role === broker_role && p.section_id === section_id,
      );
      if (existing) {
        existing.is_visible = is_visible;
      } else {
        state.permissions.push({
          id: 0,
          tenant_id: 0,
          broker_role,
          section_id,
          is_visible,
          updated_by: null,
          updated_at: new Date().toISOString(),
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRoleSectionPermissions
      .addCase(fetchRoleSectionPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoleSectionPermissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.permissions = action.payload;
      })
      .addCase(fetchRoleSectionPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
      })
      // updateRoleSectionPermissions
      .addCase(updateRoleSectionPermissions.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateRoleSectionPermissions.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(updateRoleSectionPermissions.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      // Cross-slice: populate from merged bootstrap
      .addCase(initAdminSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.permissions = action.payload.rolePermissions ?? [];
      });
  },
});

export const { clearError, setPermission } =
  roleSectionPermissionsSlice.actions;
export default roleSectionPermissionsSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

/**
 * Map keyed by "broker_role:section_id" → is_visible boolean.
 * Use: map["admin:tasks"] → true/false
 */
export const selectRolePermissionsMap = createSelector(
  (s: RootState) => s.roleSectionPermissions.permissions,
  (permissions) =>
    permissions.reduce(
      (acc, p) => {
        acc[`${p.broker_role}:${p.section_id}`] = p.is_visible;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
);
