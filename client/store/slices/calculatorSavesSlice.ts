import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  ApplyCalculatorSaveNoteRequest,
  ApplyCalculatorSaveNoteResponse,
  BrokerCalculatorSave,
  CalculatorSaveResponse,
  CreateCalculatorSaveRequest,
  DeleteCalculatorSaveResponse,
  GetClientOpenLoansResponse,
  ListCalculatorSavesRequest,
  ListCalculatorSavesResponse,
  PaginationInfo,
  UpdateCalculatorSaveRequest,
  ClientOpenLoanSummary,
} from "@shared/api";

interface CalculatorSavesState {
  saves: BrokerCalculatorSave[];
  pagination: PaginationInfo | null;
  current: BrokerCalculatorSave | null;
  openLoans: ClientOpenLoanSummary[];
  isLoading: boolean;
  isSaving: boolean;
  isApplying: boolean;
  error: string | null;
}

const initialState: CalculatorSavesState = {
  saves: [],
  pagination: null,
  current: null,
  openLoans: [],
  isLoading: false,
  isSaving: false,
  isApplying: false,
  error: null,
};

function authHeaders(token: string | null) {
  return { Authorization: `Bearer ${token}` };
}

export const fetchCalculatorSaves = createAsyncThunk(
  "calculatorSaves/fetchList",
  async (
    params: ListCalculatorSavesRequest | void,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<ListCalculatorSavesResponse>(
        "/api/calculator-saves",
        {
          headers: authHeaders(sessionToken),
          params: params ?? {},
        },
      );
      return { saves: data.saves, pagination: data.pagination };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load calculator saves",
      );
    }
  },
);

export const fetchCalculatorSave = createAsyncThunk(
  "calculatorSaves/fetchOne",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<CalculatorSaveResponse>(
        `/api/calculator-saves/${id}`,
        { headers: authHeaders(sessionToken) },
      );
      return data.save;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load calculator save",
      );
    }
  },
);

export const createCalculatorSave = createAsyncThunk(
  "calculatorSaves/create",
  async (payload: CreateCalculatorSaveRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<CalculatorSaveResponse>(
        "/api/calculator-saves",
        payload,
        { headers: authHeaders(sessionToken) },
      );
      return data.save;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to save calculation",
      );
    }
  },
);

export const updateCalculatorSave = createAsyncThunk(
  "calculatorSaves/update",
  async (
    { id, payload }: { id: number; payload: UpdateCalculatorSaveRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<CalculatorSaveResponse>(
        `/api/calculator-saves/${id}`,
        payload,
        { headers: authHeaders(sessionToken) },
      );
      return data.save;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update calculation",
      );
    }
  },
);

export const deleteCalculatorSave = createAsyncThunk(
  "calculatorSaves/delete",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete<DeleteCalculatorSaveResponse>(
        `/api/calculator-saves/${id}`,
        { headers: authHeaders(sessionToken) },
      );
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete calculation",
      );
    }
  },
);

export const applyCalculatorSaveNote = createAsyncThunk(
  "calculatorSaves/applyNote",
  async (
    {
      id,
      payload,
    }: { id: number; payload?: ApplyCalculatorSaveNoteRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<ApplyCalculatorSaveNoteResponse>(
        `/api/calculator-saves/${id}/apply-note`,
        payload ?? {},
        { headers: authHeaders(sessionToken) },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to append calculator note",
      );
    }
  },
);

export const fetchClientOpenLoans = createAsyncThunk(
  "calculatorSaves/fetchClientOpenLoans",
  async (clientId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetClientOpenLoansResponse>(
        `/api/clients/${clientId}/open-loans`,
        { headers: authHeaders(sessionToken) },
      );
      return data.loans;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load client loans",
      );
    }
  },
);

const calculatorSavesSlice = createSlice({
  name: "calculatorSaves",
  initialState,
  reducers: {
    clearCalculatorSavesError(state) {
      state.error = null;
    },
    clearCurrentCalculatorSave(state) {
      state.current = null;
    },
    clearClientOpenLoans(state) {
      state.openLoans = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalculatorSaves.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCalculatorSaves.fulfilled, (state, action) => {
        state.isLoading = false;
        state.saves = action.payload.saves;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCalculatorSaves.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCalculatorSave.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createCalculatorSave.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createCalculatorSave.fulfilled, (state, action) => {
        state.isSaving = false;
        state.current = action.payload;
        state.saves = [action.payload, ...state.saves];
      })
      .addCase(createCalculatorSave.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(updateCalculatorSave.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateCalculatorSave.fulfilled, (state, action) => {
        state.isSaving = false;
        state.current = action.payload;
        state.saves = state.saves.map((s) =>
          s.id === action.payload.id ? action.payload : s,
        );
      })
      .addCase(updateCalculatorSave.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCalculatorSave.fulfilled, (state, action) => {
        state.saves = state.saves.filter((s) => s.id !== action.payload);
        if (state.current?.id === action.payload) state.current = null;
      })
      .addCase(applyCalculatorSaveNote.pending, (state) => {
        state.isApplying = true;
      })
      .addCase(applyCalculatorSaveNote.fulfilled, (state) => {
        state.isApplying = false;
      })
      .addCase(applyCalculatorSaveNote.rejected, (state, action) => {
        state.isApplying = false;
        state.error = action.payload as string;
      })
      .addCase(fetchClientOpenLoans.fulfilled, (state, action) => {
        state.openLoans = action.payload;
      })
      .addCase(fetchClientOpenLoans.rejected, (state) => {
        state.openLoans = [];
      });
  },
});

export const {
  clearCalculatorSavesError,
  clearCurrentCalculatorSave,
  clearClientOpenLoans,
} = calculatorSavesSlice.actions;

export default calculatorSavesSlice.reducer;
