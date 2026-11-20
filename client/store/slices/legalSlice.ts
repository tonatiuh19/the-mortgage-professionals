import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type {
  AdminLegalDoc,
  AdminLegalResponse,
  LegalCompanyDetails,
  LegalDocKey,
  PublicLegalDocResponse,
} from "@shared/legal";
import type { RootState } from "../index";

type SaveState = "idle" | "saving" | "saved" | "error";

interface LegalState {
  publicDocs: Partial<Record<LegalDocKey, PublicLegalDocResponse>>;
  publicStatus: Partial<Record<LegalDocKey, "loading" | "loaded" | "failed">>;
  details: LegalCompanyDetails | null;
  docs: AdminLegalDoc[];
  adminLoading: boolean;
  detailsSaving: boolean;
  draftSave: Partial<Record<LegalDocKey, SaveState>>;
  draftSavedAt: Partial<Record<LegalDocKey, string>>;
  publishing: LegalDocKey | null;
  error: string | null;
}

const initialState: LegalState = {
  publicDocs: {},
  publicStatus: {},
  details: null,
  docs: [],
  adminLoading: false,
  detailsSaving: false,
  draftSave: {},
  draftSavedAt: {},
  publishing: null,
  error: null,
};

const auth = (getState: () => unknown) => ({
  headers: { Authorization: `Bearer ${(getState() as RootState).brokerAuth.sessionToken}` },
});
const errorText = (e: any, fallback: string): string =>
  e?.response?.data?.error || e?.response?.data?.message || fallback;

export const fetchPublicLegalDoc = createAsyncThunk(
  "legal/fetchPublic",
  async (docKey: LegalDocKey, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<PublicLegalDocResponse>(`/api/public/legal/${docKey}`);
      return data;
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to load document"));
    }
  },
);

export const fetchAdminLegal = createAsyncThunk(
  "legal/fetchAdmin",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<AdminLegalResponse>("/api/admin/legal", auth(getState));
      return data;
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to load legal pages"));
    }
  },
);

export const saveLegalDetails = createAsyncThunk(
  "legal/saveDetails",
  async (details: LegalCompanyDetails, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put<AdminLegalResponse>("/api/admin/legal/details", details, auth(getState));
      return data;
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to save company details"));
    }
  },
);

export const saveLegalDraft = createAsyncThunk(
  "legal/saveDraft",
  async (p: { docKey: LegalDocKey; markdown: string }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put<{ saved_at: string }>(
        `/api/admin/legal/${p.docKey}/draft`,
        { markdown: p.markdown },
        auth(getState),
      );
      return { docKey: p.docKey, markdown: p.markdown, savedAt: data.saved_at };
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to save draft"));
    }
  },
);

export const discardLegalDraft = createAsyncThunk(
  "legal/discardDraft",
  async (docKey: LegalDocKey, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.delete<AdminLegalResponse>(`/api/admin/legal/${docKey}/draft`, auth(getState));
      return data;
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to discard draft"));
    }
  },
);

export const publishLegalDoc = createAsyncThunk(
  "legal/publish",
  async (
    p: { docKey: LegalDocKey; effective_date: string; change_note?: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { docKey, ...body } = p;
      const { data } = await axios.post<AdminLegalResponse & { version: number }>(
        `/api/admin/legal/${docKey}/publish`,
        body,
        auth(getState),
      );
      return data;
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to publish"));
    }
  },
);

/** Returns an old version's source (used for preview and "restore into draft"). */
export const fetchLegalVersion = createAsyncThunk(
  "legal/fetchVersion",
  async (p: { docKey: LegalDocKey; version: number }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<{ version: number; markdown: string; effective_date: string }>(
        `/api/admin/legal/${p.docKey}/versions/${p.version}`,
        auth(getState),
      );
      return data;
    } catch (e: any) {
      return rejectWithValue(errorText(e, "Failed to load version"));
    }
  },
);

const applyAdmin = (state: LegalState, data: AdminLegalResponse) => {
  state.details = data.details;
  state.docs = data.docs;
};

const legalSlice = createSlice({
  name: "legal",
  initialState,
  reducers: {
    clearLegalError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchPublicLegalDoc.pending, (s, a) => {
      s.publicStatus[a.meta.arg] = "loading";
    })
      .addCase(fetchPublicLegalDoc.fulfilled, (s, a) => {
        s.publicStatus[a.meta.arg] = "loaded";
        s.publicDocs[a.meta.arg] = a.payload;
      })
      .addCase(fetchPublicLegalDoc.rejected, (s, a) => {
        s.publicStatus[a.meta.arg] = "failed";
      })
      .addCase(fetchAdminLegal.pending, (s) => {
        s.adminLoading = s.docs.length === 0;
      })
      .addCase(fetchAdminLegal.fulfilled, (s, a) => {
        s.adminLoading = false;
        applyAdmin(s, a.payload);
      })
      .addCase(fetchAdminLegal.rejected, (s, a) => {
        s.adminLoading = false;
        s.error = a.payload as string;
      })
      .addCase(saveLegalDetails.pending, (s) => {
        s.detailsSaving = true;
        s.error = null;
      })
      .addCase(saveLegalDetails.fulfilled, (s, a) => {
        s.detailsSaving = false;
        applyAdmin(s, a.payload);
        s.publicDocs = {}; // placeholders changed: refetch public pages
      })
      .addCase(saveLegalDetails.rejected, (s, a) => {
        s.detailsSaving = false;
        s.error = a.payload as string;
      })
      .addCase(saveLegalDraft.pending, (s, a) => {
        s.draftSave[a.meta.arg.docKey] = "saving";
      })
      .addCase(saveLegalDraft.fulfilled, (s, a) => {
        s.draftSave[a.payload.docKey] = "saved";
        s.draftSavedAt[a.payload.docKey] = a.payload.savedAt;
        const doc = s.docs.find((d) => d.doc_key === a.payload.docKey);
        if (doc) {
          doc.draft_markdown = a.payload.markdown;
          doc.draft_updated_at = a.payload.savedAt;
        }
      })
      .addCase(saveLegalDraft.rejected, (s, a) => {
        s.draftSave[a.meta.arg.docKey] = "error";
        s.error = a.payload as string;
      })
      .addCase(discardLegalDraft.fulfilled, (s, a) => {
        applyAdmin(s, a.payload);
        s.draftSave[a.meta.arg] = "idle";
      })
      .addCase(discardLegalDraft.rejected, (s, a) => {
        s.error = a.payload as string;
      })
      .addCase(publishLegalDoc.pending, (s, a) => {
        s.publishing = a.meta.arg.docKey;
        s.error = null;
      })
      .addCase(publishLegalDoc.fulfilled, (s, a) => {
        s.publishing = null;
        applyAdmin(s, a.payload);
        s.draftSave[a.meta.arg.docKey] = "idle";
        delete s.publicDocs[a.meta.arg.docKey];
      })
      .addCase(publishLegalDoc.rejected, (s, a) => {
        s.publishing = null;
        s.error = a.payload as string;
      });
  },
});

export const { clearLegalError } = legalSlice.actions;
export default legalSlice.reducer;
