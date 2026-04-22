import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  RealtorProspect,
  RealtorProspectStage,
  GetRealtorProspectsResponse,
  CreateRealtorProspectRequest,
  CreateRealtorProspectResponse,
  UpdateRealtorProspectStageResponse,
  UpdateRealtorProspectResponse,
  DeleteRealtorProspectResponse,
} from "@shared/api";

interface RealtorProspectFilters {
  stage?: string;
  status?: string;
  search?: string;
  owner_broker_id?: number;
}

interface RealtorProspectingState {
  prospects: RealtorProspect[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  activeFilters: RealtorProspectFilters;
}

const initialState: RealtorProspectingState = {
  prospects: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  activeFilters: {},
};

export const fetchRealtorProspects = createAsyncThunk(
  "realtorProspecting/fetchProspects",
  async (
    filters: RealtorProspectFilters = {},
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
      const { data } = await axios.get<GetRealtorProspectsResponse>(
        `/api/realtor-prospects?${params.toString()}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.prospects;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch realtor prospects",
      );
    }
  },
);

export const createRealtorProspect = createAsyncThunk(
  "realtorProspecting/createProspect",
  async (
    payload: CreateRealtorProspectRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<CreateRealtorProspectResponse>(
        "/api/realtor-prospects",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.prospect;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create realtor prospect",
      );
    }
  },
);

export const updateRealtorProspectStage = createAsyncThunk(
  "realtorProspecting/updateStage",
  async (
    { id, stage }: { id: number; stage: RealtorProspectStage },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.patch<UpdateRealtorProspectStageResponse>(
        `/api/realtor-prospects/${id}/stage`,
        { stage },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { id: data.id, stage: data.stage };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update stage",
      );
    }
  },
);

export const updateRealtorProspect = createAsyncThunk(
  "realtorProspecting/updateProspect",
  async (
    {
      id,
      payload,
    }: { id: number; payload: Partial<CreateRealtorProspectRequest> },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.patch<UpdateRealtorProspectResponse>(
        `/api/realtor-prospects/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.prospect;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update prospect",
      );
    }
  },
);

export const deleteRealtorProspect = createAsyncThunk(
  "realtorProspecting/deleteProspect",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete<DeleteRealtorProspectResponse>(
        `/api/realtor-prospects/${id}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete prospect",
      );
    }
  },
);

const realtorProspectingSlice = createSlice({
  name: "realtorProspecting",
  initialState,
  reducers: {
    updateProspectStageLocal(
      state,
      action: PayloadAction<{ id: number; stage: RealtorProspectStage }>,
    ) {
      const prospect = state.prospects.find((p) => p.id === action.payload.id);
      if (prospect) {
        prospect.stage = action.payload.stage;
      }
    },
    setActiveFilters(state, action: PayloadAction<RealtorProspectFilters>) {
      state.activeFilters = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRealtorProspects
      .addCase(fetchRealtorProspects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRealtorProspects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.prospects = action.payload;
      })
      .addCase(fetchRealtorProspects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createRealtorProspect
      .addCase(createRealtorProspect.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createRealtorProspect.fulfilled, (state, action) => {
        state.isCreating = false;
        state.prospects.unshift(action.payload);
      })
      .addCase(createRealtorProspect.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      // updateRealtorProspectStage
      .addCase(updateRealtorProspectStage.fulfilled, (state, action) => {
        const prospect = state.prospects.find(
          (p) => p.id === action.payload.id,
        );
        if (prospect) {
          prospect.stage = action.payload.stage;
        }
      })
      // updateRealtorProspect
      .addCase(updateRealtorProspect.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(updateRealtorProspect.fulfilled, (state, action) => {
        state.isUpdating = false;
        const idx = state.prospects.findIndex(
          (p) => p.id === action.payload.id,
        );
        if (idx !== -1) {
          state.prospects[idx] = action.payload;
        }
      })
      .addCase(updateRealtorProspect.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // deleteRealtorProspect
      .addCase(deleteRealtorProspect.fulfilled, (state, action) => {
        state.prospects = state.prospects.filter(
          (p) => p.id !== action.payload,
        );
      });
  },
});

export const { updateProspectStageLocal, setActiveFilters, clearError } =
  realtorProspectingSlice.actions;
export default realtorProspectingSlice.reducer;
