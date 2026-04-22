/**
 * BrokerDatePicker
 *
 * A calendar popover that only enables days that:
 *  - Fall within the broker's active availability windows (day_of_week)
 *  - Are not further than `advance_booking_days` from today
 *  - Are not in the past
 *
 * Props:
 *   value        – selected date as "YYYY-MM-DD" or ""
 *   onChange     – called with "YYYY-MM-DD"
 *   availability – broker's SchedulerAvailability[]
 *   settings     – broker's SchedulerSettings (advance_booking_days)
 *   disabled?    – disable the trigger
 */

import React, { useMemo, useState } from "react";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { SchedulerAvailability, SchedulerSettings } from "@shared/api";

interface BrokerDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  availability: SchedulerAvailability[];
  settings: SchedulerSettings | null;
  disabled?: boolean;
}

export function BrokerDatePicker({
  value,
  onChange,
  availability,
  settings,
  disabled,
}: BrokerDatePickerProps) {
  const [open, setOpen] = useState(false);

  const today = startOfToday();
  const maxDate = addDays(today, settings?.advance_booking_days ?? 60);

  // Set of active day-of-week numbers (0=Sun…6=Sat)
  const activeDays = useMemo(
    () =>
      new Set(
        availability.filter((a) => a.is_active).map((a) => a.day_of_week),
      ),
    [availability],
  );

  // DayPicker matcher — disable days that are outside broker availability
  const isDisabled = (date: Date) => {
    if (date < today) return true;
    if (date > maxDate) return true;
    if (!activeDays.has(date.getDay())) return true;
    return false;
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
            "w-full h-9 justify-start text-sm font-normal gap-2",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {activeDays.size === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No availability configured for this broker.
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
            fromDate={today}
            toDate={maxDate}
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
