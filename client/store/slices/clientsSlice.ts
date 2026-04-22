import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetClientsResponse,
  CreateClientRequest,
  CreateClientResponse,
  UpdateClientRequest,
  UpdateClientResponse,
  ConvertClientToBrokerRequest,
  ConvertClientToBrokerResponse,
  PaginationInfo,
} from "@shared/api";
import { logger } from "@/lib/logger";

interface FetchClientsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  source?: string;
}

interface ClientsState {
  clients: GetClientsResponse["clients"];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ClientsState = {
  clients: [],
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchClients = createAsyncThunk(
  "clients/fetchClients",
  async (params: FetchClientsParams = {}, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetClientsResponse>("/api/clients", {
        headers: { Authorization: `Bearer ${sessionToken}` },
        params,
      });
      return { clients: data.clients, pagination: data.pagination };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch clients",
      );
    }
  },
);

export const deleteClient = createAsyncThunk(
  "clients/deleteClient",
  async (clientId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      logger.info(`[deleteClient] Sending DELETE /api/clients/${clientId}`);
      const { data } = await axios.delete(`/api/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      logger.info(`[deleteClient] Success:`, data);
      return { clientId, message: data.message };
    } catch (error: any) {
      const errMsg = error.response?.data?.error || "Failed to delete client";
      logger.error(
        `[deleteClient] Failed (${error.response?.status}):`,
        error.response?.data,
      );
      return rejectWithValue(errMsg);
    }
  },
);

export const createClient = createAsyncThunk(
  "clients/createClient",
  async (payload: CreateClientRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<CreateClientResponse>(
        "/api/clients",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.client;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create client",
      );
    }
  },
);

export const updateClient = createAsyncThunk(
  "clients/updateClient",
  async (
    { clientId, payload }: { clientId: number; payload: UpdateClientRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<UpdateClientResponse>(
        `/api/clients/${clientId}`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.client;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update client",
      );
    }
  },
);

export const convertClientToBroker = createAsyncThunk(
  "clients/convertClientToBroker",
  async (
    {
      clientId,
      payload,
    }: { clientId: number; payload: ConvertClientToBrokerRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<ConvertClientToBrokerResponse>(
        `/api/clients/${clientId}/convert-to-broker`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { clientId, ...data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to convert client to broker",
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
        state.clients = action.payload.clients;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(
          (client) => client.id !== action.payload.clientId,
        );
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.clients = [action.payload, ...state.clients];
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.clients.findIndex((c) => c.id === updated.id);
        if (idx !== -1) {
          state.clients[idx] = { ...state.clients[idx], ...updated };
        }
      })
      .addCase(convertClientToBroker.fulfilled, (state, action) => {
        // Remove the converted (now inactive) client from the list
        state.clients = state.clients.filter(
          (c) => c.id !== action.payload.clientId,
        );
      });
  },
});

export const { clearClients } = clientsSlice.actions;
export default clientsSlice.reducer;
