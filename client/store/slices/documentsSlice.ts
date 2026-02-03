import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

interface Document {
  id: number;
  task_id: number;
  field_id: number | null;
  document_type: "pdf" | "image";
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  uploaded_by_user_id: number | null;
  uploaded_by_broker_id: number | null;
  uploaded_at: string;
  notes: string | null;
  task_title: string;
  task_type: string;
  task_status: string;
  application_number: string;
  broker_id: number;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  broker_first_name: string | null;
  broker_last_name: string | null;
}

interface DocumentsState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterType: "all" | "pdf" | "image";
  filterBroker: number | null;
}

const initialState: DocumentsState = {
  documents: [],
  isLoading: false,
  error: null,
  searchQuery: "",
  filterType: "all",
  filterBroker: null,
};

/**
 * Fetch all documents
 * Admin: sees all documents from all brokers
 * Regular broker: sees only their own documents
 */
export const fetchAllDocuments = createAsyncThunk(
  "documents/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;

      const response = await axios.get("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.documents;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch documents",
      );
    }
  },
);

/**
 * Delete document
 */
export const deleteDocument = createAsyncThunk(
  "documents/delete",
  async (documentId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;

      await axios.delete(`/api/tasks/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return documentId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete document",
      );
    }
  },
);

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilterType: (state, action) => {
      state.filterType = action.payload;
    },
    setFilterBroker: (state, action) => {
      state.filterBroker = action.payload;
    },
    clearFilters: (state) => {
      state.searchQuery = "";
      state.filterType = "all";
      state.filterBroker = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all documents
      .addCase(fetchAllDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.documents = action.payload;
      })
      .addCase(fetchAllDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete document
      .addCase(deleteDocument.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.isLoading = false;
        state.documents = state.documents.filter(
          (doc) => doc.id !== action.payload,
        );
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, setFilterType, setFilterBroker, clearFilters } =
  documentsSlice.actions;

export default documentsSlice.reducer;
