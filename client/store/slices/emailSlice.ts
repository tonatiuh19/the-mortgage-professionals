import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import { disconnectConversationMailbox } from "./conversationsSlice";
import type {
  ConversationThread,
  Communication,
  ConversationMailbox,
  GetConversationThreadsResponse,
  GetConversationMessagesResponse,
  SendMessageResponse,
  GetConversationMailboxesResponse,
  SyncConversationMailboxResponse,
  SendMessageRequest,
  MailFolder,
  MailFolderMessage,
  GetMailFoldersResponse,
  GetMailFolderMessagesResponse,
  EmailDraft,
  SaveEmailDraftRequest,
  GetEmailDraftsResponse,
  EmailSignature,
  SaveEmailSignatureRequest,
  GetEmailSignaturesResponse,
  GetEmailSyncLogResponse,
  EmailSyncLogEntry,
} from "@shared/api";

interface EmailState {
  // All threads from the API — filtered client-side to email only
  threads: ConversationThread[];
  currentThread: ConversationThread | null;
  messages: Communication[];
  mailboxes: ConversationMailbox[];

  // Loading flags
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  isLoadingMailboxes: boolean;
  isSyncingMailbox: boolean;

  // Pagination
  threadsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  messagesPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Search / filter
  search: string;
  statusFilter: "all" | "active" | "closed";
  /** Active folder view: inbox | sent | custom (a Graph folder) */
  folder: "inbox" | "sent";

  // Mail folder browser (Outlook folders via Graph API)
  mailFolders: MailFolder[];
  isLoadingMailFolders: boolean;
  activeFolderId: string | null; // null = not in folder browser mode
  folderMessages: MailFolderMessage[];
  isLoadingFolderMessages: boolean;
  activeFolderMessage: Record<string, any> | null;
  isLoadingFolderMessage: boolean;
  folderNextSkip: number | null; // for pagination

  // Drafts
  drafts: EmailDraft[];
  isLoadingDrafts: boolean;
  isSavingDraft: boolean;
  activeDraft: EmailDraft | null;

  // Signatures
  signatures: EmailSignature[];
  isLoadingSignatures: boolean;
  isSavingSignature: boolean;

  // Sync log
  syncLog: EmailSyncLogEntry[];
  isLoadingSyncLog: boolean;

  error: string | null;
}

const initialState: EmailState = {
  threads: [],
  currentThread: null,
  messages: [],
  mailboxes: [],

  isLoadingThreads: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  isLoadingMailboxes: false,
  isSyncingMailbox: false,

  threadsPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  messagesPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },

  search: "",
  statusFilter: "all",
  folder: "inbox" as const,

  mailFolders: [],
  isLoadingMailFolders: false,
  activeFolderId: null,
  folderMessages: [],
  isLoadingFolderMessages: false,
  activeFolderMessage: null,
  isLoadingFolderMessage: false,
  folderNextSkip: null,

  drafts: [],
  isLoadingDrafts: false,
  isSavingDraft: false,
  activeDraft: null,

  signatures: [],
  isLoadingSignatures: false,
  isSavingSignature: false,

  syncLog: [],
  isLoadingSyncLog: false,

  error: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchEmailThreads = createAsyncThunk(
  "email/fetchThreads",
  async (mailboxId: number | undefined, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const emailFolder = (getState() as RootState).email.folder;
      const { data } = await axios.get<GetConversationThreadsResponse>(
        "/api/conversations/threads",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: {
            limit: 100,
            folder: emailFolder,
            ...(mailboxId ? { mailbox_id: mailboxId } : {}),
          },
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch email threads",
      );
    }
  },
);

