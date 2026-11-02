import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/store";
import type {
  BlockedPhoneNumber,
  CreateBlockedPhoneNumberRequest,
  CreateBlockedPhoneNumberResponse,
  DeleteBlockedPhoneNumberResponse,
  ListBlockedPhoneNumbersResponse,
} from "@shared/api";

interface BlockedNumbersState {
  items: BlockedPhoneNumber[];
  loaded: boolean;
  loading: boolean;
  saving: boolean;
  removingId: number | null;
  error: string | null;
}

const initialState: BlockedNumbersState = {
  items: [],
  loaded: false,
  loading: false,
  saving: false,
  removingId: null,
  error: null,
};

const errorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.error || err?.message || fallback;

export const fetchBlockedNumbers = createAsyncThunk(
  "blockedNumbers/fetch",
  async (_, { getState, rejectWithValue }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    try {
      const { data } = await axios.get<ListBlockedPhoneNumbersResponse>(
        "/api/blocked-numbers",
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to load blocked numbers");
      }
      return data.blocked_numbers;
    } catch (err: any) {
      return rejectWithValue(
        errorMessage(err, "Failed to load blocked numbers"),
      );
    }
  },
);

export const blockPhoneNumber = createAsyncThunk(
  "blockedNumbers/create",
  async (
    payload: CreateBlockedPhoneNumberRequest,
    { getState, rejectWithValue },
  ) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    try {
      const { data } = await axios.post<CreateBlockedPhoneNumberResponse>(
        "/api/blocked-numbers",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      if (!data.success || !data.blocked_number) {
        return rejectWithValue(data.error || "Failed to block number");
      }
      return data.blocked_number;
    } catch (err: any) {
      return rejectWithValue(errorMessage(err, "Failed to block number"));
    }
  },
);

export const unblockPhoneNumber = createAsyncThunk(
  "blockedNumbers/delete",
  async (id: number, { getState, rejectWithValue }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    try {
      const { data } = await axios.delete<DeleteBlockedPhoneNumberResponse>(
        `/api/blocked-numbers/${id}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      if (!data.success) {
        return rejectWithValue(data.error || "Failed to unblock number");
      }
      return id;
    } catch (err: any) {
      return rejectWithValue(errorMessage(err, "Failed to unblock number"));
    }
  },
);

const blockedNumbersSlice = createSlice({
  name: "blockedNumbers",
  initialState,
  reducers: {
    clearBlockedNumbersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlockedNumbers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlockedNumbers.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.items = action.payload;
      })
      .addCase(fetchBlockedNumbers.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload || action.error.message);
      })
      .addCase(blockPhoneNumber.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(blockPhoneNumber.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [
          action.payload,
          ...state.items.filter((b) => b.id !== action.payload.id),
        ];
      })
      .addCase(blockPhoneNumber.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload || action.error.message);
      })
      .addCase(unblockPhoneNumber.pending, (state, action) => {
        state.removingId = action.meta.arg;
        state.error = null;
      })
      .addCase(unblockPhoneNumber.fulfilled, (state, action) => {
        state.removingId = null;
        state.items = state.items.filter((b) => b.id !== action.payload);
      })
      .addCase(unblockPhoneNumber.rejected, (state, action) => {
        state.removingId = null;
        state.error = String(action.payload || action.error.message);
      });
  },
});

/** Last-10-digit match against the loaded block list. */
export const selectIsPhoneBlocked = (
  state: RootState,
  phone: string | null | undefined,
): boolean => {
  const last10 = (phone ?? "").replace(/\D/g, "").slice(-10);
  if (last10.length !== 10) return false;
  return state.blockedNumbers.items.some((b) => b.normalized_phone === last10);
};

export const { clearBlockedNumbersError } = blockedNumbersSlice.actions;
export default blockedNumbersSlice.reducer;
