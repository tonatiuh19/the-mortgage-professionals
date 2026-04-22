/**
 * BrokerTimePicker
 *
 * Shows a grid of time slots fetched from the broker's public availability API.
 * Unavailable slots are shown as disabled. Selected slot is highlighted.
 * Displays an inline warning when no slots or selected slot is unavailable.
 *
 * Props:
 *   date         – "YYYY-MM-DD" — required before fetching
 *   value        – selected time "HH:MM" or ""
 *   onChange     – called with "HH:MM"
 *   brokerToken  – broker public_token (undefined → uses "default")
 *   disabled?    – disable the whole picker
 */

import React, { useEffect } from "react";
import { Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPublicSlots } from "@/store/slices/schedulerSlice";

interface BrokerTimePickerProps {
  date: string; // "YYYY-MM-DD" or ""
  value: string; // "HH:MM" or ""
  onChange: (time: string) => void;
  brokerToken?: string;
  disabled?: boolean;
}

function fmt12(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

export function BrokerTimePicker({
  date,
  value,
  onChange,
  brokerToken,
  disabled,
}: BrokerTimePickerProps) {
  const dispatch = useAppDispatch();
  const { availableSlots, isLoadingSlots } = useAppSelector((s) => s.scheduler);

  useEffect(() => {
    if (date) {
      dispatch(fetchPublicSlots({ brokerToken, date }));
    }
  }, [date, brokerToken, dispatch]);

  if (!date) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Select a date first to see available times.
      </div>
    );
  }

  if (isLoadingSlots) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Loading available slots…
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600 py-2 px-3 bg-amber-50 rounded-lg border border-amber-200">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        No availability on this date. Please pick a different day.
      </div>
    );
  }

  const selectedSlot = availableSlots.find((s) => s.time === value);
  const isSelectedUnavailable =
    value && selectedSlot && !selectedSlot.available;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
        {availableSlots.map((slot) => (
          <button
            key={slot.time}
            type="button"
            disabled={disabled || !slot.available}
            onClick={() => onChange(slot.time)}
            className={cn(
              "text-xs rounded-lg border px-2 py-1.5 font-medium transition-all duration-150",
              slot.available
                ? value === slot.time
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-background text-foreground border-border hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700"
                : "bg-muted/40 text-muted-foreground border-muted cursor-not-allowed line-through opacity-50",
            )}
          >
            {fmt12(slot.time)}
          </button>
        ))}
      </div>

      {isSelectedUnavailable && (
        <div className="flex items-center gap-2 text-xs text-red-600 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          This time slot is no longer available. Please select a different time.
        </div>
      )}
    </div>
  );
}