export const fetchEmailMessages = createAsyncThunk(
  "email/fetchMessages",
  async (
    {
      conversationId,
      page = 1,
      limit = 50,
    }: { conversationId: string; page?: number; limit?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetConversationMessagesResponse>(
        `/api/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: { page, limit },
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch email messages",
      );
    }
  },
);

export const sendEmailMessage = createAsyncThunk(
  "email/sendMessage",
  async (messageData: SendMessageRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      // Use the dedicated email send endpoint (fully separated from SMS/conversations)
      const { data } = await axios.post<SendMessageResponse>(
        "/api/email/send",
        messageData,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return {
        ...data,
        body: messageData.body ?? null,
        subject: messageData.subject ?? null,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send email",
      );
    }
  },
);

export const fetchEmailMailboxes = createAsyncThunk(
  "email/fetchMailboxes",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetConversationMailboxesResponse>(
        "/api/conversations/mailboxes",
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.mailboxes;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch mailboxes",
      );
    }
  },
);

export const syncEmailMailbox = createAsyncThunk(
  "email/syncMailbox",
  async (mailboxId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<SyncConversationMailboxResponse>(
        `/api/conversations/mailboxes/${mailboxId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to sync mailbox",
      );
    }
  },
);

export const fetchMailFolders = createAsyncThunk(
  "email/fetchMailFolders",
  async (mailboxId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetMailFoldersResponse>(
        `/api/conversations/mailboxes/${mailboxId}/folders`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.folders;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch mail folders",
      );
    }
  },
);

export const fetchMailFolderMessages = createAsyncThunk(
  "email/fetchMailFolderMessages",
  async (
    {
      mailboxId,
      folderId,
      skip = 0,
      search = "",
    }: { mailboxId: number; folderId: string; skip?: number; search?: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetMailFolderMessagesResponse>(
        `/api/conversations/mailboxes/${mailboxId}/folders/${encodeURIComponent(folderId)}/messages`,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: { top: 50, skip, ...(search ? { search } : {}) },
        },
      );
      return {
        messages: data.messages,
        nextPageToken: data.nextPageToken ?? null,
        skip,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch folder messages",
      );
    }
  },
);

