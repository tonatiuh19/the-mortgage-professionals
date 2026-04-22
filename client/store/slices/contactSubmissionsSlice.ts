import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type { ContactSubmission, PaginationInfo } from "@shared/api";

interface FetchContactParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
}

interface ContactSubmissionsState {
  submissions: ContactSubmission[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ContactSubmissionsState = {
  submissions: [],
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchContactSubmissions = createAsyncThunk(
  "contactSubmissions/fetchAll",
  async (params: FetchContactParams = {}, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/contact", {
        headers: { Authorization: `Bearer ${sessionToken}` },
        params,
      });
      return {
        submissions: data.submissions as ContactSubmission[],
        pagination: data.pagination as PaginationInfo,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch contact submissions",
      );
    }
  },
);

const contactSubmissionsSlice = createSlice({
  name: "contactSubmissions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContactSubmissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContactSubmissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.submissions = action.payload.submissions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchContactSubmissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = contactSubmissionsSlice.actions;
export default contactSubmissionsSlice.reducer;
