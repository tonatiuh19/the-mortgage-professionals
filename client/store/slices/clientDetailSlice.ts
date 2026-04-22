import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetClientDetailProfileResponse,
  UpdateClientRequest,
} from "@shared/api";

interface ClientDetailState {
  profile: GetClientDetailProfileResponse | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: ClientDetailState = {
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

export const fetchClientProfile = createAsyncThunk(
  "clientDetail/fetchClientProfile",
  async (clientId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetClientDetailProfileResponse>(
        `/api/clients/${clientId}/profile`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch client profile",
      );
    }
  },
);

export const updateClientProfile = createAsyncThunk(
  "clientDetail/updateClientProfile",
  async (
    { clientId, payload }: { clientId: number; payload: UpdateClientRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put(`/api/clients/${clientId}`, payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update client",
      );
    }
  },
);

const clientDetailSlice = createSlice({
  name: "clientDetail",
  initialState,
  reducers: {
    clearClientDetail(state) {
      state.profile = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClientProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchClientProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateClientProfile.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateClientProfile.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(updateClientProfile.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearClientDetail } = clientDetailSlice.actions;
export default clientDetailSlice.reducer;
