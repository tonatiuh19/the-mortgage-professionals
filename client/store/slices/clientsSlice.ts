import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type { GetClientsResponse } from "@shared/api";

interface ClientsState {
  clients: GetClientsResponse["clients"];
  isLoading: boolean;
  error: string | null;
}

const initialState: ClientsState = {
  clients: [],
  isLoading: false,
  error: null,
};

export const fetchClients = createAsyncThunk(
  "clients/fetchClients",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetClientsResponse>("/api/clients", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.clients;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch clients",
      );
    }
  },
);

const clientsSlice = createSlice({
  name: "clients",
  initialState,
  reducers: {
    clearClients: (state) => {
      state.clients = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.isLoading = false;
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearClients } = clientsSlice.actions;
export default clientsSlice.reducer;
