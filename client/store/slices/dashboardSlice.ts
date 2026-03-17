import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetDashboardStatsResponse,
  DashboardStats,
  GetBrokerMetricsResponse,
  BrokerMonthlyMetrics,
  UpdateBrokerMetricsRequest,
  GetAnnualMetricsResponse,
  AnnualMetrics,
} from "@shared/api";

interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  brokerMetrics: BrokerMonthlyMetrics | null;
  metricsLoading: boolean;
  metricsError: string | null;
  annualMetrics: AnnualMetrics | null;
  annualLoading: boolean;
  annualError: string | null;
}

const initialState: DashboardState = {
  stats: null,
  isLoading: false,
  error: null,
  brokerMetrics: null,
  metricsLoading: false,
  metricsError: null,
  annualMetrics: null,
  annualLoading: false,
  annualError: null,
};

export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetDashboardStatsResponse>(
        "/api/dashboard/stats",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.stats;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch dashboard stats",
      );
    }
  },
);

export const fetchBrokerMetrics = createAsyncThunk(
  "dashboard/fetchBrokerMetrics",
  async (
    params: { year?: number; month?: number; filterBrokerIds?: number[] } = {},
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const now = new Date();
      const year = params?.year ?? now.getFullYear();
      const month = params?.month ?? now.getMonth() + 1;
      const filterBrokerIds = params?.filterBrokerIds ?? [];
      const brokerParam =
        filterBrokerIds.length > 0
          ? `&filter_broker_ids=${filterBrokerIds.join(",")}`
          : "";
      const { data } = await axios.get<GetBrokerMetricsResponse>(
        `/api/dashboard/broker-metrics?year=${year}&month=${month}${brokerParam}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.metrics;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch broker metrics",
      );
    }
  },
);

export const updateBrokerMetrics = createAsyncThunk(
  "dashboard/updateBrokerMetrics",
  async (
    payload: UpdateBrokerMetricsRequest,
    { getState, rejectWithValue, dispatch },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.put("/api/dashboard/broker-metrics", payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      // Refresh metrics after update
      dispatch(
        fetchBrokerMetrics({ year: payload.year, month: payload.month }),
      );
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update broker metrics",
      );
    }
  },
);

export const fetchAnnualMetrics = createAsyncThunk(
  "dashboard/fetchAnnualMetrics",
  async (
    params: { year?: number; filterBrokerIds?: number[] } = {},
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const now = new Date();
      const year = params?.year ?? now.getFullYear();
      const filterBrokerIds = params?.filterBrokerIds ?? [];
      const brokerParam =
        filterBrokerIds.length > 0
          ? `&filter_broker_ids=${filterBrokerIds.join(",")}`
          : "";
      const { data } = await axios.get<GetAnnualMetricsResponse>(
        `/api/dashboard/broker-metrics/annual?year=${year}${brokerParam}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.annual;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch annual metrics",
      );
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardStats: (state) => {
      state.stats = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBrokerMetrics.pending, (state) => {
        state.metricsLoading = true;
        state.metricsError = null;
      })
      .addCase(fetchBrokerMetrics.fulfilled, (state, action) => {
        state.metricsLoading = false;
        state.brokerMetrics = action.payload;
      })
      .addCase(fetchBrokerMetrics.rejected, (state, action) => {
        state.metricsLoading = false;
        state.metricsError = action.payload as string;
      })
      .addCase(fetchAnnualMetrics.pending, (state) => {
        state.annualLoading = true;
        state.annualError = null;
      })
      .addCase(fetchAnnualMetrics.fulfilled, (state, action) => {
        state.annualLoading = false;
        state.annualMetrics = action.payload;
      })
      .addCase(fetchAnnualMetrics.rejected, (state, action) => {
        state.annualLoading = false;
        state.annualError = action.payload as string;
      });
  },
});

export const { clearDashboardStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;
