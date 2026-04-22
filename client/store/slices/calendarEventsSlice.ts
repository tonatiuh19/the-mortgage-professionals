import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  CalendarEvent,
  CalendarEventType,
  GetCalendarEventsResponse,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  SyncBirthdaysResponse,
  PaginationInfo,
} from "@shared/api";

interface CalendarEventsState {
  events: CalendarEvent[];
  total: number;
  pagination: PaginationInfo | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSyncing: boolean;
  error: string | null;
}

const initialState: CalendarEventsState = {
  events: [],
  total: 0,
  pagination: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isSyncing: false,
  error: null,
};

export const fetchCalendarEvents = createAsyncThunk(
  "calendarEvents/fetchAll",
  async (
    params: {
      from?: string;
      to?: string;
      event_type?: CalendarEventType | "all";
      search?: string;
      sort_by?: string;
      sort_order?: "ASC" | "DESC";
      page?: number;
      limit?: number;
      /** YYYY-MM — calendar view mode. Fetches all events visible in that month,
       *  projecting yearly events by month/day. No pagination applied. */
      calendar_month?: string;
    } | void,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetCalendarEventsResponse>(
        "/api/calendar/events",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: params ?? {},
        },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch calendar events",
      );
    }
  },
);

export const createCalendarEvent = createAsyncThunk(
  "calendarEvents/create",
  async (
    payload: CreateCalendarEventRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<{
        success: boolean;
        event: CalendarEvent;
      }>("/api/calendar/events", payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.event;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create calendar event",
      );
    }
  },
);

export const updateCalendarEvent = createAsyncThunk(
  "calendarEvents/update",
  async (
    {
      eventId,
      payload,
    }: { eventId: number; payload: UpdateCalendarEventRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.put(`/api/calendar/events/${eventId}`, payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return { eventId, payload };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update calendar event",
      );
    }
  },
);

export const deleteCalendarEvent = createAsyncThunk(
  "calendarEvents/delete",
  async (eventId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/calendar/events/${eventId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return eventId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete calendar event",
      );
    }
  },
);

export const syncBirthdays = createAsyncThunk(
  "calendarEvents/syncBirthdays",
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<SyncBirthdaysResponse>(
        "/api/calendar/sync-birthdays",
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      // Refresh events after sync
      dispatch(fetchCalendarEvents());
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to sync birthdays",
      );
    }
  },
);

const calendarEventsSlice = createSlice({
  name: "calendarEvents",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendarEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload.events;
        state.total = action.payload.total;
        state.pagination = action.payload.pagination ?? null;
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createCalendarEvent.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCalendarEvent.fulfilled, (state, action) => {
        state.isCreating = false;
        state.events = [...state.events, action.payload].sort((a, b) =>
          a.event_date.localeCompare(b.event_date),
        );
        state.total += 1;
      })
      .addCase(createCalendarEvent.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateCalendarEvent.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(updateCalendarEvent.fulfilled, (state, action) => {
        state.isUpdating = false;
        const { eventId, payload } = action.payload;
        const idx = state.events.findIndex((e) => e.id === eventId);
        if (idx !== -1) {
          state.events[idx] = {
            ...state.events[idx],
            ...payload,
          } as CalendarEvent;
        }
      })
      .addCase(updateCalendarEvent.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteCalendarEvent.pending, (state) => {
        state.isDeleting = true;
      })
      .addCase(deleteCalendarEvent.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.events = state.events.filter((e) => e.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteCalendarEvent.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(syncBirthdays.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(syncBirthdays.fulfilled, (state) => {
        state.isSyncing = false;
      })
      .addCase(syncBirthdays.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = calendarEventsSlice.actions;
export default calendarEventsSlice.reducer;
export type { CalendarEventsState };
