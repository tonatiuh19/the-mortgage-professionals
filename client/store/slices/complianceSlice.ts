import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

export interface ComplianceChecklistItem {
  id: number;
  checklist_id: number;
  item_name: string;
  item_description: string | null;
  is_required: boolean;
  is_completed: boolean;
  completed_by_broker_id: number | null;
  completed_at: string | null;
  notes: string | null;
}

export interface ComplianceChecklistSummary {
  id: number;
  application_id: number;
  application_number: string | null;
  client_name: string | null;
  checklist_name: string;
  is_completed: boolean;
  completed_at: string | null;
  item_count: number;
  completed_item_count: number;
  created_at: string;
}

export interface ComplianceChecklistDetail extends ComplianceChecklistSummary {
  items: ComplianceChecklistItem[];
}

interface ComplianceState {
  checklists: ComplianceChecklistSummary[];
  selected: ComplianceChecklistDetail | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: ComplianceState = {
  checklists: [],
  selected: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

export const fetchComplianceChecklists = createAsyncThunk(
  "compliance/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<{
        success: boolean;
        checklists: ComplianceChecklistSummary[];
        error?: string;
      }>("/api/compliance/checklists", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to load checklists");
      }
      return data.checklists;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to load checklists",
      );
    }
  },
);

export const fetchComplianceChecklist = createAsyncThunk(
  "compliance/fetchOne",
  async (checklistId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<{
        success: boolean;
        checklist: ComplianceChecklistDetail;
        error?: string;
      }>(`/api/compliance/checklists/${checklistId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to load checklist");
      }
      return data.checklist;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to load checklist",
      );
    }
  },
);

export const toggleComplianceItem = createAsyncThunk(
  "compliance/toggleItem",
  async (
    {
      checklistId,
      itemId,
      is_completed,
      notes,
    }: {
      checklistId: number;
      itemId: number;
      is_completed: boolean;
      notes?: string | null;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<{
        success: boolean;
        checklist: ComplianceChecklistDetail;
        error?: string;
      }>(
        `/api/compliance/checklists/${checklistId}/items/${itemId}`,
        { is_completed, notes },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to update item");
      }
      return data.checklist;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to update item",
      );
    }
  },
);

export const createDefaultComplianceChecklist = createAsyncThunk(
  "compliance/createDefault",
  async (applicationId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<{
        success: boolean;
        checklist: ComplianceChecklistDetail;
        error?: string;
      }>(
        "/api/compliance/checklists",
        { application_id: applicationId },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to create checklist");
      }
      return data.checklist;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to create checklist",
      );
    }
  },
);

const complianceSlice = createSlice({
  name: "compliance",
  initialState,
  reducers: {
    clearComplianceSelection(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplianceChecklists.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchComplianceChecklists.fulfilled, (state, action) => {
        state.isLoading = false;
        state.checklists = action.payload;
      })
      .addCase(fetchComplianceChecklists.rejected, (state, action) => {
        state.isLoading = false;
        state.error = String(action.payload || action.error.message);
      })
      .addCase(fetchComplianceChecklist.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchComplianceChecklist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selected = action.payload;
      })
      .addCase(fetchComplianceChecklist.rejected, (state, action) => {
        state.isLoading = false;
        state.error = String(action.payload || action.error.message);
      })
      .addCase(toggleComplianceItem.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(toggleComplianceItem.fulfilled, (state, action) => {
        state.isSaving = false;
        state.selected = action.payload;
        const idx = state.checklists.findIndex((c) => c.id === action.payload.id);
        if (idx >= 0) {
          state.checklists[idx] = {
            ...state.checklists[idx],
            is_completed: action.payload.is_completed,
            completed_item_count: action.payload.completed_item_count,
            item_count: action.payload.item_count,
            completed_at: action.payload.completed_at,
          };
        }
      })
      .addCase(toggleComplianceItem.rejected, (state, action) => {
        state.isSaving = false;
        state.error = String(action.payload || action.error.message);
      })
      .addCase(createDefaultComplianceChecklist.fulfilled, (state, action) => {
        state.selected = action.payload;
        state.checklists = [
          {
            id: action.payload.id,
            application_id: action.payload.application_id,
            application_number: action.payload.application_number,
            client_name: action.payload.client_name,
            checklist_name: action.payload.checklist_name,
            is_completed: action.payload.is_completed,
            completed_at: action.payload.completed_at,
            item_count: action.payload.item_count,
            completed_item_count: action.payload.completed_item_count,
            created_at: action.payload.created_at,
          },
          ...state.checklists.filter((c) => c.id !== action.payload.id),
        ];
      });
  },
});

export const { clearComplianceSelection } = complianceSlice.actions;
export default complianceSlice.reducer;
