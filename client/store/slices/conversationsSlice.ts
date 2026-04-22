import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetConversationThreadsResponse,
  GetConversationMessagesResponse,
  SendMessageResponse,
  UpdateConversationResponse,
  GetConversationTemplatesResponse,
  GetConversationStatsResponse,
  GetCallHistoryResponse,
  ConversationThread,
  Communication,
  ConversationTemplate,
  ConversationStats,
  CallRecord,
  SendMessageRequest,
  UpdateConversationRequest,
} from "@shared/api";

interface ConversationsState {
  // Thread management
  threads: ConversationThread[];
  currentThread: ConversationThread | null;
  messages: Communication[];
  templates: ConversationTemplate[];
  stats: ConversationStats | null;

  // UI state
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isLoadingTemplates: boolean;
  isLoadingStats: boolean;
  isSendingMessage: boolean;

  // Filters and pagination
  threadsFilters: {
    status: string;
    priority: string;
    search: string;
    page: number;
    limit: number;
  };

  messagesFilters: {
    page: number;
    limit: number;
  };

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

  // WhatsApp availability check
  whatsappAvailability: Record<string, boolean | null>; // phone -> true/false/null (null = checking)
  isCheckingWhatsApp: boolean;

  // Call history
  callHistory: CallRecord[];
  isLoadingCallHistory: boolean;
  callHistoryPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Error handling
  error: string | null;
}

const initialState: ConversationsState = {
  threads: [],
  currentThread: null,
  messages: [],
  templates: [],
  stats: null,

  isLoadingThreads: false,
  isLoadingMessages: false,
  isLoadingTemplates: false,
  isLoadingStats: false,
  isSendingMessage: false,

  threadsFilters: {
    status: "all",
    priority: "",
    search: "",
    page: 1,
    limit: 20,
  },

  messagesFilters: {
    page: 1,
    limit: 50,
  },

  threadsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  messagesPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  whatsappAvailability: {},
  isCheckingWhatsApp: false,

  callHistory: [],
  isLoadingCallHistory: false,
  callHistoryPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },

  error: null,
};

// Async thunks
export const checkWhatsAppAvailability = createAsyncThunk(
  "conversations/checkWhatsApp",
  async (phone: string, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<{
        success: boolean;
        registered: boolean;
      }>("/api/conversations/check-whatsapp", {
        headers: { Authorization: `Bearer ${sessionToken}` },
        params: { phone },
      });
      return { phone, registered: data.registered };
    } catch {
      return rejectWithValue(phone);
    }
  },
);

export const fetchConversationThreads = createAsyncThunk(
  "conversations/fetchThreads",
  async (
    params: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      search?: string;
    } = {},
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetConversationThreadsResponse>(
        "/api/conversations/threads",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params,
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch conversation threads",
      );
    }
  },
);

export const fetchConversationMessages = createAsyncThunk(
  "conversations/fetchMessages",
  async (
    {
      conversationId,
      page = 1,
      limit = 50,
    }: {
      conversationId: string;
      page?: number;
      limit?: number;
    },
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
        error.response?.data?.message ||
          "Failed to fetch conversation messages",
      );
    }
  },
);

export const sendMessage = createAsyncThunk(
  "conversations/sendMessage",
  async (messageData: SendMessageRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<SendMessageResponse>(
        "/api/conversations/send",
        messageData,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      // Attach the outgoing body and media_url so the reducer can update the
      // thread preview optimistically without waiting for a re-fetch.
      return {
        ...data,
        body: messageData.body ?? null,
        media_url: messageData.media_url ?? null,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send message",
      );
    }
  },
);

