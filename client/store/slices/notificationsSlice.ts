import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

export type NotificationCategory =
  | "message"
  | "call"
  | "loan"
  | "client"
  | "task"
  | "flow"
  | "lead"
  | "system";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface BrokerNotification {
  id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  category: NotificationCategory;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
}

interface NotificationsState {
  notifications: BrokerNotification[];
  unreadCount: number;
  isLoading: boolean;
  /** True only after the very first fetch — used so the bell skips
   *  fake "new arrival" toast/animation on initial page load. */
  hasFetchedOnce: boolean;
  /** Last-seen highest notification id — used to detect new arrivals. */
  lastSeenMaxId: number;
  error: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasFetchedOnce: false,
  lastSeenMaxId: 0,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get("/api/notifications", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data as {
        success: boolean;
        notifications: BrokerNotification[];
        unread_count: number;
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch notifications",
      );
    }
  },
);

export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.put(
        `/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to mark notification as read",
      );
    }
  },
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.put(
        "/api/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return true;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          "Failed to mark all notifications as read",
      );
    }
  },
);

export const dismissNotification = createAsyncThunk(
  "notifications/dismiss",
  async (notificationId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to dismiss notification",
      );
    }
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.hasFetchedOnce = false;
      state.lastSeenMaxId = 0;
    },
    /** Mark all currently visible IDs as "seen" so the next poll
     *  doesn't fire arrival toasts for them. */
    acknowledgeArrivals: (state) => {
      const max = state.notifications.reduce(
        (m, n) => (n.id > m ? n.id : m),
        state.lastSeenMaxId,
      );
      state.lastSeenMaxId = max;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unread_count;
        if (!state.hasFetchedOnce) {
          // On first load, treat everything as already-seen.
          state.lastSeenMaxId = action.payload.notifications.reduce(
            (m, n) => (n.id > m ? n.id : m),
            0,
          );
          state.hasFetchedOnce = true;
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          (n) => n.id === action.payload,
        );
        if (notification && !notification.is_read) {
          notification.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => (n.is_read = true));
        state.unreadCount = 0;
      })
      .addCase(dismissNotification.fulfilled, (state, action) => {
        const idx = state.notifications.findIndex(
          (n) => n.id === action.payload,
        );
        if (idx >= 0) {
          if (!state.notifications[idx].is_read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(idx, 1);
        }
      });
  },
});

export const { clearNotifications, acknowledgeArrivals } =
  notificationsSlice.actions;

export const selectNotifications = (state: {
  notifications: NotificationsState;
}) => state.notifications.notifications;
export const selectUnreadCount = (state: {
  notifications: NotificationsState;
}) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state: {
  notifications: NotificationsState;
}) => state.notifications.isLoading;
export const selectLastSeenMaxId = (state: {
  notifications: NotificationsState;
}) => state.notifications.lastSeenMaxId;
export const selectHasFetchedOnce = (state: {
  notifications: NotificationsState;
}) => state.notifications.hasFetchedOnce;

export default notificationsSlice.reducer;
