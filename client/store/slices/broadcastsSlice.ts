import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/store";
import type {
  RealtorBroadcast,
  RealtorBroadcastRecipient,
  BroadcastAudiencePreview,
  CreateBroadcastRequest,
  PreviewBroadcastAudienceRequest,
  GetBroadcastsResponse,
  GetBroadcastResponse,
  CreateBroadcastResponse,
  PreviewBroadcastAudienceResponse,
  GetBroadcastRecipientsResponse,
} from "@shared/api";

interface BroadcastsState {
  broadcasts: RealtorBroadcast[];
  broadcastsTotal: number;
  activeBroadcast: RealtorBroadcast | null;
  recipients: RealtorBroadcastRecipient[];
  recipientsTotal: number;
  audiencePreview: BroadcastAudiencePreview | null;
  isLoading: boolean;
  isSending: boolean;
  isPreviewing: boolean;
  error: string | null;
}

const initialState: BroadcastsState = {
  broadcasts: [],
  broadcastsTotal: 0,
  activeBroadcast: null,
  recipients: [],
  recipientsTotal: 0,
  audiencePreview: null,
  isLoading: false,
  isSending: false,
  isPreviewing: false,
  error: null,
};

function extractError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const apiError = (error.response?.data as { error?: string } | undefined)
      ?.error;
    return apiError || error.message || fallback;
  }
  return fallback;
}

export const fetchBroadcasts = createAsyncThunk(
  "broadcasts/fetchAll",
  async (params: { page?: number; limit?: number } | void, { getState }) => {
    const resolved = params ?? {};
    const { sessionToken } = (getState() as RootState).brokerAuth;
    const { data } = await axios.get<GetBroadcastsResponse>("/api/broadcasts", {
      headers: { Authorization: `Bearer ${sessionToken}` },
      params: resolved,
    });
    return data;
  },
);

export const fetchBroadcastDetail = createAsyncThunk(
  "broadcasts/fetchDetail",
  async (broadcastId: number, { getState }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    const { data } = await axios.get<GetBroadcastResponse>(
      `/api/broadcasts/${broadcastId}`,
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    );
    return data;
  },
);

export const previewBroadcastAudience = createAsyncThunk(
  "broadcasts/preview",
  async (payload: PreviewBroadcastAudienceRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<PreviewBroadcastAudienceResponse>(
        "/api/broadcasts/preview-audience",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to preview audience"));
    }
  },
);

export const createBroadcast = createAsyncThunk(
  "broadcasts/create",
  async (payload: CreateBroadcastRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<CreateBroadcastResponse>(
        "/api/broadcasts",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to create broadcast"));
    }
  },
);

export const cancelBroadcast = createAsyncThunk(
  "broadcasts/cancel",
  async (broadcastId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.post(
        `/api/broadcasts/${broadcastId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return broadcastId;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to cancel broadcast"));
    }
  },
);

export const fetchBroadcastRecipients = createAsyncThunk(
  "broadcasts/fetchRecipients",
  async (
    params: { broadcastId: number; page?: number; limit?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetBroadcastRecipientsResponse>(
        `/api/broadcasts/${params.broadcastId}/recipients`,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: { page: params.page, limit: params.limit },
        },
      );
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to load recipients"));
    }
  },
);

const broadcastsSlice = createSlice({
  name: "broadcasts",
  initialState,
  reducers: {
    clearAudiencePreview(state) {
      state.audiencePreview = null;
    },
    clearActiveBroadcast(state) {
      state.activeBroadcast = null;
      state.recipients = [];
      state.recipientsTotal = 0;
    },
    clearBroadcastError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBroadcasts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBroadcasts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.broadcasts = action.payload.broadcasts;
        state.broadcastsTotal = action.payload.total;
      })
      .addCase(fetchBroadcasts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to load broadcasts";
      })
      .addCase(fetchBroadcastDetail.fulfilled, (state, action) => {
        state.activeBroadcast = action.payload.broadcast;
      })
      .addCase(fetchBroadcastRecipients.fulfilled, (state, action) => {
        state.recipients = action.payload.recipients;
        state.recipientsTotal = action.payload.total;
      })
      .addCase(previewBroadcastAudience.pending, (state) => {
        state.isPreviewing = true;
        state.error = null;
      })
      .addCase(previewBroadcastAudience.fulfilled, (state, action) => {
        state.isPreviewing = false;
        state.audiencePreview = action.payload.preview;
      })
      .addCase(previewBroadcastAudience.rejected, (state, action) => {
        state.isPreviewing = false;
        state.error = (action.payload as string) || "Preview failed";
      })
      .addCase(createBroadcast.pending, (state) => {
        state.isSending = true;
        state.error = null;
      })
      .addCase(createBroadcast.fulfilled, (state) => {
        state.isSending = false;
      })
      .addCase(createBroadcast.rejected, (state, action) => {
        state.isSending = false;
        state.error = (action.payload as string) || "Create failed";
      })
      .addCase(cancelBroadcast.fulfilled, (state, action) => {
        const id = action.payload;
        state.broadcasts = state.broadcasts.map((b) =>
          b.id === id ? { ...b, status: "cancelled", is_cancelled: true } : b,
        );
        if (state.activeBroadcast?.id === id) {
          state.activeBroadcast = {
            ...state.activeBroadcast,
            status: "cancelled",
            is_cancelled: true,
          };
        }
      });
  },
});

export const {
  clearAudiencePreview,
  clearActiveBroadcast,
  clearBroadcastError,
} = broadcastsSlice.actions;

export default broadcastsSlice.reducer;
