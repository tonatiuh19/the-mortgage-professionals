import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

export interface ReportOverview {
  loans: {
    total_loans: number;
    approved_loans: number;
    pending_loans: number;
    rejected_loans: number;
    in_review_loans: number;
    avg_loan_amount: number;
    total_loan_volume: number;
  };
  loansByType: Array<{ loan_type: string; count: number }>;
  loansTrend: Array<{ date: string; status: string; count: number }>;
  clients: {
    total_clients: number;
    active_clients: number;
    avg_credit_score: number;
  };
  tasks: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
  };
  communications: Array<{ communication_type: string; count: number }>;
  documents: Array<{ document_type: string; count: number }>;
}

export interface RevenueData {
  period: string;
  loan_count: number;
  total_amount: number;
  avg_amount: number;
  loan_type: string;
}

export interface PerformanceData {
  conversionRate: {
    total_applications: number;
    approved: number;
    approval_rate: number;
  };
  processingTime: Array<{ status: string; avg_days: number }>;
  taskCompletion: {
    total_tasks: number;
    completed: number;
    completion_rate: number;
    avg_completion_days: number;
  };
}

interface ReportsState {
  overview: ReportOverview | null;
  revenue: RevenueData[] | null;
  performance: PerformanceData | null;
  isLoading: boolean;
  error: string | null;
  dateRange: {
    from: string;
    to: string;
  };
}

const initialState: ReportsState = {
  overview: null,
  revenue: null,
  performance: null,
  isLoading: false,
  error: null,
  dateRange: {
    from: "",
    to: "",
  },
};

export const fetchReportOverview = createAsyncThunk(
  "reports/fetchOverview",
  async (
    params: { from_date?: string; to_date?: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/reports/overview", {
        params,
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch report overview",
      );
    }
  },
);

export const fetchRevenueReport = createAsyncThunk(
  "reports/fetchRevenue",
  async (
    params: { from_date?: string; to_date?: string; group_by?: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/reports/revenue", {
        params,
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch revenue report",
      );
    }
  },
);

export const fetchPerformanceReport = createAsyncThunk(
  "reports/fetchPerformance",
  async (
    params: { from_date?: string; to_date?: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/reports/performance", {
        params,
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch performance report",
      );
    }
  },
);

export const exportReport = createAsyncThunk(
  "reports/export",
  async (
    params: {
      report_type: string;
      format: string;
      from_date?: string;
      to_date?: string;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post("/api/reports/export", params, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to export report",
      );
    }
  },
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch overview
      .addCase(fetchReportOverview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportOverview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.overview = action.payload;
      })
      .addCase(fetchReportOverview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch revenue
      .addCase(fetchRevenueReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRevenueReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.revenue = action.payload;
      })
      .addCase(fetchRevenueReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch performance
      .addCase(fetchPerformanceReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPerformanceReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.performance = action.payload;
      })
      .addCase(fetchPerformanceReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Export report
      .addCase(exportReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setDateRange, clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
