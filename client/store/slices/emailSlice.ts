import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
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
  /** Active folder view: inbox | sent */
  folder: "inbox" | "sent";

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

  error: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchEmailThreads = createAsyncThunk(
  "email/fetchThreads",
  async (_: void, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const emailFolder = (getState() as RootState).email.folder;
      const { data } = await axios.get<GetConversationThreadsResponse>(
        "/api/conversations/threads",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: { limit: 100, folder: emailFolder },
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
      const { data } = await axios.post<SendMessageResponse>(
        "/api/conversations/send",
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
    },
    clearEmailError(state) {
      state.error = null;
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
  },
});

export const {
  setEmailCurrentThread,
  setEmailSearch,
  setEmailStatusFilter,
  setEmailFolder,
  clearEmailError,
  emailMessageReceived,
} = emailSlice.actions;

export default emailSlice.reducer;
