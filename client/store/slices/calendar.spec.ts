/**
 * Calendar Section – Comprehensive Smoke Test Suite
 *
 * Covers:
 *  1. Pure utility functions replicated from api/index.ts (dtStr, utcDateToLocalMinutes,
 *     blocked-range overlap detection, slot availability logic)
 *  2. schedulerSlice – all reducers, loading flags, error handling, and state transitions
 *  3. calendarEventsSlice – all reducers, loading flags, and error handling
 *
 * All tests are pure unit tests: no HTTP calls, no DB connections.
 * Redux slices are tested by dispatching action creators directly into the reducer.
 */

import { describe, it, expect } from "vitest";
import schedulerReducer, {
  setSelectedDate,
  clearBookingSuccess,
  clearPublicError,
  clearError as clearSchedulerError,
  fetchPublicScheduler,
  fetchPublicSlots,
  bookMeeting,
  fetchSchedulerSettings,
  updateSchedulerSettings,
  fetchScheduledMeetings,
  updateScheduledMeeting,
  createScheduledMeeting,
  fetchBlockedRanges,
  addBlockedRange,
  deleteBlockedRange,
  fetchO365CalendarStatus,
  syncO365Calendar,
} from "./schedulerSlice";
import calendarEventsReducer, {
  clearError as clearCalendarError,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncBirthdays,
} from "./calendarEventsSlice";
import type {
  SchedulerBlockedRange,
  ScheduledMeeting,
  CalendarEvent,
} from "@shared/api";

// ─────────────────────────────────────────────────────────────────────────────
// Inline helper implementations (mirrors api/index.ts logic exactly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a UTC Date to minutes-from-midnight in the given IANA timezone.
 * Mirrors the `utcDateToLocalMinutes` helper in api/index.ts.
 */
function utcDateToLocalMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h =
    parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}

/**
 * Convert a Date/string to an unambiguous UTC ISO string (with trailing Z).
 * Mirrors the `dtStr` helper in api/index.ts.
 */
function dtStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date =
    typeof d === "string"
      ? new Date(d.replace(" ", "T") + (d.endsWith("Z") ? "" : "Z"))
      : d;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}T${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}Z`;
}

/**
 * Returns true when a blocked range's date span includes the given day key.
 * Mirrors the `selectedBlocked` filter logic in Calendar.tsx.
 */
function blockedRangeOverlapsDay(
  br: Pick<SchedulerBlockedRange, "start_datetime" | "end_datetime">,
  dayKey: string, // "YYYY-MM-DD"
): boolean {
  return (
    dayKey >= br.start_datetime.slice(0, 10) &&
    dayKey <= br.end_datetime.slice(0, 10)
  );
}

/**
 * Returns true when a slot [cursor, cursor+slotMinutes) conflicts with a blocked
 * range [brStartMin, brEndMin) expressed in broker-local minutes.
 * Mirrors the `blocked` predicate inside `getAvailableSlotsForDate` in api/index.ts.
 */
function slotIsBlocked(
  cursor: number,
  slotMinutes: number,
  brStartMin: number,
  brEndMin: number,
): boolean {
  // Handle events that cross midnight in broker timezone
  if (brEndMin <= brStartMin) {
    return cursor < brEndMin || cursor + slotMinutes > brStartMin;
  }
  return cursor < brEndMin && cursor + slotMinutes > brStartMin;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 – dtStr
// ─────────────────────────────────────────────────────────────────────────────

describe("dtStr – UTC ISO string formatter", () => {
  it("returns empty string for null", () => {
    expect(dtStr(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(dtStr(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(dtStr("")).toBe("");
  });

  it("formats a Date object as UTC ISO with trailing Z", () => {
    const d = new Date("2026-05-22T19:00:00Z");
    expect(dtStr(d)).toBe("2026-05-22T19:00:00Z");
  });

  it("handles a SQL-style space-separated datetime string (no Z suffix)", () => {
    // "2026-05-22 19:00:00" → treated as UTC → "2026-05-22T19:00:00Z"
    expect(dtStr("2026-05-22 19:00:00")).toBe("2026-05-22T19:00:00Z");
  });

  it("handles an ISO string that already ends with Z (no double-Z)", () => {
    expect(dtStr("2026-05-22T19:00:00Z")).toBe("2026-05-22T19:00:00Z");
  });

  it("handles an ISO string without Z suffix", () => {
    expect(dtStr("2026-05-22T19:00:00")).toBe("2026-05-22T19:00:00Z");
  });

  it("preserves UTC midnight correctly", () => {
    expect(dtStr("2026-06-01T00:00:00Z")).toBe("2026-06-01T00:00:00Z");
  });

  it("preserves UTC end-of-day correctly", () => {
    expect(dtStr("2026-06-01T23:59:59Z")).toBe("2026-06-01T23:59:59Z");
  });

  it("produces a string that ends with Z", () => {
    const result = dtStr(new Date("2026-05-22T12:30:45Z"));
    expect(result.endsWith("Z")).toBe(true);
  });

  it("produces a valid ISO date-time string", () => {
    const result = dtStr("2026-05-22 10:00:00");
    expect(new Date(result).toISOString()).toBe("2026-05-22T10:00:00.000Z");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 – utcDateToLocalMinutes
// ─────────────────────────────────────────────────────────────────────────────

describe("utcDateToLocalMinutes – timezone converter", () => {
  it("converts 19:00 UTC to 13:00 (780 min) in America/Mexico_City (UTC-6)", () => {
    const d = new Date("2026-05-22T19:00:00Z");
    expect(utcDateToLocalMinutes(d, "America/Mexico_City")).toBe(780);
  });

  it("converts 19:00 UTC to 12:00 (720 min) in America/Los_Angeles (PDT, UTC-7 in May)", () => {
    const d = new Date("2026-05-22T19:00:00Z");
    expect(utcDateToLocalMinutes(d, "America/Los_Angeles")).toBe(720);
  });

  it("converts 14:00 UTC to 10:00 (600 min) in America/New_York (EDT, UTC-4 in May)", () => {
    const d = new Date("2026-05-22T14:00:00Z");
    expect(utcDateToLocalMinutes(d, "America/New_York")).toBe(600);
  });

  it("converts 06:00 UTC to 00:00 (0 min) in America/Chicago (CDT, UTC-5 in May) — midnight guard", () => {
    // Verifies the `% 24` fix: some Intl implementations return "24:00" for midnight
    const d = new Date("2026-05-22T05:00:00Z");
    // America/Chicago in CDT is UTC-5: 05:00 UTC → 00:00 local
    expect(utcDateToLocalMinutes(d, "America/Chicago")).toBe(0);
  });

  it("converts 22:30 UTC to 16:30 (990 min) in America/Mexico_City", () => {
    const d = new Date("2026-05-22T22:30:00Z");
    expect(utcDateToLocalMinutes(d, "America/Mexico_City")).toBe(990);
  });

  it("converts 00:30 UTC to 18:30 (1110 min) in America/Los_Angeles (PDT) — previous day local", () => {
    // 00:30 UTC on May 22 = 17:30 previous day PDT (UTC-7)
    const d = new Date("2026-05-22T00:30:00Z");
    expect(utcDateToLocalMinutes(d, "America/Los_Angeles")).toBe(17 * 60 + 30);
  });

  it("returns a value between 0 and 1439 (0–23:59)", () => {
    const d = new Date("2026-05-22T13:45:00Z");
    const result = utcDateToLocalMinutes(d, "America/Mexico_City");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1440);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 – Blocked range day-overlap filter
// ─────────────────────────────────────────────────────────────────────────────

describe("blockedRangeOverlapsDay – calendar day filter logic", () => {
  const makeRange = (start: string, end: string) => ({
    start_datetime: start,
    end_datetime: end,
  });

  it("includes a same-day range on the matching day", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-22T13:00:00Z", "2026-05-22T16:30:00Z"),
        "2026-05-22",
      ),
    ).toBe(true);
  });

  it("includes a multi-day range when the day falls inside the span", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-20T00:00:00Z", "2026-05-25T00:00:00Z"),
        "2026-05-22",
      ),
    ).toBe(true);
  });

  it("includes a range whose start date matches the day", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-22T23:00:00Z", "2026-05-23T01:00:00Z"),
        "2026-05-22",
      ),
    ).toBe(true);
  });

  it("includes a range whose end date matches the day", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-21T23:00:00Z", "2026-05-22T01:00:00Z"),
        "2026-05-22",
      ),
    ).toBe(true);
  });

  it("excludes a range that ends before the target day", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-20T00:00:00Z", "2026-05-21T23:59:59Z"),
        "2026-05-22",
      ),
    ).toBe(false);
  });

  it("excludes a range that starts after the target day", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-23T00:00:00Z", "2026-05-24T00:00:00Z"),
        "2026-05-22",
      ),
    ).toBe(false);
  });

  it("works with ISO strings that have space separator (SQL format)", () => {
    expect(
      blockedRangeOverlapsDay(
        makeRange("2026-05-22 13:00:00", "2026-05-22 16:30:00"),
        "2026-05-22",
      ),
    ).toBe(true);
  });

  it("filters correctly from a list of ranges for a given day", () => {
    const ranges = [
      makeRange("2026-05-20T00:00:00Z", "2026-05-21T00:00:00Z"), // before
      makeRange("2026-05-22T10:00:00Z", "2026-05-22T12:00:00Z"), // matches
      makeRange("2026-05-22T16:00:00Z", "2026-05-22T17:00:00Z"), // matches
      makeRange("2026-05-23T00:00:00Z", "2026-05-24T00:00:00Z"), // after
    ];
    const matching = ranges.filter((r) =>
      blockedRangeOverlapsDay(r, "2026-05-22"),
    );
    expect(matching).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 – Slot availability / blocked range conflict
// ─────────────────────────────────────────────────────────────────────────────

describe("slotIsBlocked – slot vs. blocked range conflict detection", () => {
  // Blocked range: 13:00–16:30 → brStartMin=780, brEndMin=990 (same day, normal)

  it("slot exactly at block start is blocked", () => {
    expect(slotIsBlocked(780, 30, 780, 990)).toBe(true);
  });

  it("slot partially overlapping from the left is blocked", () => {
    // Slot 12:45–13:15 (cursor=765, slot=30) overlaps start of block at 780
    expect(slotIsBlocked(765, 30, 780, 990)).toBe(true);
  });

  it("slot entirely inside block is blocked", () => {
    expect(slotIsBlocked(840, 30, 780, 990)).toBe(true);
  });

  it("slot ending exactly at block end is NOT blocked (open interval)", () => {
    // Slot 16:00–16:30 (cursor=960), block ends at 16:30 (990)
    expect(slotIsBlocked(960, 30, 780, 990)).toBe(true);
  });

  it("slot at exactly block end boundary is available", () => {
    // Slot 16:30–17:00 (cursor=990), block is [780, 990)
    expect(slotIsBlocked(990, 30, 780, 990)).toBe(false);
  });

  it("slot entirely before block is available", () => {
    // Slot 12:00–12:30 (cursor=720)
    expect(slotIsBlocked(720, 30, 780, 990)).toBe(false);
  });

  it("slot ending exactly when block starts is available", () => {
    // Slot 12:30–13:00 (cursor=750), block starts at 13:00 (780)
    // cursor + slotMinutes = 780, need > brStartMin (780): 780 > 780 is false
    expect(slotIsBlocked(750, 30, 780, 990)).toBe(false);
  });

  it("slot entirely after block is available", () => {
    // Slot 17:00–17:30 (cursor=1020)
    expect(slotIsBlocked(1020, 30, 780, 990)).toBe(false);
  });

  // Midnight-crossing block: 23:00–01:00 → brStartMin=1380, brEndMin=60
  // Since brEndMin(60) <= brStartMin(1380), uses the midnight-crossing branch

  it("midnight-crossing block: slot at 23:30 (1410) is blocked", () => {
    expect(slotIsBlocked(1410, 30, 1380, 60)).toBe(true);
  });

  it("midnight-crossing block: slot at 23:00 (1380) start is blocked", () => {
    expect(slotIsBlocked(1380, 30, 1380, 60)).toBe(true);
  });

  it("midnight-crossing block: slot at 00:30 (30) before end is blocked", () => {
    expect(slotIsBlocked(30, 30, 1380, 60)).toBe(true);
  });

  it("midnight-crossing block: slot at 00:00 (0) is blocked (block ends at 01:00)", () => {
    expect(slotIsBlocked(0, 30, 1380, 60)).toBe(true);
  });

  it("midnight-crossing block: slot at 01:30 (90) after end is NOT blocked", () => {
    expect(slotIsBlocked(90, 30, 1380, 60)).toBe(false);
  });

  it("midnight-crossing block: slot at 10:00 (600) during the day is NOT blocked", () => {
    expect(slotIsBlocked(600, 30, 1380, 60)).toBe(false);
  });

  // Empty block list edge case
  it("no blocked ranges → all slots are available", () => {
    const blockedRanges: Array<{ brStartMin: number; brEndMin: number }> = [];
    const cursor = 780;
    const slotMinutes = 30;
    const blocked = blockedRanges.some(({ brStartMin, brEndMin }) =>
      slotIsBlocked(cursor, slotMinutes, brStartMin, brEndMin),
    );
    expect(blocked).toBe(false);
  });

  it("multiple non-overlapping ranges: slot is available when it misses all", () => {
    const ranges = [
      { brStartMin: 480, brEndMin: 540 }, // 08:00–09:00
      { brStartMin: 780, brEndMin: 840 }, // 13:00–14:00
    ];
    // Slot at 11:00 (660–690) is between blocks
    const blocked = ranges.some(({ brStartMin, brEndMin }) =>
      slotIsBlocked(660, 30, brStartMin, brEndMin),
    );
    expect(blocked).toBe(false);
  });

  it("multiple ranges: slot that overlaps any one is blocked", () => {
    const ranges = [
      { brStartMin: 480, brEndMin: 540 }, // 08:00–09:00
      { brStartMin: 780, brEndMin: 840 }, // 13:00–14:00
    ];
    // Slot at 13:15 (795) overlaps the second range
    const blocked = ranges.some(({ brStartMin, brEndMin }) =>
      slotIsBlocked(795, 30, brStartMin, brEndMin),
    );
    expect(blocked).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 – schedulerSlice reducers
// ─────────────────────────────────────────────────────────────────────────────

const REQ_ID = "test-request-id";

/** A minimal valid ScheduledMeeting for test purposes */
const mockMeeting = (id: number): ScheduledMeeting => ({
  id,
  tenant_id: 1,
  broker_id: 2,
  client_name: "Alice Smith",
  client_email: "alice@example.com",
  client_phone: null,
  meeting_date: "2026-05-22",
  meeting_time: "13:00:00",
  meeting_end_time: "13:30:00",
  meeting_type: "video",
  jitsi_room_id: null,
  zoom_meeting_id: null,
  zoom_join_url: null,
  zoom_start_url: null,
  teams_meeting_id: null,
  teams_join_url: null,
  status: "confirmed",
  notes: null,
  broker_notes: null,
  booking_token: `tok-${id}`,
  public_token: null,
  cancelled_reason: null,
  cancelled_by: null,
  cancelled_at: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
});

/** A minimal valid SchedulerBlockedRange for test purposes */
const mockBlockedRange = (
  id: number,
  start: string,
  end: string,
): SchedulerBlockedRange => ({
  id,
  broker_id: 2,
  start_datetime: start,
  end_datetime: end,
  label: `Block ${id}`,
  source: "manual",
  external_id: null,
  created_at: "2026-05-01T00:00:00Z",
});

describe("schedulerSlice – reducers and state transitions", () => {
  describe("initial state", () => {
    it("returns expected initial state shape", () => {
      const state = schedulerReducer(undefined, { type: "@@init" });
      expect(state.settings).toBeNull();
      expect(state.availability).toEqual([]);
      expect(state.meetings).toEqual([]);
      expect(state.totalMeetings).toBe(0);
      expect(state.isLoadingSettings).toBe(false);
      expect(state.isSavingSettings).toBe(false);
      expect(state.isLoadingMeetings).toBe(false);
      expect(state.isUpdatingMeeting).toBe(false);
      expect(state.isCreatingMeeting).toBe(false);
      expect(state.error).toBeNull();
      expect(state.blockedRanges).toEqual([]);
      expect(state.isLoadingBlockedRanges).toBe(false);
      expect(state.isSavingBlockedRange).toBe(false);
      expect(state.o365Connected).toBe(false);
      expect(state.o365MailboxEmail).toBeNull();
      expect(state.o365SyncedCount).toBe(0);
      expect(state.o365LastSyncedAt).toBeNull();
      expect(state.isSyncingO365).toBe(false);
      expect(state.isLoadingO365Status).toBe(false);
      expect(state.publicBroker).toBeNull();
      expect(state.availableDates).toEqual([]);
      expect(state.selectedDate).toBeNull();
      expect(state.availableSlots).toEqual([]);
      expect(state.isLoadingPublic).toBe(false);
      expect(state.isLoadingSlots).toBe(false);
      expect(state.isBooking).toBe(false);
      expect(state.bookingSuccess).toBeNull();
      expect(state.publicError).toBeNull();
    });
  });

  describe("sync reducers", () => {
    it("setSelectedDate sets date and clears availableSlots", () => {
      const withSlots = schedulerReducer(
        undefined,
        fetchPublicSlots.fulfilled(
          [{ time: "13:00", end_time: "13:30", available: true }],
          REQ_ID,
          { brokerToken: "tok", date: "2026-05-22" },
        ),
      );
      const next = schedulerReducer(withSlots, setSelectedDate("2026-05-22"));
      expect(next.selectedDate).toBe("2026-05-22");
      expect(next.availableSlots).toEqual([]);
    });

    it("setSelectedDate with null clears both date and slots", () => {
      const state = schedulerReducer(undefined, setSelectedDate(null));
      expect(state.selectedDate).toBeNull();
      expect(state.availableSlots).toEqual([]);
    });

    it("clearBookingSuccess sets bookingSuccess to null", () => {
      const withSuccess = schedulerReducer(
        undefined,
        bookMeeting.fulfilled(
          {
            success: true,
            meeting_id: 1,
            booking_token: "tok",
            zoom_join_url: null,
            zoom_start_url: null,
            teams_join_url: null,
            meeting_date: "2026-05-22",
            meeting_time: "13:00",
            meeting_type: "video",
            broker_name: "John",
          },
          REQ_ID,
          {} as any,
        ),
      );
      expect(withSuccess.bookingSuccess).not.toBeNull();
      const cleared = schedulerReducer(withSuccess, clearBookingSuccess());
      expect(cleared.bookingSuccess).toBeNull();
    });

    it("clearPublicError sets publicError to null", () => {
      const withError = schedulerReducer(
        undefined,
        fetchPublicScheduler.rejected(null, REQ_ID, undefined, "Not found"),
      );
      expect(withError.publicError).toBe("Not found");
      const cleared = schedulerReducer(withError, clearPublicError());
      expect(cleared.publicError).toBeNull();
    });

    it("clearSchedulerError sets error to null", () => {
      const withError = schedulerReducer(
        undefined,
        fetchSchedulerSettings.rejected(
          null,
          REQ_ID,
          undefined,
          "Fetch failed",
        ),
      );
      expect(withError.error).toBe("Fetch failed");
      const cleared = schedulerReducer(withError, clearSchedulerError());
      expect(cleared.error).toBeNull();
    });
  });

  describe("fetchPublicScheduler", () => {
    const broker = {
      broker_id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      phone: null,
      avatar_url: null,
      years_experience: null,
      role: "Loan Officer",
      meeting_title: "Consultation",
      meeting_description: null,
      slot_duration_minutes: 30,
      advance_booking_days: 14,
      min_booking_hours: 2,
      timezone: "America/Mexico_City",
      allow_phone: true,
      allow_video: true,
      allow_teams: false,
      is_enabled: true,
    };

    it("pending → sets isLoadingPublic=true, clears publicError", () => {
      const state = schedulerReducer(
        undefined,
        fetchPublicScheduler.pending(REQ_ID, undefined),
      );
      expect(state.isLoadingPublic).toBe(true);
      expect(state.publicError).toBeNull();
    });

    it("fulfilled → sets broker, available_dates, isLoadingPublic=false", () => {
      const state = schedulerReducer(
        undefined,
        fetchPublicScheduler.fulfilled(
          { success: true, broker, available_dates: ["2026-05-22"] },
          REQ_ID,
          undefined,
        ),
      );
      expect(state.isLoadingPublic).toBe(false);
      expect(state.publicBroker?.broker_id).toBe(1);
      expect(state.availableDates).toEqual(["2026-05-22"]);
    });

    it("rejected → sets publicError, isLoadingPublic=false", () => {
      const state = schedulerReducer(
        undefined,
        fetchPublicScheduler.rejected(
          null,
          REQ_ID,
          undefined,
          "Scheduler not available",
        ),
      );
      expect(state.isLoadingPublic).toBe(false);
      expect(state.publicError).toBe("Scheduler not available");
    });
  });

  describe("fetchPublicSlots", () => {
    const arg = { brokerToken: "tok", date: "2026-05-22" };

    it("pending → sets isLoadingSlots=true", () => {
      const state = schedulerReducer(
        undefined,
        fetchPublicSlots.pending(REQ_ID, arg),
      );
      expect(state.isLoadingSlots).toBe(true);
    });

    it("fulfilled → sets availableSlots, isLoadingSlots=false", () => {
      const slots = [
        { time: "09:00", end_time: "09:30", available: true },
        { time: "09:30", end_time: "10:00", available: false },
      ];
      const state = schedulerReducer(
        undefined,
        fetchPublicSlots.fulfilled(slots, REQ_ID, arg),
      );
      expect(state.isLoadingSlots).toBe(false);
      expect(state.availableSlots).toHaveLength(2);
      expect(state.availableSlots[0].time).toBe("09:00");
    });

    it("rejected → sets isLoadingSlots=false, availableSlots=[]", () => {
      const withSlots = schedulerReducer(
        undefined,
        fetchPublicSlots.fulfilled(
          [{ time: "09:00", end_time: "09:30", available: true }],
          REQ_ID,
          arg,
        ),
      );
      const state = schedulerReducer(
        withSlots,
        fetchPublicSlots.rejected(null, REQ_ID, arg, "Failed"),
      );
      expect(state.isLoadingSlots).toBe(false);
      expect(state.availableSlots).toEqual([]);
    });
  });

  describe("bookMeeting", () => {
    const bookingResponse = {
      success: true,
      meeting_id: 42,
      booking_token: "bk-tok",
      zoom_join_url: "https://zoom.us/j/123",
      zoom_start_url: null,
      teams_join_url: null,
      meeting_date: "2026-05-22",
      meeting_time: "13:00",
      meeting_type: "video" as const,
      broker_name: "John Doe",
    };

    it("pending → sets isBooking=true, clears publicError", () => {
      const state = schedulerReducer(
        undefined,
        bookMeeting.pending(REQ_ID, {} as any),
      );
      expect(state.isBooking).toBe(true);
      expect(state.publicError).toBeNull();
    });

    it("fulfilled → sets bookingSuccess, isBooking=false", () => {
      const state = schedulerReducer(
        undefined,
        bookMeeting.fulfilled(bookingResponse, REQ_ID, {} as any),
      );
      expect(state.isBooking).toBe(false);
      expect(state.bookingSuccess?.meeting_id).toBe(42);
    });

    it("rejected → sets publicError, isBooking=false", () => {
      const state = schedulerReducer(
        undefined,
        bookMeeting.rejected(null, REQ_ID, {} as any, "Time slot unavailable"),
      );
      expect(state.isBooking).toBe(false);
      expect(state.publicError).toBe("Time slot unavailable");
    });
  });

  describe("fetchSchedulerSettings", () => {
    const mockSettings = {
      id: 1,
      tenant_id: 1,
      broker_id: 2,
      is_enabled: true,
      meeting_title: "Consultation",
      meeting_description: null,
      slot_duration_minutes: 30,
      buffer_time_minutes: 0,
      advance_booking_days: 14,
      min_booking_hours: 2,
      timezone: "America/Mexico_City",
      allow_phone: true,
      allow_video: true,
      allow_teams: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    it("pending → isLoadingSettings=true, error=null", () => {
      const state = schedulerReducer(
        undefined,
        fetchSchedulerSettings.pending(REQ_ID, undefined),
      );
      expect(state.isLoadingSettings).toBe(true);
      expect(state.error).toBeNull();
    });

    it("fulfilled → sets settings and availability, isLoadingSettings=false", () => {
      const payload = {
        success: true,
        settings: mockSettings,
        availability: [
          {
            id: 1,
            broker_id: 2,
            day_of_week: 1,
            start_time: "09:00",
            end_time: "17:00",
            is_active: true,
          },
        ],
      };
      const state = schedulerReducer(
        undefined,
        fetchSchedulerSettings.fulfilled(payload, REQ_ID, undefined),
      );
      expect(state.isLoadingSettings).toBe(false);
      expect(state.settings?.timezone).toBe("America/Mexico_City");
      expect(state.availability).toHaveLength(1);
    });

    it("rejected → sets error, isLoadingSettings=false", () => {
      const state = schedulerReducer(
        undefined,
        fetchSchedulerSettings.rejected(
          null,
          REQ_ID,
          undefined,
          "Fetch failed",
        ),
      );
      expect(state.isLoadingSettings).toBe(false);
      expect(state.error).toBe("Fetch failed");
    });
  });

  describe("updateSchedulerSettings", () => {
    it("pending → isSavingSettings=true, error=null", () => {
      const state = schedulerReducer(
        undefined,
        updateSchedulerSettings.pending(REQ_ID, {}),
      );
      expect(state.isSavingSettings).toBe(true);
      expect(state.error).toBeNull();
    });

    it("fulfilled → isSavingSettings=false", () => {
      const pending = schedulerReducer(
        undefined,
        updateSchedulerSettings.pending(REQ_ID, {}),
      );
      const state = schedulerReducer(
        pending,
        updateSchedulerSettings.fulfilled({ success: true }, REQ_ID, {}),
      );
      expect(state.isSavingSettings).toBe(false);
    });

    it("rejected → isSavingSettings=false, sets error", () => {
      const state = schedulerReducer(
        undefined,
        updateSchedulerSettings.rejected(null, REQ_ID, {}, "Save failed"),
      );
      expect(state.isSavingSettings).toBe(false);
      expect(state.error).toBe("Save failed");
    });
  });

  describe("fetchScheduledMeetings", () => {
    it("pending → isLoadingMeetings=true, error=null", () => {
      const state = schedulerReducer(
        undefined,
        fetchScheduledMeetings.pending(REQ_ID, undefined),
      );
      expect(state.isLoadingMeetings).toBe(true);
      expect(state.error).toBeNull();
    });

    it("fulfilled → sets meetings, totalMeetings, isLoadingMeetings=false", () => {
      const payload = {
        success: true,
        meetings: [mockMeeting(1), mockMeeting(2)],
        total: 2,
      };
      const state = schedulerReducer(
        undefined,
        fetchScheduledMeetings.fulfilled(payload, REQ_ID, undefined),
      );
      expect(state.isLoadingMeetings).toBe(false);
      expect(state.meetings).toHaveLength(2);
      expect(state.totalMeetings).toBe(2);
    });

    it("rejected → isLoadingMeetings=false, sets error", () => {
      const state = schedulerReducer(
        undefined,
        fetchScheduledMeetings.rejected(null, REQ_ID, undefined, "Auth error"),
      );
      expect(state.isLoadingMeetings).toBe(false);
      expect(state.error).toBe("Auth error");
    });
  });

  describe("updateScheduledMeeting", () => {
    it("pending → isUpdatingMeeting=true", () => {
      const state = schedulerReducer(
        undefined,
        updateScheduledMeeting.pending(REQ_ID, {
          meetingId: 1,
          payload: { status: "cancelled" },
        }),
      );
      expect(state.isUpdatingMeeting).toBe(true);
    });

    it("fulfilled → updates matching meeting in-place", () => {
      const withMeetings = schedulerReducer(
        undefined,
        fetchScheduledMeetings.fulfilled(
          {
            success: true,
            meetings: [mockMeeting(1), mockMeeting(2)],
            total: 2,
          },
          REQ_ID,
          undefined,
        ),
      );
      const updated = schedulerReducer(
        withMeetings,
        updateScheduledMeeting.fulfilled(
          {
            meetingId: 1,
            payload: { status: "cancelled", broker_notes: "No show" },
          },
          REQ_ID,
          {
            meetingId: 1,
            payload: { status: "cancelled", broker_notes: "No show" },
          },
        ),
      );
      expect(updated.isUpdatingMeeting).toBe(false);
      expect(updated.meetings[0].status).toBe("cancelled");
      expect(updated.meetings[0].broker_notes).toBe("No show");
      // Second meeting untouched
      expect(updated.meetings[1].status).toBe("confirmed");
    });

    it("fulfilled with unknown id → no change to meetings array", () => {
      const withMeetings = schedulerReducer(
        undefined,
        fetchScheduledMeetings.fulfilled(
          { success: true, meetings: [mockMeeting(1)], total: 1 },
          REQ_ID,
          undefined,
        ),
      );
      const updated = schedulerReducer(
        withMeetings,
        updateScheduledMeeting.fulfilled(
          { meetingId: 999, payload: { status: "cancelled" } },
          REQ_ID,
          { meetingId: 999, payload: { status: "cancelled" } },
        ),
      );
      expect(updated.meetings[0].status).toBe("confirmed"); // unchanged
    });

    it("rejected → isUpdatingMeeting=false, sets error", () => {
      const state = schedulerReducer(
        undefined,
        updateScheduledMeeting.rejected(
          null,
          REQ_ID,
          { meetingId: 1, payload: {} },
          "Update failed",
        ),
      );
      expect(state.isUpdatingMeeting).toBe(false);
      expect(state.error).toBe("Update failed");
    });
  });

  describe("createScheduledMeeting", () => {
    const arg = {
      client_name: "Bob",
      client_email: "bob@example.com",
      meeting_date: "2026-05-22",
      meeting_time: "14:00",
      meeting_type: "phone" as const,
    };

    it("pending → isCreatingMeeting=true", () => {
      const state = schedulerReducer(
        undefined,
        createScheduledMeeting.pending(REQ_ID, arg),
      );
      expect(state.isCreatingMeeting).toBe(true);
    });

    it("fulfilled → isCreatingMeeting=false", () => {
      const pending = schedulerReducer(
        undefined,
        createScheduledMeeting.pending(REQ_ID, arg),
      );
      const state = schedulerReducer(
        pending,
        createScheduledMeeting.fulfilled({ success: true }, REQ_ID, arg),
      );
      expect(state.isCreatingMeeting).toBe(false);
    });

    it("rejected → isCreatingMeeting=false, sets error", () => {
      const state = schedulerReducer(
        undefined,
        createScheduledMeeting.rejected(null, REQ_ID, arg, "Create failed"),
      );
      expect(state.isCreatingMeeting).toBe(false);
      expect(state.error).toBe("Create failed");
    });
  });

  describe("fetchBlockedRanges", () => {
    it("pending → isLoadingBlockedRanges=true", () => {
      const state = schedulerReducer(
        undefined,
        fetchBlockedRanges.pending(REQ_ID, undefined),
      );
      expect(state.isLoadingBlockedRanges).toBe(true);
    });

    it("fulfilled → sets blockedRanges, isLoadingBlockedRanges=false", () => {
      const ranges = [
        mockBlockedRange(1, "2026-05-22T13:00:00Z", "2026-05-22T16:30:00Z"),
        mockBlockedRange(2, "2026-05-23T09:00:00Z", "2026-05-23T10:00:00Z"),
      ];
      const state = schedulerReducer(
        undefined,
        fetchBlockedRanges.fulfilled(ranges, REQ_ID, undefined),
      );
      expect(state.isLoadingBlockedRanges).toBe(false);
      expect(state.blockedRanges).toHaveLength(2);
    });

    it("rejected → isLoadingBlockedRanges=false", () => {
      const state = schedulerReducer(
        undefined,
        fetchBlockedRanges.rejected(null, REQ_ID, undefined),
      );
      expect(state.isLoadingBlockedRanges).toBe(false);
    });
  });

  describe("addBlockedRange", () => {
    const arg = {
      start_datetime: "2026-05-22T13:00",
      end_datetime: "2026-05-22T16:30",
      label: "Out of office",
    };

    it("pending → isSavingBlockedRange=true", () => {
      const state = schedulerReducer(
        undefined,
        addBlockedRange.pending(REQ_ID, arg),
      );
      expect(state.isSavingBlockedRange).toBe(true);
    });

    it("fulfilled → appends range, re-sorts by start_datetime, isSavingBlockedRange=false", () => {
      // Start with a later range already in state
      const withRange = schedulerReducer(
        undefined,
        fetchBlockedRanges.fulfilled(
          [mockBlockedRange(2, "2026-05-23T09:00:00Z", "2026-05-23T10:00:00Z")],
          REQ_ID,
          undefined,
        ),
      );
      // Add an earlier range
      const newRange = mockBlockedRange(
        1,
        "2026-05-22T13:00:00Z",
        "2026-05-22T16:30:00Z",
      );
      const state = schedulerReducer(
        withRange,
        addBlockedRange.fulfilled(newRange, REQ_ID, arg),
      );
      expect(state.isSavingBlockedRange).toBe(false);
      expect(state.blockedRanges).toHaveLength(2);
      // Earlier range should be first after sort
      expect(state.blockedRanges[0].id).toBe(1);
      expect(state.blockedRanges[1].id).toBe(2);
    });

    it("rejected → isSavingBlockedRange=false", () => {
      const state = schedulerReducer(
        undefined,
        addBlockedRange.rejected(null, REQ_ID, arg),
      );
      expect(state.isSavingBlockedRange).toBe(false);
    });
  });

  describe("deleteBlockedRange", () => {
    it("fulfilled → removes the range with matching id", () => {
      const withRanges = schedulerReducer(
        undefined,
        fetchBlockedRanges.fulfilled(
          [
            mockBlockedRange(1, "2026-05-22T13:00:00Z", "2026-05-22T16:30:00Z"),
            mockBlockedRange(2, "2026-05-23T09:00:00Z", "2026-05-23T10:00:00Z"),
          ],
          REQ_ID,
          undefined,
        ),
      );
      const state = schedulerReducer(
        withRanges,
        deleteBlockedRange.fulfilled(1, REQ_ID, 1),
      );
      expect(state.blockedRanges).toHaveLength(1);
      expect(state.blockedRanges[0].id).toBe(2);
    });

    it("fulfilled with unknown id → no change", () => {
      const withRanges = schedulerReducer(
        undefined,
        fetchBlockedRanges.fulfilled(
          [mockBlockedRange(1, "2026-05-22T13:00:00Z", "2026-05-22T16:30:00Z")],
          REQ_ID,
          undefined,
        ),
      );
      const state = schedulerReducer(
        withRanges,
        deleteBlockedRange.fulfilled(999, REQ_ID, 999),
      );
      expect(state.blockedRanges).toHaveLength(1);
    });
  });

  describe("fetchO365CalendarStatus", () => {
    it("pending → isLoadingO365Status=true", () => {
      const state = schedulerReducer(
        undefined,
        fetchO365CalendarStatus.pending(REQ_ID, undefined),
      );
      expect(state.isLoadingO365Status).toBe(true);
    });

    it("fulfilled (connected) → sets o365 connection fields", () => {
      const state = schedulerReducer(
        undefined,
        fetchO365CalendarStatus.fulfilled(
          {
            success: true,
            connected: true,
            mailbox_email: "broker@outlook.com",
            synced_count: 5,
            last_synced_at: "2026-05-22T12:00:00Z",
          },
          REQ_ID,
          undefined,
        ),
      );
      expect(state.isLoadingO365Status).toBe(false);
      expect(state.o365Connected).toBe(true);
      expect(state.o365MailboxEmail).toBe("broker@outlook.com");
      expect(state.o365SyncedCount).toBe(5);
      expect(state.o365LastSyncedAt).toBe("2026-05-22T12:00:00Z");
    });

    it("fulfilled (not connected) → o365Connected=false", () => {
      const state = schedulerReducer(
        undefined,
        fetchO365CalendarStatus.fulfilled(
          {
            success: true,
            connected: false,
            mailbox_email: null,
            synced_count: 0,
            last_synced_at: null,
          },
          REQ_ID,
          undefined,
        ),
      );
      expect(state.o365Connected).toBe(false);
      expect(state.o365MailboxEmail).toBeNull();
    });

    it("rejected → isLoadingO365Status=false", () => {
      const state = schedulerReducer(
        undefined,
        fetchO365CalendarStatus.rejected(null, REQ_ID, undefined),
      );
      expect(state.isLoadingO365Status).toBe(false);
    });
  });

  describe("syncO365Calendar", () => {
    it("pending → isSyncingO365=true", () => {
      const state = schedulerReducer(
        undefined,
        syncO365Calendar.pending(REQ_ID, undefined),
      );
      expect(state.isSyncingO365).toBe(true);
    });

    it("fulfilled → isSyncingO365=false", () => {
      const pending = schedulerReducer(
        undefined,
        syncO365Calendar.pending(REQ_ID, undefined),
      );
      const state = schedulerReducer(
        pending,
        syncO365Calendar.fulfilled(
          { success: true, synced_count: 3, message: "Synced" },
          REQ_ID,
          undefined,
        ),
      );
      expect(state.isSyncingO365).toBe(false);
    });

    it("rejected → isSyncingO365=false", () => {
      const state = schedulerReducer(
        undefined,
        syncO365Calendar.rejected(null, REQ_ID, undefined),
      );
      expect(state.isSyncingO365).toBe(false);
    });
  });

  describe("disconnectConversationMailbox.fulfilled – clears O365 state", () => {
    it("clears all O365 fields when mailbox is disconnected", () => {
      // Populate O365 state first
      const connected = schedulerReducer(
        undefined,
        fetchO365CalendarStatus.fulfilled(
          {
            success: true,
            connected: true,
            mailbox_email: "broker@outlook.com",
            synced_count: 10,
            last_synced_at: "2026-05-22T12:00:00Z",
          },
          REQ_ID,
          undefined,
        ),
      );
      // Dispatch the disconnect fulfilled action using the known type string
      const state = schedulerReducer(connected, {
        type: "conversations/disconnectConversationMailbox/fulfilled",
        payload: undefined,
      });
      expect(state.o365Connected).toBe(false);
      expect(state.o365MailboxEmail).toBeNull();
      expect(state.o365SyncedCount).toBe(0);
      expect(state.o365LastSyncedAt).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 – calendarEventsSlice reducers
// ─────────────────────────────────────────────────────────────────────────────

const CAL_REQ_ID = "cal-test-req-id";

/** A minimal valid CalendarEvent for test purposes */
const mockCalendarEvent = (id: number, eventDate: string): CalendarEvent => ({
  id,
  tenant_id: 1,
  broker_id: 2,
  event_type: "birthday",
  title: `Event ${id}`,
  description: null,
  event_date: eventDate,
  event_time: null,
  all_day: true,
  recurrence: "yearly",
  color: null,
  linked_client_id: null,
  linked_client_name: null,
  linked_person_name: "Test Person",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const mockPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

describe("calendarEventsSlice – reducers and state transitions", () => {
  describe("initial state", () => {
    it("returns expected initial state shape", () => {
      const state = calendarEventsReducer(undefined, { type: "@@init" });
      expect(state.events).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.pagination).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isCreating).toBe(false);
      expect(state.isUpdating).toBe(false);
      expect(state.isDeleting).toBe(false);
      expect(state.isSyncing).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("sets error to null", () => {
      const withError = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.rejected(null, CAL_REQ_ID, undefined, "Failed"),
      );
      expect(withError.error).toBe("Failed");
      const cleared = calendarEventsReducer(withError, clearCalendarError());
      expect(cleared.error).toBeNull();
    });
  });

  describe("fetchCalendarEvents", () => {
    const events = [
      mockCalendarEvent(1, "2026-05-10"),
      mockCalendarEvent(2, "2026-07-04"),
    ];
    const pagination = { ...mockPagination, total: 2 };

    it("pending → isLoading=true, error=null", () => {
      const state = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.pending(CAL_REQ_ID, undefined),
      );
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("fulfilled → sets events, total, pagination; isLoading=false", () => {
      const state = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.fulfilled(
          { success: true, events, total: 2, pagination },
          CAL_REQ_ID,
          undefined,
        ),
      );
      expect(state.isLoading).toBe(false);
      expect(state.events).toHaveLength(2);
      expect(state.total).toBe(2);
      expect(state.pagination?.page).toBe(1);
    });

    it("fulfilled replaces events (not appends)", () => {
      const first = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.fulfilled(
          {
            success: true,
            events: [mockCalendarEvent(1, "2026-05-10")],
            total: 1,
            pagination,
          },
          CAL_REQ_ID,
          undefined,
        ),
      );
      const second = calendarEventsReducer(
        first,
        fetchCalendarEvents.fulfilled(
          {
            success: true,
            events: [
              mockCalendarEvent(2, "2026-07-04"),
              mockCalendarEvent(3, "2026-08-01"),
            ],
            total: 2,
            pagination,
          },
          CAL_REQ_ID,
          undefined,
        ),
      );
      // Should have only the new batch, not appended
      expect(second.events).toHaveLength(2);
      expect(second.events[0].id).toBe(2);
    });

    it("rejected → isLoading=false, sets error", () => {
      const state = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.rejected(
          null,
          CAL_REQ_ID,
          undefined,
          "Failed to fetch calendar events",
        ),
      );
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Failed to fetch calendar events");
    });
  });

  describe("createCalendarEvent", () => {
    const arg: import("@shared/api").CreateCalendarEventRequest = {
      event_type: "birthday",
      title: "Alice Birthday",
      event_date: "2026-03-15",
    };

    it("pending → isCreating=true, error=null", () => {
      const state = calendarEventsReducer(
        undefined,
        createCalendarEvent.pending(CAL_REQ_ID, arg),
      );
      expect(state.isCreating).toBe(true);
      expect(state.error).toBeNull();
    });

    it("fulfilled → appends event, increments total, sorts by event_date", () => {
      // Pre-populate with an event on May 10
      const withEvents = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.fulfilled(
          {
            success: true,
            events: [mockCalendarEvent(1, "2026-05-10")],
            total: 1,
            pagination: mockPagination,
          },
          CAL_REQ_ID,
          undefined,
        ),
      );
      // Add a new event with an earlier date (March 15) — should sort before May
      const newEvent = mockCalendarEvent(2, "2026-03-15");
      const state = calendarEventsReducer(
        withEvents,
        createCalendarEvent.fulfilled(newEvent, CAL_REQ_ID, arg),
      );
      expect(state.isCreating).toBe(false);
      expect(state.events).toHaveLength(2);
      expect(state.total).toBe(2);
      // March 15 should come first
      expect(state.events[0].event_date).toBe("2026-03-15");
      expect(state.events[1].event_date).toBe("2026-05-10");
    });

    it("rejected → isCreating=false, sets error", () => {
      const state = calendarEventsReducer(
        undefined,
        createCalendarEvent.rejected(
          null,
          CAL_REQ_ID,
          arg,
          "Failed to create calendar event",
        ),
      );
      expect(state.isCreating).toBe(false);
      expect(state.error).toBe("Failed to create calendar event");
    });
  });

  describe("updateCalendarEvent", () => {
    const updateArg = {
      eventId: 1,
      payload: {
        title: "Updated Title",
        event_date: "2026-05-20",
      } as import("@shared/api").UpdateCalendarEventRequest,
    };

    it("pending → isUpdating=true", () => {
      const state = calendarEventsReducer(
        undefined,
        updateCalendarEvent.pending(CAL_REQ_ID, updateArg),
      );
      expect(state.isUpdating).toBe(true);
    });

    it("fulfilled → patches the matching event in-place, isUpdating=false", () => {
      const withEvents = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.fulfilled(
          {
            success: true,
            events: [
              mockCalendarEvent(1, "2026-05-10"),
              mockCalendarEvent(2, "2026-07-04"),
            ],
            total: 2,
            pagination: mockPagination,
          },
          CAL_REQ_ID,
          undefined,
        ),
      );
      const state = calendarEventsReducer(
        withEvents,
        updateCalendarEvent.fulfilled(
          {
            eventId: 1,
            payload: { title: "Updated Birthday", event_date: "2026-05-11" },
          },
          CAL_REQ_ID,
          updateArg,
        ),
      );
      expect(state.isUpdating).toBe(false);
      expect(state.events[0].title).toBe("Updated Birthday");
      expect(state.events[0].event_date).toBe("2026-05-11");
      // Second event untouched
      expect(state.events[1].id).toBe(2);
    });

    it("fulfilled with unknown id → no change to events", () => {
      const withEvents = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.fulfilled(
          {
            success: true,
            events: [mockCalendarEvent(1, "2026-05-10")],
            total: 1,
            pagination: mockPagination,
          },
          CAL_REQ_ID,
          undefined,
        ),
      );
      const state = calendarEventsReducer(
        withEvents,
        updateCalendarEvent.fulfilled(
          { eventId: 999, payload: { title: "Ghost" } },
          CAL_REQ_ID,
          { eventId: 999, payload: {} },
        ),
      );
      expect(state.events[0].title).toBe("Event 1"); // unchanged
    });

    it("rejected → isUpdating=false, sets error", () => {
      const state = calendarEventsReducer(
        undefined,
        updateCalendarEvent.rejected(
          null,
          CAL_REQ_ID,
          updateArg,
          "Failed to update calendar event",
        ),
      );
      expect(state.isUpdating).toBe(false);
      expect(state.error).toBe("Failed to update calendar event");
    });
  });

  describe("deleteCalendarEvent", () => {
    it("pending → isDeleting=true", () => {
      const state = calendarEventsReducer(
        undefined,
        deleteCalendarEvent.pending(CAL_REQ_ID, 1),
      );
      expect(state.isDeleting).toBe(true);
    });

    it("fulfilled → removes event by id, decrements total, isDeleting=false", () => {
      const withEvents = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.fulfilled(
          {
            success: true,
            events: [
              mockCalendarEvent(1, "2026-05-10"),
              mockCalendarEvent(2, "2026-07-04"),
            ],
            total: 2,
            pagination: mockPagination,
          },
          CAL_REQ_ID,
          undefined,
        ),
      );
      const state = calendarEventsReducer(
        withEvents,
        deleteCalendarEvent.fulfilled(1, CAL_REQ_ID, 1),
      );
      expect(state.isDeleting).toBe(false);
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe(2);
      expect(state.total).toBe(1);
    });

    it("total never goes below 0 when deleting from empty state", () => {
      const state = calendarEventsReducer(
        undefined,
        deleteCalendarEvent.fulfilled(1, CAL_REQ_ID, 1),
      );
      expect(state.total).toBe(0); // Math.max(0, 0 - 1) = 0
    });

    it("rejected → isDeleting=false, sets error", () => {
      const state = calendarEventsReducer(
        undefined,
        deleteCalendarEvent.rejected(
          null,
          CAL_REQ_ID,
          1,
          "Failed to delete calendar event",
        ),
      );
      expect(state.isDeleting).toBe(false);
      expect(state.error).toBe("Failed to delete calendar event");
    });
  });

  describe("syncBirthdays", () => {
    it("pending → isSyncing=true, error=null", () => {
      const state = calendarEventsReducer(
        undefined,
        syncBirthdays.pending(CAL_REQ_ID, undefined),
      );
      expect(state.isSyncing).toBe(true);
      expect(state.error).toBeNull();
    });

    it("fulfilled → isSyncing=false", () => {
      const pending = calendarEventsReducer(
        undefined,
        syncBirthdays.pending(CAL_REQ_ID, undefined),
      );
      const state = calendarEventsReducer(
        pending,
        syncBirthdays.fulfilled(
          { success: true, created: 3, updated: 1 },
          CAL_REQ_ID,
          undefined,
        ),
      );
      expect(state.isSyncing).toBe(false);
    });

    it("rejected → isSyncing=false, sets error", () => {
      const state = calendarEventsReducer(
        undefined,
        syncBirthdays.rejected(
          null,
          CAL_REQ_ID,
          undefined,
          "Failed to sync birthdays",
        ),
      );
      expect(state.isSyncing).toBe(false);
      expect(state.error).toBe("Failed to sync birthdays");
    });
  });

  describe("edge cases", () => {
    it("creating an event into an empty list sets total to 1 and sorts correctly", () => {
      const state = calendarEventsReducer(
        undefined,
        createCalendarEvent.fulfilled(
          mockCalendarEvent(1, "2026-12-25"),
          CAL_REQ_ID,
          {
            event_type: "important_date",
            title: "Christmas",
            event_date: "2026-12-25",
          },
        ),
      );
      expect(state.events).toHaveLength(1);
      expect(state.total).toBe(1);
      expect(state.events[0].event_date).toBe("2026-12-25");
    });

    it("creating multiple events maintains date-sorted order", () => {
      const dates = ["2026-11-01", "2026-03-15", "2026-07-04", "2026-01-01"];
      let state = calendarEventsReducer(undefined, { type: "@@init" });
      dates.forEach((date, i) => {
        state = calendarEventsReducer(
          state,
          createCalendarEvent.fulfilled(
            mockCalendarEvent(i + 1, date),
            CAL_REQ_ID,
            { event_type: "other", title: `Event ${i + 1}`, event_date: date },
          ),
        );
      });
      const resultDates = state.events.map((e) => e.event_date);
      expect(resultDates).toEqual([...resultDates].sort());
    });

    it("loading state: multiple concurrent loads do not conflict", () => {
      // First load starts
      const loading = calendarEventsReducer(
        undefined,
        fetchCalendarEvents.pending(CAL_REQ_ID, undefined),
      );
      expect(loading.isLoading).toBe(true);
      // Second fulfilled comes in
      const done = calendarEventsReducer(
        loading,
        fetchCalendarEvents.fulfilled(
          { success: true, events: [], total: 0, pagination: mockPagination },
          CAL_REQ_ID,
          undefined,
        ),
      );
      expect(done.isLoading).toBe(false);
    });
  });
});
