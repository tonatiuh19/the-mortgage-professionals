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
  ConversationThread,
  Communication,
  ConversationTemplate,
  ConversationStats,
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

  error: null,
};

// Async thunks
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
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send message",
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

        // The new message will be added via real-time updates or next fetch
        // For immediate feedback, we could add it optimistically here
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload as string;
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
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
