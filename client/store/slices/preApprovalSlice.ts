import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  PreApprovalLetter,
  CreatePreApprovalLetterRequest,
  UpdatePreApprovalLetterRequest,
} from "@shared/api";

interface PreApprovalState {
  /** Keyed by loanId */
  letters: Record<number, PreApprovalLetter | null>;
  loadingLoanIds: number[];
  savingLoanIds: number[];
  error: string | null;
}

const initialState: PreApprovalState = {
  letters: {},
  loadingLoanIds: [],
  savingLoanIds: [],
  error: null,
};

// ── Thunks ──────────────────────────────────────────────────────────────────

export const fetchPreApprovalLetter = createAsyncThunk(
  "preApproval/fetch",
  async (loanId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      const { data } = await axios.get<{
        success: boolean;
        letter: PreApprovalLetter | null;
      }>(`/api/loans/${loanId}/pre-approval-letter`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { loanId, letter: data.letter };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch pre-approval letter",
      );
    }
  },
);

export const createPreApprovalLetter = createAsyncThunk(
  "preApproval/create",
  async (
    {
      loanId,
      payload,
    }: { loanId: number; payload: CreatePreApprovalLetterRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      const { data } = await axios.post<{
        success: boolean;
        letter: PreApprovalLetter;
        message: string;
      }>(`/api/loans/${loanId}/pre-approval-letter`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { loanId, letter: data.letter };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create pre-approval letter",
      );
    }
  },
);

export const updatePreApprovalLetter = createAsyncThunk(
  "preApproval/update",
  async (
    {
      loanId,
      payload,
    }: { loanId: number; payload: UpdatePreApprovalLetterRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      const { data } = await axios.put<{
        success: boolean;
        letter: PreApprovalLetter;
        message: string;
      }>(`/api/loans/${loanId}/pre-approval-letter`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { loanId, letter: data.letter };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update pre-approval letter",
      );
    }
  },
);

export const deletePreApprovalLetter = createAsyncThunk(
  "preApproval/delete",
  async (loanId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      await axios.delete(`/api/loans/${loanId}/pre-approval-letter`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { loanId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete pre-approval letter",
      );
    }
  },
);

// ── Slice ────────────────────────────────────────────────────────────────────

const preApprovalSlice = createSlice({
  name: "preApproval",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearLetter(state, action: PayloadAction<number>) {
      delete state.letters[action.payload];
    },
  },
  extraReducers: (builder) => {
    // fetch
    builder.addCase(fetchPreApprovalLetter.pending, (state, action) => {
      const loanId = action.meta.arg;
      if (!state.loadingLoanIds.includes(loanId))
        state.loadingLoanIds.push(loanId);
    });
    builder.addCase(fetchPreApprovalLetter.fulfilled, (state, action) => {
      const { loanId, letter } = action.payload;
      state.letters[loanId] = letter;
      state.loadingLoanIds = state.loadingLoanIds.filter((id) => id !== loanId);
    });
    builder.addCase(fetchPreApprovalLetter.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loadingLoanIds = state.loadingLoanIds.filter(
        (id) => id !== action.meta.arg,
      );
    });

    // create
    builder.addCase(createPreApprovalLetter.pending, (state, action) => {
      const loanId = action.meta.arg.loanId;
      if (!state.savingLoanIds.includes(loanId))
        state.savingLoanIds.push(loanId);
    });
    builder.addCase(createPreApprovalLetter.fulfilled, (state, action) => {
      const { loanId, letter } = action.payload;
      state.letters[loanId] = letter;
      state.savingLoanIds = state.savingLoanIds.filter((id) => id !== loanId);
    });
    builder.addCase(createPreApprovalLetter.rejected, (state, action) => {
      state.error = action.payload as string;
      state.savingLoanIds = state.savingLoanIds.filter(
        (id) => id !== action.meta.arg.loanId,
      );
    });

    // update
    builder.addCase(updatePreApprovalLetter.pending, (state, action) => {
      const loanId = action.meta.arg.loanId;
      if (!state.savingLoanIds.includes(loanId))
        state.savingLoanIds.push(loanId);
    });
    builder.addCase(updatePreApprovalLetter.fulfilled, (state, action) => {
      const { loanId, letter } = action.payload;
      state.letters[loanId] = letter;
      state.savingLoanIds = state.savingLoanIds.filter((id) => id !== loanId);
    });
    builder.addCase(updatePreApprovalLetter.rejected, (state, action) => {
      state.error = action.payload as string;
      state.savingLoanIds = state.savingLoanIds.filter(
        (id) => id !== action.meta.arg.loanId,
      );
    });

    // delete
    builder.addCase(deletePreApprovalLetter.pending, (state, action) => {
      const loanId = action.meta.arg;
      if (!state.savingLoanIds.includes(loanId))
        state.savingLoanIds.push(loanId);
    });
    builder.addCase(deletePreApprovalLetter.fulfilled, (state, action) => {
      const { loanId } = action.payload;
      state.letters[loanId] = null;
      state.savingLoanIds = state.savingLoanIds.filter((id) => id !== loanId);
    });
    builder.addCase(deletePreApprovalLetter.rejected, (state, action) => {
      state.error = action.payload as string;
      state.savingLoanIds = state.savingLoanIds.filter(
        (id) => id !== action.meta.arg,
      );
    });
  },
});

export const { clearError, clearLetter } = preApprovalSlice.actions;
export default preApprovalSlice.reducer;
