import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type { PaginationInfo } from "@shared/api";

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
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterType: "all" | "pdf" | "image";
  filterBroker: number | null;
}

const initialState: DocumentsState = {
  documents: [],
  pagination: null,
  isLoading: false,
  error: null,
  searchQuery: "",
  filterType: "all",
  filterBroker: null,
};

interface FetchDocumentsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  filterType?: string;
}

export const fetchAllDocuments = createAsyncThunk(
  "documents/fetchAll",
  async (
    params: FetchDocumentsParams | void,
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      const response = await axios.get("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
        params: params ?? {},
      });
      return {
        documents: response.data.documents,
        pagination: response.data.pagination as PaginationInfo,
      };
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
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function axiosBlobErrorMessage(error: any): Promise<string> {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
    } catch {
      /* ignore */
    }
  }
  if (typeof data?.error === "string") return data.error;
  if (typeof error?.message === "string") return error.message;
  return "Download failed";
}

/** Download one document with semantic filename (LA#_ID.pdf / Seguro / Bank). */
export const downloadDocumentLabeled = createAsyncThunk(
  "documents/downloadLabeled",
  async (documentId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      const response = await axios.get(
        `/api/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );
      const contentType = String(response.headers["content-type"] || "");
      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        try {
          const parsed = JSON.parse(text);
          return rejectWithValue(parsed.error || "Download failed");
        } catch {
          return rejectWithValue("Download failed");
        }
      }
      const disposition = String(response.headers["content-disposition"] || "");
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || `document_${documentId}.pdf`;
      triggerBrowserDownload(response.data as Blob, filename);
      return documentId;
    } catch (error: any) {
      return rejectWithValue(await axiosBlobErrorMessage(error));
    }
  },
);

/** Zip download for selected ids or all docs on a loan. */
export const bulkDownloadDocuments = createAsyncThunk(
  "documents/bulkDownload",
  async (
    payload: { document_ids?: number[]; application_id?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.brokerAuth.sessionToken;
      const response = await axios.post("/api/documents/bulk-download", payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const contentType = String(response.headers["content-type"] || "");
      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        try {
          const parsed = JSON.parse(text);
          return rejectWithValue(parsed.error || "Failed to download zip");
        } catch {
          return rejectWithValue("Failed to download zip");
        }
      }
      const disposition = String(response.headers["content-disposition"] || "");
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || "documents.zip";
      triggerBrowserDownload(response.data as Blob, filename);
      return true;
    } catch (error: any) {
      return rejectWithValue(await axiosBlobErrorMessage(error));
    }
  },
);

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
        state.documents = action.payload.documents;
        state.pagination = action.payload.pagination;
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