export const deleteMessage = createAsyncThunk(
  "conversations/deleteMessage",
  async (
    {
      conversationId,
      messageId,
    }: { conversationId: string; messageId: number | string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(
        `/api/conversations/${conversationId}/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { conversationId, messageId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete message",
      );
    }
  },
);

export const updateConversation = createAsyncThunk(
  "conversations/updateConversation",
  async (
    {
      conversationId,
      updates,
    }: {
      conversationId: string;
      updates: UpdateConversationRequest;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<UpdateConversationResponse>(
        `/api/conversations/${conversationId}`,
        updates,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update conversation",
      );
    }
  },
);

export const deleteConversation = createAsyncThunk(
  "conversations/deleteConversation",
  async (conversationId: string, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete conversation",
      );
    }
  },
);

export const fetchConversationTemplates = createAsyncThunk(
  "conversations/fetchTemplates",
  async (
    type: string | undefined = undefined,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetConversationTemplatesResponse>(
        "/api/conversations/templates",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: type ? { type } : {},
        },
      );
      return data.templates;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch conversation templates",
      );
    }
  },
);

export const fetchConversationStats = createAsyncThunk(
  "conversations/fetchStats",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetConversationStatsResponse>(
        "/api/conversations/stats",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.stats;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch conversation stats",
      );
    }
  },
);

export const fetchCallHistory = createAsyncThunk(
  "conversations/fetchCallHistory",
  async (
    { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetCallHistoryResponse>(
        "/api/voice/calls",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: { page, limit },
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch call history",
      );
    }
  },
);

export const saveContactFromConversation = createAsyncThunk(
  "conversations/saveContactFromConversation",
  async (
    {
      conversationId,
      first_name,
      last_name,
      email,
      phone,
      alternate_phone,
      date_of_birth,
      address_street,
      address_city,
      address_state,
      address_zip,
      employment_status,
      income_type,
      annual_income,
      credit_score,
      citizenship_status,
      create_pipeline_draft,
      loan_type,
      notes,
    }: {
      conversationId: string;
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
      alternate_phone?: string;
      date_of_birth?: string;
      address_street?: string;
      address_city?: string;
      address_state?: string;
      address_zip?: string;
      employment_status?: string;
      income_type?: "W-2" | "1099" | "Self-Employed" | "Investor" | "Mixed";
      annual_income?: number;
      credit_score?: number;
      citizenship_status?:
        | "us_citizen"
        | "permanent_resident"
        | "non_resident"
        | "other";
      create_pipeline_draft?: boolean;
      loan_type?: "purchase" | "refinance";
      notes?: string;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post(
        `/api/conversations/${conversationId}/save-contact`,
        {
          first_name,
          last_name,
          email,
          phone,
          alternate_phone,
          date_of_birth,
          address_street,
          address_city,
          address_state,
          address_zip,
          employment_status,
          income_type,
          annual_income,
          credit_score,
          citizenship_status,
          create_pipeline_draft,
          loan_type,
          notes,
        },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { conversationId, ...data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to save contact",
      );
    }
  },
);

const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    // Thread management
    setCurrentThread: (state, action) => {
      state.currentThread = action.payload;
      state.messages = []; // Clear messages when switching threads
    },

    clearCurrentThread: (state) => {
      state.currentThread = null;
      state.messages = [];
    },

    // Filters
    setThreadsFilters: (state, action) => {
      state.threadsFilters = {
        ...state.threadsFilters,
        ...action.payload,
      };
    },

    setMessagesFilters: (state, action) => {
      state.messagesFilters = {
        ...state.messagesFilters,
        ...action.payload,
      };
    },

    // Patch recording_url + recording_duration on a single call message once ready
    patchMessageRecording: (
      state,
      action: {
        payload: {
          external_id: string;
          recording_url: string;
          recording_duration?: number | null;
        };
      },
    ) => {
      const idx = state.messages.findIndex(
        (m) => m.external_id === action.payload.external_id,
      );
      if (idx !== -1) {
        (state.messages[idx] as any).recording_url =
          action.payload.recording_url;
        if (action.payload.recording_duration != null) {
          (state.messages[idx] as any).recording_duration =
            action.payload.recording_duration;
        }
      }
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
    },

    // Real-time message updates
    addNewMessage: (state, action) => {
      const message = action.payload;

      // Add to messages if it belongs to current conversation
      if (
        state.currentThread &&
        message.conversation_id === state.currentThread.conversation_id
      ) {
        // Add to the beginning since messages are sorted by newest first
        state.messages.unshift(message);
      }

      // Update thread preview
      const threadIndex = state.threads.findIndex(
        (thread) => thread.conversation_id === message.conversation_id,
      );

      if (threadIndex !== -1) {
        const thread = state.threads[threadIndex];

        // Update thread with new message info
        const updatedThread = {
          ...thread,
          last_message_at: message.created_at,
          last_message_preview: message.body.substring(0, 200),
          last_message_type: message.communication_type,
          message_count: thread.message_count + 1,
          unread_count:
            message.direction === "inbound"
              ? thread.unread_count + 1
              : thread.unread_count,
        };

        // Remove from current position and add to beginning
        state.threads.splice(threadIndex, 1);
        state.threads.unshift(updatedThread);

        // Update current thread if it matches
        if (
          state.currentThread &&
          state.currentThread.conversation_id === message.conversation_id
        ) {
          state.currentThread = updatedThread;
        }
      }
    },

    // Mark messages as read
    markConversationAsRead: (state, action) => {
      const conversationId = action.payload;

      // Update thread unread count
      const thread = state.threads.find(
        (t) => t.conversation_id === conversationId,
      );
      if (thread) {
        thread.unread_count = 0;
      }

      // Update current thread
      if (
        state.currentThread &&
        state.currentThread.conversation_id === conversationId
      ) {
        state.currentThread.unread_count = 0;
      }
    },

    // Remove a thread from the list — used when another broker claims an
    // unassigned shared-inbox thread so it disappears from everyone else's view.
    removeThread: (state, action: { payload: string }) => {
      const conversationId = action.payload;
      state.threads = state.threads.filter(
        (t) => t.conversation_id !== conversationId,
      );
      if (state.currentThread?.conversation_id === conversationId) {
        state.currentThread = null;
        state.messages = [];
      }
    },
  },

  extraReducers: (builder) => {
    // Fetch conversation threads
    builder
      .addCase(fetchConversationThreads.pending, (state) => {
        state.isLoadingThreads = true;
        state.error = null;
      })
      .addCase(fetchConversationThreads.fulfilled, (state, action) => {
        state.isLoadingThreads = false;
        state.threads = action.payload.threads;
        state.threadsPagination = action.payload.pagination;
        state.error = null;
        // Keep currentThread in sync so the right panel shows updated data
        if (state.currentThread) {
          const fresh = action.payload.threads.find(
            (t) => t.conversation_id === state.currentThread!.conversation_id,
          );
          if (fresh) state.currentThread = fresh;
        }
      })
      .addCase(fetchConversationThreads.rejected, (state, action) => {
        state.isLoadingThreads = false;
        state.error = action.payload as string;
      });

    // Fetch conversation messages
    builder
      .addCase(fetchConversationMessages.pending, (state) => {
        state.isLoadingMessages = true;
        state.error = null;
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        state.messages = action.payload.messages;
        state.currentThread = action.payload.thread;
        state.messagesPagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.error = action.payload as string;
      });

    // Send message
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isSendingMessage = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSendingMessage = false;
        state.error = null;
        const convId = action.payload?.conversation_id;
        const body = action.payload?.body ?? null;
        const now = new Date().toISOString();
        if (!convId) return;

        const existing = state.threads.find(
          (t) => t.conversation_id === convId,
        );
        if (existing) {
          // Update preview / count on the existing thread immediately so the
          // sidebar doesn't keep showing "No messages yet" until the next fetch.
          existing.last_message_preview = body
            ? body.slice(0, 200)
            : existing.last_message_preview;
          existing.last_message_at = now;
          existing.message_count = (existing.message_count ?? 0) + 1;
          // Bubble the thread to the top
          state.threads = [
            existing,
            ...state.threads.filter((t) => t.conversation_id !== convId),
          ];
        } else {
          // New thread — add a placeholder so it appears immediately while
          // fetchConversationThreads runs (avoids TiDB replication lag gap).
          const placeholder: ConversationThread = {
            id: 0,
            conversation_id: convId,
            broker_id: null,
            last_message_at: now,
            last_message_preview: body ? body.slice(0, 200) : null,
            last_message_type: "sms",
            message_count: 1,
            unread_count: 0,
            priority: "normal",
            status: "active",
            created_at: now,
            updated_at: now,
          };
          state.threads.unshift(placeholder);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload as string;
      });

    // Delete message
    builder.addCase(deleteMessage.fulfilled, (state, action) => {
      const { messageId } = action.payload;
      state.messages = state.messages.filter(
        (m) => String(m.id) !== String(messageId),
      );
    });

    // Delete conversation (permanent)
    builder.addCase(deleteConversation.fulfilled, (state, action) => {
      const conversationId = action.payload;
      state.threads = state.threads.filter(
        (t) => t.conversation_id !== conversationId,
      );
      if (state.currentThread?.conversation_id === conversationId) {
        state.currentThread = null;
        state.messages = [];
      }
    });

    // Update conversation
    builder
      .addCase(updateConversation.pending, (state) => {
        state.error = null;
      })
      .addCase(updateConversation.fulfilled, (state, action) => {
        const updatedThread = action.payload.thread;

        // Update in threads list
        const index = state.threads.findIndex(
          (thread) => thread.conversation_id === updatedThread.conversation_id,
        );
        if (index !== -1) {
          state.threads[index] = updatedThread;
        }

        // Update current thread
        if (
          state.currentThread &&
          state.currentThread.conversation_id === updatedThread.conversation_id
        ) {
          state.currentThread = updatedThread;
        }

        state.error = null;
      })
      .addCase(updateConversation.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch templates
    builder
      .addCase(fetchConversationTemplates.pending, (state) => {
        state.isLoadingTemplates = true;
        state.error = null;
      })
      .addCase(fetchConversationTemplates.fulfilled, (state, action) => {
        state.isLoadingTemplates = false;
        state.templates = action.payload;
        state.error = null;
      })
      .addCase(fetchConversationTemplates.rejected, (state, action) => {
        state.isLoadingTemplates = false;
        state.error = action.payload as string;
      });

    // WhatsApp availability check
    builder
      .addCase(checkWhatsAppAvailability.pending, (state, action) => {
        state.isCheckingWhatsApp = true;
        // Mark as null (in-progress) for this phone
        state.whatsappAvailability[action.meta.arg] = null;
      })
      .addCase(checkWhatsAppAvailability.fulfilled, (state, action) => {
        state.isCheckingWhatsApp = false;
        state.whatsappAvailability[action.payload.phone] =
          action.payload.registered;
      })
      .addCase(checkWhatsAppAvailability.rejected, (state, action) => {
        state.isCheckingWhatsApp = false;
        // On error fallback to true so the option isn't permanently blocked
        const phone = action.meta.arg;
        state.whatsappAvailability[phone] = true;
      });

    // Fetch stats
    builder
      .addCase(fetchConversationStats.pending, (state) => {
        state.isLoadingStats = true;
        state.error = null;
      })
      .addCase(fetchConversationStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(fetchConversationStats.rejected, (state, action) => {
        state.isLoadingStats = false;
        state.error = action.payload as string;
      });

    // Fetch call history
    builder
      .addCase(fetchCallHistory.pending, (state) => {
        state.isLoadingCallHistory = true;
        state.error = null;
      })
      .addCase(fetchCallHistory.fulfilled, (state, action) => {
        state.isLoadingCallHistory = false;
        state.callHistory = action.payload.calls;
        state.callHistoryPagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchCallHistory.rejected, (state, action) => {
        state.isLoadingCallHistory = false;
        state.error = action.payload as string;
      });

    builder.addCase(saveContactFromConversation.fulfilled, (state, action) => {
      const {
        conversationId: originalConvId,
        conversation_id: finalConvId,
        client_id,
        client_name,
        client_email,
      } = action.payload;

      // The API may have renamed the thread to conv_client_{id}
      const changed = finalConvId && finalConvId !== originalConvId;

      const thread = state.threads.find(
        (t) => t.conversation_id === originalConvId,
      );
      if (thread) {
        thread.client_id = client_id;
        thread.client_name = client_name;
        if (client_email) thread.client_email = client_email;
        if (changed) thread.conversation_id = finalConvId;
      }
      if (state.currentThread?.conversation_id === originalConvId) {
        state.currentThread = {
          ...state.currentThread,
          client_id,
          client_name,
          ...(client_email ? { client_email } : {}),
          ...(changed ? { conversation_id: finalConvId } : {}),
        };
      }
    });
  },
});

export const {
  setCurrentThread,
  clearCurrentThread,
  setThreadsFilters,
  setMessagesFilters,
  clearError,
  addNewMessage,
  markConversationAsRead,
  removeThread,
  patchMessageRecording,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
