import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type { ContactSubmission } from "@shared/api";

interface ContactSubmissionsState {
  submissions: ContactSubmission[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ContactSubmissionsState = {
  submissions: [],
  isLoading: false,
  error: null,
};

export const fetchContactSubmissions = createAsyncThunk(
  "contactSubmissions/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/contact", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.submissions as ContactSubmission[];
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
        state.submissions = action.payload;
      })
      .addCase(fetchContactSubmissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = contactSubmissionsSlice.actions;
export default contactSubmissionsSlice.reducer;
