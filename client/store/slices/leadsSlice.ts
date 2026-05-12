import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  interest_type: string;
  estimated_loan_amount?: number;
  created_at: string;
}

interface LeadsState {
  leads: Lead[];
  currentLead: Lead | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: LeadsState = {
  leads: [],
  currentLead: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchLeads = createAsyncThunk(
  "leads/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/leads", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch leads",
      );
    }
  },
);

export const createLead = createAsyncThunk(
  "leads/create",
  async (leadData: any, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post("/api/leads", leadData, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create lead",
      );
    }
  },
);

export const updateLead = createAsyncThunk(
  "leads/update",
  async (
    { id, updates }: { id: number; updates: any },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.put(`/api/leads/${id}`, updates, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update lead",
      );
    }
  },
);

const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = action.payload;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createLead.fulfilled, (state, action) => {
        state.leads.unshift(action.payload);
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.leads.findIndex((lead) => lead.id === id);
        if (index !== -1) {
          state.leads[index] = { ...state.leads[index], ...updates };
        }
      });
  },
});

export const { clearError } = leadsSlice.actions;

export const selectLeads = (state: { leads: LeadsState }) => state.leads.leads;
export const selectLeadsLoading = (state: { leads: LeadsState }) =>
  state.leads.isLoading;

export default leadsSlice.reducer;
