/**
 * ClientDatePicker
 *
 * A calendar popover for client-facing pages (scheduler, reschedule).
 * Uses a pre-computed list of available dates from the public scheduler API
 * instead of raw availability windows.
 *
 * Props:
 *   value          – selected date as "YYYY-MM-DD" or ""
 *   onChange       – called with "YYYY-MM-DD"
 *   availableDates – list of enabled date strings from public scheduler API
 *   disabled?      – disable the trigger button
 */

import React, { useMemo, useState } from "react";
import { format, parseISO, startOfToday } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ClientDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  availableDates: string[]; // pre-computed list from public scheduler API
  disabled?: boolean;
}

export function ClientDatePicker({
  value,
  onChange,
  availableDates,
  disabled,
}: ClientDatePickerProps) {
  const [open, setOpen] = useState(false);

  const today = startOfToday();

  // Build a Set for O(1) lookup
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  // Derive min/max from the available dates list for DayPicker bounds
  const sortedDates = useMemo(
    () => availableDates.map((d) => parseISO(d)).sort((a, b) => +a - +b),
    [availableDates],
  );
  const fromDate = sortedDates[0] ?? today;
  const toDate = sortedDates[sortedDates.length - 1] ?? today;

  const isDisabled = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return !availableSet.has(key);
  };

  const selected = value ? parseISO(value) : undefined;
  const displayLabel = value
    ? format(parseISO(value), "MMM d, yyyy")
    : "Pick a date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-10 justify-start text-sm font-normal gap-2",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {availableDates.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No available dates at this time.
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            disabled={isDisabled}
            fromDate={fromDate}
            toDate={toDate}
            showOutsideDays={false}
            classNames={{
              selected:
                "bg-violet-600 text-white hover:bg-violet-700 focus:bg-violet-600 hover:text-white",
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
