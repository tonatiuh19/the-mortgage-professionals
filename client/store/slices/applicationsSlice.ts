import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

interface Application {
  id: number;
  application_number: string;
  client_user_id: number;
  broker_user_id?: number;
  loan_type: string;
  loan_amount: number;
  property_address?: string;
  status: string;
  current_step: number;
  total_steps: number;
  created_at: string;
}

interface ApplicationsState {
  applications: Application[];
  currentApplication: Application | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ApplicationsState = {
  applications: [],
  currentApplication: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchApplications = createAsyncThunk(
  "applications/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const response = await fetch("/api/applications", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to fetch applications");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  },
);

export const fetchApplicationById = createAsyncThunk(
  "applications/fetchById",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const response = await fetch(`/api/applications/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to fetch application");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  },
);

export const createApplication = createAsyncThunk(
  "applications/create",
  async (applicationData: any, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to create application");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  },
);

export const updateApplication = createAsyncThunk(
  "applications/update",
  async (
    { id, updates }: { id: number; updates: any },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const response = await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to update application");
      }

      return { id, updates };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  },
);

export const submitApplication = createAsyncThunk(
  "applications/submit",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const response = await fetch(`/api/applications/${id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || "Failed to submit application");
      }

      return id;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  },
);

const applicationsSlice = createSlice({
  name: "applications",
  initialState,
  reducers: {
    clearCurrentApplication: (state) => {
      state.currentApplication = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchApplications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.applications = action.payload;
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch by ID
      .addCase(fetchApplicationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentApplication = action.payload;
      })
      .addCase(fetchApplicationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createApplication.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createApplication.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(createApplication.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateApplication.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.applications.findIndex((app) => app.id === id);
        if (index !== -1) {
          state.applications[index] = {
            ...state.applications[index],
            ...updates,
          };
        }
        if (state.currentApplication?.id === id) {
          state.currentApplication = {
            ...state.currentApplication,
            ...updates,
          };
        }
      })
      // Submit
      .addCase(submitApplication.fulfilled, (state, action) => {
        const id = action.payload;
        const index = state.applications.findIndex((app) => app.id === id);
        if (index !== -1) {
          state.applications[index].status = "submitted";
        }
        if (state.currentApplication?.id === id) {
          state.currentApplication.status = "submitted";
        }
      });
  },
});

export const { clearCurrentApplication, clearError } =
  applicationsSlice.actions;

// Selectors
export const selectApplications = (state: {
  applications: ApplicationsState;
}) => state.applications.applications;
export const selectCurrentApplication = (state: {
  applications: ApplicationsState;
}) => state.applications.currentApplication;
export const selectApplicationsLoading = (state: {
  applications: ApplicationsState;
}) => state.applications.isLoading;
export const selectApplicationsError = (state: {
  applications: ApplicationsState;
}) => state.applications.error;

export default applicationsSlice.reducer;
