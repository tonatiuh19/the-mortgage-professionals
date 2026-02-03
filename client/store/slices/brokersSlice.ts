import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type {
  GetBrokersResponse,
  Broker,
  CreateBrokerRequest,
  UpdateBrokerRequest,
  BrokerResponse,
} from "@shared/api";
import type { RootState } from "../index";

interface BrokersState {
  brokers: Broker[];
  isLoading: boolean;
  error: string | null;
}

const initialState: BrokersState = {
  brokers: [],
  isLoading: false,
  error: null,
};

export const fetchBrokers = createAsyncThunk(
  "brokers/fetchBrokers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetBrokersResponse>("/api/brokers", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.brokers;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch brokers",
      );
    }
  },
);

export const createBroker = createAsyncThunk(
  "brokers/createBroker",
  async (payload: CreateBrokerRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<BrokerResponse>(
        "/api/brokers",
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.broker;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create broker",
      );
    }
  },
);

export const updateBroker = createAsyncThunk(
  "brokers/updateBroker",
  async (
    { id, ...payload }: UpdateBrokerRequest & { id: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<BrokerResponse>(
        `/api/brokers/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.broker;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update broker",
      );
    }
  },
);

export const deleteBroker = createAsyncThunk(
  "brokers/deleteBroker",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/brokers/${id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete broker",
      );
    }
  },
);

const brokersSlice = createSlice({
  name: "brokers",
  initialState,
  reducers: {
    clearBrokers: (state) => {
      state.brokers = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch brokers
      .addCase(fetchBrokers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBrokers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brokers = action.payload;
      })
      .addCase(fetchBrokers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create broker
      .addCase(createBroker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBroker.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brokers.push(action.payload);
      })
      .addCase(createBroker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update broker
      .addCase(updateBroker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBroker.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.brokers.findIndex(
          (b) => b.id === action.payload.id,
        );
        if (index !== -1) {
          state.brokers[index] = action.payload;
        }
      })
      .addCase(updateBroker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete broker
      .addCase(deleteBroker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBroker.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brokers = state.brokers.filter((b) => b.id !== action.payload);
      })
      .addCase(deleteBroker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBrokers } = brokersSlice.actions;
export default brokersSlice.reducer;
