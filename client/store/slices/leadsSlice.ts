import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
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
      const response = await fetch("/api/leads", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to fetch leads");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue("Network error");
    }
  },
);

export const createLead = createAsyncThunk(
  "leads/create",
  async (leadData: any, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to create lead");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue("Network error");
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
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to update lead");
      }

      return { id, updates };
    } catch (error) {
      return rejectWithValue("Network error");
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
