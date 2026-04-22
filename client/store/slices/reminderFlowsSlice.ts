import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  ReminderFlow,
  ReminderFlowExecution,
  GetReminderFlowsResponse,
  GetReminderFlowResponse,
  SaveReminderFlowRequest,
  SaveReminderFlowResponse,
  ToggleReminderFlowResponse,
  GetReminderFlowExecutionsResponse,
  DeleteReminderFlowResponse,
  MarkFlowExecutionRespondedResponse,
  PaginationInfo,
} from "@shared/api";

interface ReminderFlowsState {
  flows: ReminderFlow[];
  selectedFlow: ReminderFlow | null;
  executions: ReminderFlowExecution[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  isLoadingFlow: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: ReminderFlowsState = {
  flows: [],
  selectedFlow: null,
  executions: [],
  pagination: null,
  isLoading: false,
  isLoadingFlow: false,
  isSaving: false,
  error: null,
};

interface FetchReminderFlowExecutionsParams {
  status?: string;
  flow_id?: number;
  flow_category?: "loan" | "realtor_prospecting";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

// ---------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------

export const fetchReminderFlows = createAsyncThunk(
  "reminderFlows/fetchAll",
  async (
    flow_category?: "loan" | "realtor_prospecting",
    { getState, rejectWithValue }: any = {},
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const params = flow_category ? `?flow_category=${flow_category}` : "";
      const { data } = await axios.get<GetReminderFlowsResponse>(
        `/api/reminder-flows${params}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.flows;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch reminder flows",
      );
    }
  },
);

export const fetchReminderFlow = createAsyncThunk(
  "reminderFlows/fetchOne",
  async (flowId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetReminderFlowResponse>(
        `/api/reminder-flows/${flowId}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.flow;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch reminder flow",
      );
    }
  },
);

export const createReminderFlow = createAsyncThunk(
  "reminderFlows/create",
  async (
    payload: {
      name: string;
      description?: string;
      trigger_event: string;
      trigger_delay_days?: number;
      loan_type_filter?: "all" | "purchase" | "refinance";
      flow_category?: "loan" | "realtor_prospecting";
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<SaveReminderFlowResponse>(
        "/api/reminder-flows",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create reminder flow",
      );
    }
  },
);

export const saveReminderFlow = createAsyncThunk(
  "reminderFlows/save",
  async (
    { flowId, ...payload }: SaveReminderFlowRequest & { flowId: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<SaveReminderFlowResponse>(
        `/api/reminder-flows/${flowId}`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to save reminder flow",
      );
    }
  },
);

export const deleteReminderFlow = createAsyncThunk(
  "reminderFlows/delete",
  async (flowId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete<DeleteReminderFlowResponse>(
        `/api/reminder-flows/${flowId}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return flowId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete reminder flow",
      );
    }
  },
);

export const toggleReminderFlow = createAsyncThunk(
  "reminderFlows/toggle",
  async (flowId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.patch<ToggleReminderFlowResponse>(
        `/api/reminder-flows/${flowId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { flowId, is_active: data.is_active };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to toggle reminder flow",
      );
    }
  },
);

export const fetchReminderFlowExecutions = createAsyncThunk(
  "reminderFlows/fetchExecutions",
  async (
    params: FetchReminderFlowExecutionsParams = {},
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<
        GetReminderFlowExecutionsResponse & { pagination: PaginationInfo }
      >("/api/reminder-flow-executions", {
        headers: { Authorization: `Bearer ${sessionToken}` },
        params,
      });
      return { executions: data.executions, pagination: data.pagination };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch flow executions",
      );
    }
  },
);

export const markFlowExecutionResponded = createAsyncThunk(
  "reminderFlows/markResponded",
  async (executionId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<MarkFlowExecutionRespondedResponse>(
        `/api/reminder-flow-executions/${executionId}/respond`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { executionId, message: data.message };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to mark execution as responded",
      );
    }
  },
);

// ---------------------------------------------------------------
// Slice
// ---------------------------------------------------------------

const reminderFlowsSlice = createSlice({
  name: "reminderFlows",
  initialState,
  reducers: {
    clearSelectedFlow(state) {
      state.selectedFlow = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all flows
    builder
      .addCase(fetchReminderFlows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReminderFlows.fulfilled, (state, action) => {
        state.isLoading = false;
        state.flows = action.payload;
      })
      .addCase(fetchReminderFlows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single flow
    builder
      .addCase(fetchReminderFlow.pending, (state) => {
        state.isLoadingFlow = true;
        state.error = null;
      })
      .addCase(fetchReminderFlow.fulfilled, (state, action) => {
        state.isLoadingFlow = false;
        state.selectedFlow = action.payload;
      })
      .addCase(fetchReminderFlow.rejected, (state, action) => {
        state.isLoadingFlow = false;
        state.error = action.payload as string;
      });

    // Create flow
    builder.addCase(createReminderFlow.pending, (state) => {
      state.isSaving = true;
    });
    builder.addCase(createReminderFlow.fulfilled, (state) => {
      state.isSaving = false;
    });
    builder.addCase(createReminderFlow.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload as string;
    });

    // Save flow
    builder
      .addCase(saveReminderFlow.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveReminderFlow.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(saveReminderFlow.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    // Delete flow
    builder.addCase(deleteReminderFlow.fulfilled, (state, action) => {
      state.flows = state.flows.filter((f) => f.id !== action.payload);
      if (state.selectedFlow?.id === action.payload) {
        state.selectedFlow = null;
      }
    });

    // Toggle flow
    builder.addCase(toggleReminderFlow.fulfilled, (state, action) => {
      const flow = state.flows.find((f) => f.id === action.payload.flowId);
      if (flow) flow.is_active = action.payload.is_active;
      if (state.selectedFlow?.id === action.payload.flowId) {
        state.selectedFlow.is_active = action.payload.is_active;
      }
    });

    // Fetch executions
    builder
      .addCase(fetchReminderFlowExecutions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchReminderFlowExecutions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executions = action.payload.executions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchReminderFlowExecutions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Mark execution as responded
    builder.addCase(markFlowExecutionResponded.fulfilled, (state, action) => {
      const exec = state.executions.find(
        (e) => e.id === action.payload.executionId,
      );
      if (exec) {
        exec.responded_at = new Date().toISOString();
      }
    });
  },
});

export const { clearSelectedFlow, clearError } = reminderFlowsSlice.actions;
export default reminderFlowsSlice.reducer;