export const fetchMailFolderMessage = createAsyncThunk(
  "email/fetchMailFolderMessage",
  async (
    {
      mailboxId,
      folderId,
      messageId,
    }: { mailboxId: number; folderId: string; messageId: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get(
        `/api/conversations/mailboxes/${mailboxId}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.message;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch message",
      );
    }
  },
);

// ─── Draft Thunks ─────────────────────────────────────────────────────────────

export const fetchEmailDrafts = createAsyncThunk(
  "email/fetchDrafts",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetEmailDraftsResponse>(
        "/api/email/drafts",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.drafts;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch drafts",
      );
    }
  },
);

export const saveEmailDraft = createAsyncThunk(
  "email/saveDraft",
  async (
    draft: SaveEmailDraftRequest & { id?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<{
        success: boolean;
        draft: EmailDraft;
      }>("/api/email/drafts", draft, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.draft;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save draft",
      );
    }
  },
);

export const deleteEmailDraft = createAsyncThunk(
  "email/deleteDraft",
  async (draftId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/email/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return draftId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete draft",
      );
    }
  },
);

// ─── Signature Thunks ─────────────────────────────────────────────────────────

export const fetchEmailSignatures = createAsyncThunk(
  "email/fetchSignatures",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetEmailSignaturesResponse>(
        "/api/email/signatures",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.signatures;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch signatures",
      );
    }
  },
);

export const saveEmailSignature = createAsyncThunk(
  "email/saveSignature",
  async (
    sig: SaveEmailSignatureRequest & { id?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<{
        success: boolean;
        signature: EmailSignature;
      }>("/api/email/signatures", sig, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.signature;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save signature",
      );
    }
  },
);

export const deleteEmailSignature = createAsyncThunk(
  "email/deleteSignature",
  async (signatureId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/email/signatures/${signatureId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return signatureId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete signature",
      );
    }
  },
);

// ─── Sync Log Thunk ───────────────────────────────────────────────────────────

export const fetchEmailSyncLog = createAsyncThunk(
  "email/fetchSyncLog",
  async (mailboxId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetEmailSyncLogResponse>(
        `/api/conversations/mailboxes/${mailboxId}/sync-log`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.logs;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch sync log",
      );
    }
  },
);

// ─── Thread Action Thunk ──────────────────────────────────────────────────────

export type EmailThreadActionType =
  | "archive"
  | "delete"
  | "mark_read"
  | "mark_unread"
  | "flag"
  | "unflag"
  | "move";

export const emailThreadAction = createAsyncThunk(
  "email/threadAction",
  async (
    {
      conversationId,
      action,
      folderId,
    }: {
      conversationId: string;
      action: EmailThreadActionType;
      folderId?: string;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.patch(
        `/api/email/threads/${encodeURIComponent(conversationId)}/action`,
        { action, folderId },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return {
        thread: data.thread as ConversationThread,
        action,
        conversationId,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to perform action",
      );
    }
  },
);

// ─── Slice ─────────────────────────────────────────────────────────────────────

const emailSlice = createSlice({
  name: "email",
  initialState,
  reducers: {
    setEmailCurrentThread(
      state,
      action: PayloadAction<ConversationThread | null>,
    ) {
      state.currentThread = action.payload;
    },
    setEmailSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setEmailStatusFilter(
      state,
      action: PayloadAction<"all" | "active" | "closed">,
    ) {
      state.statusFilter = action.payload;
    },
    setEmailFolder(state, action: PayloadAction<"inbox" | "sent">) {
      state.folder = action.payload;
      state.currentThread = null;
      state.messages = [];
      state.activeFolderId = null;
      state.folderMessages = [];
      state.activeFolderMessage = null;
    },
    setActiveFolderId(state, action: PayloadAction<string | null>) {
      state.activeFolderId = action.payload;
      state.folderMessages = [];
      state.activeFolderMessage = null;
      state.folderNextSkip = null;
      // Deselect inbox/sent when entering folder browser
      if (action.payload !== null) {
        state.currentThread = null;
        state.messages = [];
      }
    },
    setActiveFolderMessage(
      state,
      action: PayloadAction<Record<string, any> | null>,
    ) {
      state.activeFolderMessage = action.payload;
    },
    clearEmailError(state) {
      state.error = null;
    },
    setActiveDraft(state, action: PayloadAction<EmailDraft | null>) {
      state.activeDraft = action.payload;
    },
    /** Append a new inbound message received via Ably */
    emailMessageReceived(state, action: PayloadAction<Communication>) {
      const msg = action.payload;
      if (state.currentThread?.conversation_id === msg.conversation_id) {
        state.messages.push(msg);
      }
      // Update thread preview
      const thread = state.threads.find(
        (t) => t.conversation_id === msg.conversation_id,
      );
      if (thread) {
        thread.last_message_at = msg.created_at;
        thread.last_message_preview = msg.body?.slice(0, 120) ?? null;
        thread.unread_count += 1;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchEmailThreads
    builder.addCase(fetchEmailThreads.pending, (state) => {
      state.isLoadingThreads = true;
      state.error = null;
    });
    builder.addCase(fetchEmailThreads.fulfilled, (state, action) => {
      state.isLoadingThreads = false;
      // Only keep email threads
      state.threads = action.payload.threads.filter(
        (t) => t.last_message_type === "email",
      );
      state.threadsPagination = action.payload.pagination;
    });
    builder.addCase(fetchEmailThreads.rejected, (state, action) => {
      state.isLoadingThreads = false;
      state.error = action.payload as string;
    });

    // fetchEmailMessages
    builder.addCase(fetchEmailMessages.pending, (state) => {
      state.isLoadingMessages = true;
      state.error = null;
    });
    builder.addCase(fetchEmailMessages.fulfilled, (state, action) => {
      state.isLoadingMessages = false;
      state.messages = action.payload.messages;
      state.currentThread = action.payload.thread;
      state.messagesPagination = action.payload.pagination;
    });
    builder.addCase(fetchEmailMessages.rejected, (state, action) => {
      state.isLoadingMessages = false;
      state.error = action.payload as string;
    });

    // sendEmailMessage
    builder.addCase(sendEmailMessage.pending, (state) => {
      state.isSendingMessage = true;
    });
    builder.addCase(sendEmailMessage.fulfilled, (state, action) => {
      state.isSendingMessage = false;
      // Optimistic: append outbound message to current view
      const newMsg: Partial<Communication> = {
        id: action.payload.communication_id,
        conversation_id: action.payload.conversation_id,
        communication_type: "email",
        direction: "outbound",
        body: (action.payload as any).body ?? "",
        subject: (action.payload as any).subject ?? null,
        delivery_status: "sent",
        created_at: new Date().toISOString(),
        message_type: "text",
      };
      state.messages.push(newMsg as Communication);
      // Update thread preview
      const thread = state.threads.find(
        (t) => t.conversation_id === action.payload.conversation_id,
      );
      if (thread) {
        thread.last_message_at = newMsg.created_at!;
        thread.last_message_preview = newMsg.body?.slice(0, 120) ?? null;
        thread.last_message_type = "email";
      }
    });
    builder.addCase(sendEmailMessage.rejected, (state, action) => {
      state.isSendingMessage = false;
      state.error = action.payload as string;
    });

    // fetchEmailMailboxes
    builder.addCase(fetchEmailMailboxes.pending, (state) => {
      state.isLoadingMailboxes = true;
    });
    builder.addCase(fetchEmailMailboxes.fulfilled, (state, action) => {
      state.isLoadingMailboxes = false;
      state.mailboxes = action.payload;
    });
    builder.addCase(fetchEmailMailboxes.rejected, (state, action) => {
      state.isLoadingMailboxes = false;
      state.error = action.payload as string;
    });

    // syncEmailMailbox
    builder.addCase(syncEmailMailbox.pending, (state) => {
      state.isSyncingMailbox = true;
    });
    builder.addCase(syncEmailMailbox.fulfilled, (state) => {
      state.isSyncingMailbox = false;
    });
    builder.addCase(syncEmailMailbox.rejected, (state, action) => {
      state.isSyncingMailbox = false;
      state.error = action.payload as string;
    });

    // fetchMailFolders
    builder.addCase(fetchMailFolders.pending, (state) => {
      state.isLoadingMailFolders = true;
    });
    builder.addCase(fetchMailFolders.fulfilled, (state, action) => {
      state.isLoadingMailFolders = false;
      state.mailFolders = action.payload;
    });
    builder.addCase(fetchMailFolders.rejected, (state, action) => {
      state.isLoadingMailFolders = false;
      state.error = action.payload as string;
    });

    // fetchMailFolderMessages
    builder.addCase(fetchMailFolderMessages.pending, (state) => {
      state.isLoadingFolderMessages = true;
    });
    builder.addCase(fetchMailFolderMessages.fulfilled, (state, action) => {
      state.isLoadingFolderMessages = false;
      const { messages, nextPageToken, skip } = action.payload;
      // Append if loading more pages, replace if first page
      state.folderMessages =
        skip === 0 ? messages : [...state.folderMessages, ...messages];
      state.folderNextSkip = nextPageToken ? Number(nextPageToken) : null;
    });
    builder.addCase(fetchMailFolderMessages.rejected, (state, action) => {
      state.isLoadingFolderMessages = false;
      state.error = action.payload as string;
    });

    // fetchMailFolderMessage
    builder.addCase(fetchMailFolderMessage.pending, (state) => {
      state.isLoadingFolderMessage = true;
    });
    builder.addCase(fetchMailFolderMessage.fulfilled, (state, action) => {
      state.isLoadingFolderMessage = false;
      state.activeFolderMessage = action.payload;
    });
    builder.addCase(fetchMailFolderMessage.rejected, (state, action) => {
      state.isLoadingFolderMessage = false;
      state.error = action.payload as string;
    });

    // fetchEmailDrafts
    builder.addCase(fetchEmailDrafts.pending, (state) => {
      state.isLoadingDrafts = true;
    });
    builder.addCase(fetchEmailDrafts.fulfilled, (state, action) => {
      state.isLoadingDrafts = false;
      state.drafts = action.payload;
    });
    builder.addCase(fetchEmailDrafts.rejected, (state, action) => {
      state.isLoadingDrafts = false;
      state.error = action.payload as string;
    });

    // saveEmailDraft
    builder.addCase(saveEmailDraft.pending, (state) => {
      state.isSavingDraft = true;
    });
    builder.addCase(saveEmailDraft.fulfilled, (state, action) => {
      state.isSavingDraft = false;
      const idx = state.drafts.findIndex((d) => d.id === action.payload.id);
      if (idx >= 0) {
        state.drafts[idx] = action.payload;
      } else {
        state.drafts.unshift(action.payload);
      }
      state.activeDraft = action.payload;
    });
    builder.addCase(saveEmailDraft.rejected, (state, action) => {
      state.isSavingDraft = false;
      state.error = action.payload as string;
    });

    // deleteEmailDraft
    builder.addCase(deleteEmailDraft.fulfilled, (state, action) => {
      state.drafts = state.drafts.filter((d) => d.id !== action.payload);
      if (state.activeDraft?.id === action.payload) state.activeDraft = null;
    });
    builder.addCase(deleteEmailDraft.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // fetchEmailSignatures
    builder.addCase(fetchEmailSignatures.pending, (state) => {
      state.isLoadingSignatures = true;
    });
    builder.addCase(fetchEmailSignatures.fulfilled, (state, action) => {
      state.isLoadingSignatures = false;
      state.signatures = action.payload;
    });
    builder.addCase(fetchEmailSignatures.rejected, (state, action) => {
      state.isLoadingSignatures = false;
      state.error = action.payload as string;
    });

    // saveEmailSignature
    builder.addCase(saveEmailSignature.pending, (state) => {
      state.isSavingSignature = true;
    });
    builder.addCase(saveEmailSignature.fulfilled, (state, action) => {
      state.isSavingSignature = false;
      const idx = state.signatures.findIndex((s) => s.id === action.payload.id);
      if (idx >= 0) {
        state.signatures[idx] = action.payload;
      } else {
        state.signatures.push(action.payload);
      }
      // Enforce single default
      if (action.payload.is_default) {
        state.signatures = state.signatures.map((s) =>
          s.id === action.payload.id ? s : { ...s, is_default: false },
        );
      }
    });
    builder.addCase(saveEmailSignature.rejected, (state, action) => {
      state.isSavingSignature = false;
      state.error = action.payload as string;
    });

    // deleteEmailSignature
    builder.addCase(deleteEmailSignature.fulfilled, (state, action) => {
      state.signatures = state.signatures.filter(
        (s) => s.id !== action.payload,
      );
    });
    builder.addCase(deleteEmailSignature.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // fetchEmailSyncLog
    builder.addCase(fetchEmailSyncLog.pending, (state) => {
      state.isLoadingSyncLog = true;
    });
    builder.addCase(fetchEmailSyncLog.fulfilled, (state, action) => {
      state.isLoadingSyncLog = false;
      state.syncLog = action.payload;
    });
    builder.addCase(fetchEmailSyncLog.rejected, (state, action) => {
      state.isLoadingSyncLog = false;
      state.error = action.payload as string;
    });

    // emailThreadAction
    builder.addCase(emailThreadAction.fulfilled, (state, action) => {
      const { thread, action: act, conversationId } = action.payload;
      if (!thread) return;
      // Update thread in list
      const idx = state.threads.findIndex(
        (t) => t.conversation_id === conversationId,
      );
      if (idx >= 0) {
        state.threads[idx] = { ...state.threads[idx], ...thread };
      }
      // Remove from list when archived/deleted
      if (act === "archive" || act === "delete") {
        state.threads = state.threads.filter(
          (t) => t.conversation_id !== conversationId,
        );
        if (state.currentThread?.conversation_id === conversationId) {
          state.currentThread = null;
        }
      } else if (state.currentThread?.conversation_id === conversationId) {
        state.currentThread = { ...state.currentThread, ...thread };
      }
    });

    // When a mailbox is disconnected, remove it from the local list immediately
    // so the Email nav item and mailbox-gated UI disappear without a page refresh
    builder.addCase(
      disconnectConversationMailbox.fulfilled,
      (state, action) => {
        const mailboxId = action.meta.arg;
        state.mailboxes = state.mailboxes.filter((m) => m.id !== mailboxId);
      },
    );
  },
});

export const {
  setEmailCurrentThread,
  setEmailSearch,
  setEmailStatusFilter,
  setEmailFolder,
  setActiveFolderId,
  setActiveFolderMessage,
  clearEmailError,
  setActiveDraft,
  emailMessageReceived,
} = emailSlice.actions;

export default emailSlice.reducer;
