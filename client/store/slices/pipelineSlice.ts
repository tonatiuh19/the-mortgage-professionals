import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetLoansResponse,
  CreateLoanRequest,
  CreateLoanResponse,
  GetLoanDetailsResponse,
  LoanDetails,
} from "@shared/api";

interface LoanFilters {
  status?: string;
  priority?: string;
  loanType?: string;
  dateRange?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface LoanDraft {
  formData: {
    client_email: string;
    client_first_name: string;
    client_last_name: string;
    client_phone: string;
    loan_type: string;
    loan_amount: string;
    property_value: string;
    down_payment: string;
    loan_purpose: string;
    property_address: string;
    property_city: string;
    property_state: string;
    property_zip: string;
    property_type: string;
    estimated_close_date: string;
    notes: string;
  };
  tasks: Array<{
    template_id?: number;
    title: string;
    description: string;
    task_type: string;
    priority: string;
    due_days: number;
  }>;
  currentStep: number;
  savedAt: string;
}

interface PipelineState {
  loans: GetLoansResponse["loans"];
  selectedLoan: LoanDetails | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  loanDraft: LoanDraft | null;
  pagination: PaginationInfo | null;
  activeFilters: LoanFilters;
}

const initialState: PipelineState = {
  loans: [],
  selectedLoan: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  loanDraft: null,
  pagination: null,
  activeFilters: {},
};

export const fetchLoans = createAsyncThunk(
  "pipeline/fetchLoans",
  async (filters: LoanFilters = {}, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });

      const { data } = await axios.get<GetLoansResponse>(
        `/api/loans?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );

      return {
        loans: data.loans,
        pagination: data.pagination,
        filters,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch loans",
      );
    }
  },
);

export const createLoan = createAsyncThunk(
  "pipeline/createLoan",
  async (payload: CreateLoanRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<CreateLoanResponse>(
        "/api/loans/create",
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create loan application",
      );
    }
  },
);

export const fetchLoanDetails = createAsyncThunk(
  "pipeline/fetchLoanDetails",
  async (loanId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetLoanDetailsResponse>(
        `/api/loans/${loanId}`,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.loan;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch loan details",
      );
    }
  },
);

const pipelineSlice = createSlice({
  name: "pipeline",
  initialState,
  reducers: {
    clearLoans: (state) => {
      state.loans = [];
      state.error = null;
      state.pagination = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<LoanFilters>>) => {
      state.activeFilters = { ...state.activeFilters, ...action.payload };
    },
    clearFilters: (state) => {
      state.activeFilters = {};
    },
    saveLoanDraft: (state, action: PayloadAction<LoanDraft>) => {
      state.loanDraft = action.payload;
    },
    clearLoanDraft: (state) => {
      state.loanDraft = null;
    },
    clearSelectedLoan: (state) => {
      state.selectedLoan = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loans = action.payload.loans;
        state.pagination = action.payload.pagination;
        state.activeFilters = action.payload.filters;
      })
      .addCase(fetchLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createLoan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLoan.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchLoanDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(fetchLoanDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedLoan = action.payload;
      })
      .addCase(fetchLoanDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearLoans,
  updateFilters,
  clearFilters,
  saveLoanDraft,
  clearLoanDraft,
  clearSelectedLoan,
} = pipelineSlice.actions;
export default pipelineSlice.reducer;
