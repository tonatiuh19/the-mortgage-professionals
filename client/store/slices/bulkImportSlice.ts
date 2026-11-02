import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/store";
import { initAdminSession } from "@/store/slices/brokerAuthSlice";
import type {
  BulkImportCommitOptions,
  BulkImportCommitResponse,
  BulkImportEntityType,
  BulkImportValidateResponse,
} from "@shared/api";
import type { BulkImportTableFilter } from "@shared/bulk-import";

export interface BulkImportPreviewState {
  jobId: number | null;
  entity: BulkImportEntityType | null;
  fileName: string | null;
  rowCount: number;
  willCreateCount: number;
  skippedCount: number;
  errorCount: number;
  previewRows: BulkImportValidateResponse["preview_rows"];
  breakdown: Record<string, number> | null;
  expiresAt: string | null;
}

interface BulkImportState {
  wizardOpen: boolean;
  wizardStep: 0 | 1 | 2 | 3 | 4;
  entity: BulkImportEntityType | null;
  preview: BulkImportPreviewState | null;
  commitResult: BulkImportCommitResponse | null;
  commitOptions: BulkImportCommitOptions;
  validating: boolean;
  committing: boolean;
  downloadingTemplate: boolean;
  bulkCsvImportEnabled: boolean;
  error: string | null;
  tableFilter: BulkImportTableFilter;
  searchQuery: string;
}

const initialState: BulkImportState = {
  wizardOpen: false,
  wizardStep: 0,
  entity: null,
  preview: null,
  commitResult: null,
  commitOptions: {
    link_phone_threads: true,
    send_welcome_emails: false,
  },
  validating: false,
  committing: false,
  downloadingTemplate: false,
  bulkCsvImportEnabled: false,
  error: null,
  tableFilter: "all",
  searchQuery: "",
};

export const downloadBulkImportTemplate = createAsyncThunk(
  "bulkImport/downloadTemplate",
  async (entity: BulkImportEntityType, { getState }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    const path =
      entity === "clients"
        ? "/api/admin/bulk-import/templates/clients.csv"
        : "/api/admin/bulk-import/templates/realtors.csv";
    const filename =
      entity === "clients"
        ? "tmp_clients_import_template.csv"
        : "tmp_realtors_import_template.csv";
    const response = await axios.get(path, {
      headers: { Authorization: `Bearer ${sessionToken}` },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return entity;
  },
);

export const validateBulkImport = createAsyncThunk(
  "bulkImport/validate",
  async (
    { file, entity }: { file: File; entity: BulkImportEntityType },
    { getState, rejectWithValue },
  ) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    const form = new FormData();
    form.append("file", file);
    form.append("entity", entity);
    try {
      const { data } = await axios.post<BulkImportValidateResponse>(
        "/api/admin/bulk-import/validate",
        form,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (!data.success) {
        return rejectWithValue(data.message || data.file_error || "Validation failed");
      }
      return { data, fileName: file.name, entity };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const body = err.response.data as BulkImportValidateResponse;
        return rejectWithValue(
          body.file_error || body.message || "Validation failed",
        );
      }
      return rejectWithValue(
        err instanceof Error ? err.message : "Validation failed",
      );
    }
  },
);

export const commitBulkImport = createAsyncThunk(
  "bulkImport/commit",
  async (
    {
      jobId,
      options,
    }: { jobId: number; options: BulkImportCommitOptions },
    { getState, rejectWithValue },
  ) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    try {
      const { data } = await axios.post<BulkImportCommitResponse>(
        `/api/admin/bulk-import/${jobId}/commit`,
        options,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      if (!data.success) {
        return rejectWithValue(data.message || "Import failed");
      }
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const body = err.response.data as BulkImportCommitResponse;
        return rejectWithValue(body.message || "Import failed");
      }
      return rejectWithValue(
        err instanceof Error ? err.message : "Import failed",
      );
    }
  },
);

const bulkImportSlice = createSlice({
  name: "bulkImport",
  initialState,
  reducers: {
    openBulkImportWizard(
      state,
      action: PayloadAction<BulkImportEntityType>,
    ) {
      state.wizardOpen = true;
      state.entity = action.payload;
      state.wizardStep = 0;
      state.preview = null;
      state.commitResult = null;
      state.error = null;
      state.tableFilter = "all";
      state.searchQuery = "";
      state.commitOptions = {
        link_phone_threads: true,
        send_welcome_emails: false,
      };
    },
    closeBulkImportWizard(state) {
      state.wizardOpen = false;
    },
    resetBulkImportWizard(state) {
      state.wizardStep = 0;
      state.preview = null;
      state.commitResult = null;
      state.error = null;
      state.tableFilter = "all";
      state.searchQuery = "";
    },
    setBulkImportStep(state, action: PayloadAction<0 | 1 | 2 | 3 | 4>) {
      state.wizardStep = action.payload;
    },
    setBulkImportTableFilter(state, action: PayloadAction<BulkImportTableFilter>) {
      state.tableFilter = action.payload;
    },
    setBulkImportSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setBulkImportCommitOptions(
      state,
      action: PayloadAction<Partial<BulkImportCommitOptions>>,
    ) {
      state.commitOptions = { ...state.commitOptions, ...action.payload };
    },
    clearBulkImportError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(downloadBulkImportTemplate.pending, (state) => {
        state.downloadingTemplate = true;
        state.error = null;
      })
      .addCase(downloadBulkImportTemplate.fulfilled, (state) => {
        state.downloadingTemplate = false;
      })
      .addCase(downloadBulkImportTemplate.rejected, (state, action) => {
        state.downloadingTemplate = false;
        state.error = action.error.message || "Failed to download template";
      })
      .addCase(validateBulkImport.pending, (state) => {
        state.validating = true;
        state.error = null;
      })
      .addCase(validateBulkImport.fulfilled, (state, action) => {
        state.validating = false;
        const { data, fileName, entity } = action.payload;
        state.preview = {
          jobId: data.job_id ?? null,
          entity,
          fileName,
          rowCount: data.row_count ?? 0,
          willCreateCount: data.will_create_count ?? 0,
          skippedCount: data.skipped_count ?? 0,
          errorCount: data.error_count ?? 0,
          previewRows: data.preview_rows ?? [],
          breakdown: data.breakdown ?? null,
          expiresAt: data.expires_at ?? null,
        };
        state.wizardStep = 2;
      })
      .addCase(validateBulkImport.rejected, (state, action) => {
        state.validating = false;
        state.error = (action.payload as string) || action.error.message || "Validation failed";
      })
      .addCase(commitBulkImport.pending, (state) => {
        state.committing = true;
        state.error = null;
      })
      .addCase(commitBulkImport.fulfilled, (state, action) => {
        state.committing = false;
        state.commitResult = action.payload;
        state.wizardStep = 4;
      })
      .addCase(commitBulkImport.rejected, (state, action) => {
        state.committing = false;
        state.error = (action.payload as string) || action.error.message || "Import failed";
      });

    builder.addCase(initAdminSession.fulfilled, (state, action) => {
      state.bulkCsvImportEnabled = !!action.payload.bulk_csv_import_enabled;
      if (!action.payload.bulk_csv_import_enabled && state.wizardOpen) {
        state.wizardOpen = false;
      }
    });
  },
});

export const {
  openBulkImportWizard,
  closeBulkImportWizard,
  resetBulkImportWizard,
  setBulkImportStep,
  setBulkImportTableFilter,
  setBulkImportSearchQuery,
  setBulkImportCommitOptions,
  clearBulkImportError,
} = bulkImportSlice.actions;

export default bulkImportSlice.reducer;
