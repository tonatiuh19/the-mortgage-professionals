import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Phone,
  Video,
  Plus,
  Settings2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  UserPlus,
  Loader2,
  Edit2,
  Pencil,
  Trash2,
  List,
  Copy,
  ExternalLink,
  Save,
  Cake,
  Home,
  Star,
  Bell,
  Heart,
  Sparkles,
  ListFilter,
  LayoutGrid,
  Search,
  ChevronsUpDown,
  Check,
  X,
  Lock,
  MapPin,
  ChevronDown,
  Info,
  Dot,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSchedulerSettings,
  updateSchedulerSettings,
  fetchScheduledMeetings,
  updateScheduledMeeting,
  createScheduledMeeting,
  clearError as clearSchedulerError,
  fetchBlockedRanges,
  addBlockedRange,
  deleteBlockedRange,
} from "@/store/slices/schedulerSlice";
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncBirthdays,
  clearError as clearCalendarError,
} from "@/store/slices/calendarEventsSlice";
import { fetchBrokers } from "@/store/slices/brokersSlice";
import { fetchClients, createClient } from "@/store/slices/clientsSlice";
import type {
  ScheduledMeeting,
  SchedulerAvailability,
  MeetingStatus,
  MeetingType,
  CalendarEvent,
  CalendarEventType,
  CreateCalendarEventRequest,
} from "@shared/api";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BrokerDatePicker } from "@/components/BrokerDatePicker";
import { BrokerTimePicker } from "@/components/BrokerTimePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const TIMEZONES = [
  {
    value: "America/New_York",
    label: "Eastern Time",
    cities: "New York, Miami, Atlanta",
  },
  {
    value: "America/Chicago",
    label: "Central Time",
    cities: "Chicago, Dallas, Houston",
  },
  {
    value: "America/Denver",
    label: "Mountain Time",
    cities: "Denver, Salt Lake City",
  },
  {
    value: "America/Phoenix",
    label: "Mountain (no DST)",
    cities: "Phoenix, Tucson",
  },
  {
    value: "America/Los_Angeles",
    label: "Pacific Time",
    cities: "Los Angeles, Seattle, Las Vegas",
  },
  {
    value: "America/Anchorage",
    label: "Alaska Time",
    cities: "Anchorage, Fairbanks",
  },
  { value: "Pacific/Honolulu", label: "Hawaii Time", cities: "Honolulu, Maui" },
];

function tzOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

const STATUS_CONFIG: Record<
  MeetingStatus,
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  pending: {
    label: "Pending",
    color:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
    icon: XCircle,
  },
  completed: {
    label: "Completed",
    color:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    icon: CheckCircle2,
  },
  no_show: {
    label: "No Show",
    color:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-500/15 dark:text-foreground/80 dark:border-slate-500/30",
    icon: AlertCircle,
  },
};

export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  {
    label: string;
    color: string;
    dotColor: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  birthday: {
    label: "Birthday",
    color: "bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-500/40",
    dotColor: "bg-pink-500",
    icon: Cake,
  },
  home_anniversary: {
    label: "Home Anniversary",
    color:
      "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
    dotColor: "bg-amber-500",
    icon: Home,
  },
  realtor_anniversary: {
    label: "Realtor Anniversary",
    color:
      "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40",
    dotColor: "bg-violet-500",
    icon: Star,
  },
  important_date: {
    label: "Important Date",
    color: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40",
    dotColor: "bg-cyan-500",
    icon: Sparkles,
  },
  reminder: {
    label: "Reminder",
    color:
      "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40",
    dotColor: "bg-orange-500",
    icon: Bell,
  },
  other: {
    label: "Other",
    color:
      "bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/40",
    dotColor: "bg-slate-500",
    icon: Heart,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEE, MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function meetingWithLabel(meeting: ScheduledMeeting): string {
  const first = meeting.broker_first_name?.trim() ?? "";
  const last = meeting.broker_last_name?.trim() ?? "";
  const fullName = [first, last].filter(Boolean).join(" ").trim();
  return fullName || "Unassigned Partner / Mortgage Banker";
}

function defaultAvailability(): SchedulerAvailability[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    id: d,
    broker_id: 0,
    day_of_week: d,
    start_time: "09:00:00",
    end_time: "17:00:00",
    is_active: d >= 1 && d <= 5,
  }));
}

// ─── Unified calendar day type ────────────────────────────────────────────────

type DayItem =
  | { kind: "meeting"; data: ScheduledMeeting }
  | { kind: "event"; data: CalendarEvent };

// ─── Client Picker ────────────────────────────────────────────────────────────

export type ClientPickerMode = "existing" | "new" | "none";

export interface NewClientFields {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface ClientPickerValue {
  mode: ClientPickerMode;
  existingClientId?: number;
  newClient?: NewClientFields;
}

const EMPTY_NEW_CLIENT: NewClientFields = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
};

function ClientPicker({
  value,
  onChange,
  optional = false,
}: {
  value: ClientPickerValue;
  onChange: (v: ClientPickerValue) => void;
  optional?: boolean;
}) {
  const { clients, isLoading: clientsLoading } = useAppSelector(
    (s) => s.clients,
  );
  const [comboOpen, setComboOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedClient =
    clients.find((c) => c.id === value.existingClientId) ?? null;

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  const cards = [
    {
      key: "existing" as const,
      label: "Existing Client",
      desc: "Pick from your list",
      icon: <User className="h-4 w-4" />,
    },
    {
      key: "new" as const,
      label: "New Client",
      desc: "Create a profile",
      icon: <UserPlus className="h-4 w-4" />,
    },
    ...(optional
      ? [
          {
            key: "none" as const,
            label: "No Client",
            desc: "Skip or use name only",
            icon: <X className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div
        className={cn("grid gap-2", optional ? "grid-cols-3" : "grid-cols-2")}
      >
        {cards.map(({ key, label, desc, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              onChange({ ...value, mode: key, existingClientId: undefined })
            }
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
              value.mode === key
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
          >
            <span
              className={cn(
                "p-1.5 rounded-lg",
                value.mode === key
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {icon}
            </span>
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-[10px] opacity-70 leading-tight">{desc}</span>
          </button>
        ))}
      </div>

      {value.mode === "existing" && (
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30",
                !selectedClient && "text-muted-foreground",
              )}
            >
              {selectedClient ? (
                <span className="flex items-center gap-2 min-w-0">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                    {selectedClient.first_name[0]}
                    {selectedClient.last_name[0]}
                  </span>
                  <span className="font-medium truncate">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    &mdash; {selectedClient.email}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search by name, email or phone…
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
            sideOffset={4}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search client…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-60">
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={String(c.id)}
                          onSelect={() => {
                            onChange({
                              ...value,
                              mode: "existing",
                              existingClientId: c.id,
                            });
                            setComboOpen(false);
                            setSearch("");
                          }}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <span className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                            {c.first_name[0]}
                            {c.last_name[0]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {c.first_name} {c.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.email}
                            </p>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4 text-primary shrink-0",
                              value.existingClientId === c.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {value.mode === "new" && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground/70 text-xs mb-1 block">
                First Name *
              </Label>
              <Input
                value={value.newClient?.first_name ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    newClient: {
                      ...EMPTY_NEW_CLIENT,
                      ...value.newClient,
                      first_name: e.target.value,
                    },
                  })
                }
                placeholder="Maria"
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-foreground/70 text-xs mb-1 block">
                Last Name *
              </Label>
              <Input
                value={value.newClient?.last_name ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    newClient: {
                      ...EMPTY_NEW_CLIENT,
                      ...value.newClient,
                      last_name: e.target.value,
                    },
                  })
                }
                placeholder="Lopez"
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-foreground/70 text-xs mb-1 block">
              Email *
            </Label>
            <Input
              value={value.newClient?.email ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  newClient: {
                    ...EMPTY_NEW_CLIENT,
                    ...value.newClient,
                    email: e.target.value,
                  },
                })
              }
              type="email"
              placeholder="maria@example.com"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-foreground/70 text-xs mb-1 block">
              Phone
            </Label>
            <Input
              value={value.newClient?.phone ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  newClient: {
                    ...EMPTY_NEW_CLIENT,
                    ...value.newClient,
                    phone: e.target.value,
                  },
                })
              }
              placeholder="(555) 000-0000"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onEdit,
}: {
  meeting: ScheduledMeeting;
  onEdit: (m: ScheduledMeeting) => void;
}) {
  const cfg = STATUS_CONFIG[meeting.status];
  const Icon = cfg.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-muted/30 p-4 hover:border-border transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                cfg.color,
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5 border border-border/50">
              {meeting.meeting_type === "phone" ? (
                <>
                  <Phone className="h-3 w-3" /> Phone
                </>
              ) : (
                <>
                  <Video className="h-3 w-3" /> Video
                </>
              )}
            </span>
          </div>
          <h4 className="font-semibold text-foreground truncate">
            {meeting.client_name}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {meeting.client_email}
          </p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" />
            With {meetingWithLabel(meeting)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-primary" />
              {formatDate(meeting.meeting_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              {formatTime(meeting.meeting_time)}
            </span>
          </div>
          {meeting.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
              "{meeting.notes}"
            </p>
          )}
        </div>
        <button
          onClick={() => onEdit(meeting)}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit: (e: CalendarEvent) => void;
  onDelete: (e: CalendarEvent) => void;
}) {
  const cfg = EVENT_TYPE_CONFIG[event.event_type];
  const Icon = cfg.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-muted/30 p-4 hover:border-border transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                cfg.color,
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            {event.recurrence === "yearly" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5 border border-border/50">
                <RefreshCw className="h-3 w-3" /> Yearly
              </span>
            )}
          </div>
          <h4 className="font-semibold text-foreground truncate">
            {event.title}
          </h4>
          {(event.linked_client_name || event.linked_person_name) && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3" />
              {event.linked_client_name || event.linked_person_name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-primary" />
              {formatDate(event.event_date)}
            </span>
            {!event.all_day && event.event_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                {formatTime(event.event_time)}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
              "{event.description}"
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => onEdit(event)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(event)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Unified Calendar View ────────────────────────────────────────────────────

function UnifiedCalendarView({
  meetings,
  events,
  onEditMeeting,
  onEditEvent,
  viewDate,
  onViewDateChange,
}: {
  meetings: ScheduledMeeting[];
  events: CalendarEvent[];
  onEditMeeting: (m: ScheduledMeeting) => void;
  onEditEvent: (e: CalendarEvent) => void;
  viewDate: Date;
  onViewDateChange: (d: Date) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = getDay(monthStart);
  const emptyBefore = Array(firstDayOffset).fill(null);

  // Index meetings by date
  const meetingsByDate = meetings.reduce<Record<string, ScheduledMeeting[]>>(
    (acc, m) => {
      const key = m.meeting_date.split("T")[0];
      acc[key] = acc[key] || [];
      acc[key].push(m);
      return acc;
    },
    {},
  );

  // Index events by date — for yearly recurrence, also show them in the current year
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>(
    (acc, e) => {
      let key = e.event_date.split("T")[0];
      if (e.recurrence === "yearly") {
        const base = parseISO(key);
        const thisYear = viewDate.getFullYear();
        key = `${thisYear}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
      }
      acc[key] = acc[key] || [];
      acc[key].push(e);
      return acc;
    },
    {},
  );

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedMeetings = selectedKey
    ? (meetingsByDate[selectedKey] ?? [])
    : [];
  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] ?? []) : [];

  return (
    <div className="flex flex-col h-full gap-2 sm:gap-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onViewDateChange(subMonths(viewDate, 1))}
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-semibold text-foreground text-base">
          {format(viewDate, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => onViewDateChange(addMonths(viewDate, 1))}
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — flex-1 so it fills remaining vertical space */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1 sm:gap-1.5 min-h-0">
        {emptyBefore.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayMeetings = meetingsByDate[key] ?? [];
          const dayEvents = eventsByDate[key] ?? [];
          const hasItems = dayMeetings.length > 0 || dayEvents.length > 0;
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const todayFlag = isToday(day);

          return (
            <button
              key={key}
              onClick={() =>
                setSelectedDay(
                  isSameDay(day, selectedDay ?? new Date(0)) ? null : day,
                )
              }
              className={cn(
                "h-full min-h-[48px] rounded-lg p-1.5 sm:p-2 flex flex-col items-start gap-0.5 transition-all border text-sm overflow-hidden",
                isSelected
                  ? "border-primary bg-primary/10"
                  : todayFlag
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-muted/30",
                !isSameMonth(day, viewDate) && "opacity-40",
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium shrink-0 self-center sm:self-start",
                  todayFlag &&
                    !isSelected &&
                    "bg-primary text-primary-foreground",
                  isSelected && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>

              {hasItems && (
                <div className="flex flex-col gap-0.5 w-full min-w-0 mt-0.5">
                  {/* sm and below: color dots */}
                  <div className="flex flex-wrap gap-0.5 justify-center sm:justify-start lg:hidden">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <span
                        key={`m-${m.id}`}
                        className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                      />
                    ))}
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={`e-${e.id}`}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          EVENT_TYPE_CONFIG[e.event_type].dotColor,
                        )}
                      />
                    ))}
                    {dayMeetings.length + dayEvents.length > 5 && (
                      <span className="text-[9px] text-muted-foreground leading-none">
                        +{dayMeetings.length + dayEvents.length - 5}
                      </span>
                    )}
                  </div>

                  {/* lg+: label pills */}
                  <div className="hidden lg:flex flex-col gap-0.5 w-full">
                    {dayMeetings.slice(0, 1).map((m) => (
                      <span
                        key={`m-${m.id}`}
                        className="flex items-center gap-1 text-[10px] leading-tight rounded-sm px-1 py-0.5 bg-primary/15 text-primary truncate w-full"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate">{m.client_name}</span>
                      </span>
                    ))}
                    {dayEvents.slice(0, 2).map((e) => {
                      const cfg = EVENT_TYPE_CONFIG[e.event_type];
                      const Icon = cfg.icon;
                      // For birthdays strip "'s Birthday" suffix to fit more name
                      const displayTitle =
                        e.event_type === "birthday"
                          ? e.title.replace(/'s Birthday.*$/i, "")
                          : e.title;
                      return (
                        <span
                          key={`e-${e.id}`}
                          className={cn(
                            "flex items-center gap-1 text-[10px] leading-tight rounded-sm px-1 py-0.5 truncate w-full",
                            cfg.color,
                          )}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{displayTitle}</span>
                        </span>
                      );
                    })}
                    {dayMeetings.length + dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{dayMeetings.length + dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend — compact single line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-border/20">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" /> Meeting
        </span>
        {(
          Object.entries(EVENT_TYPE_CONFIG) as [
            CalendarEventType,
            (typeof EVENT_TYPE_CONFIG)[CalendarEventType],
          ][]
        ).map(([type, cfg]) => (
          <span
            key={type}
            className="flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            <span className={cn("w-2 h-2 rounded-full", cfg.dotColor)} />{" "}
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Selected day detail — slides in below legend without disrupting the grid */}
      <AnimatePresence>
        {selectedDay &&
          (selectedMeetings.length > 0 || selectedEvents.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2"
            >
              <h4 className="font-semibold text-foreground text-sm">
                {format(selectedDay, "EEEE, MMMM d")}
              </h4>
              {selectedMeetings.map((m) => (
                <div
                  key={`m-${m.id}`}
                  onClick={() => onEditMeeting(m)}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer border border-border/30 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.client_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      With {meetingWithLabel(m)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(m.meeting_time)} ·{" "}
                      {m.meeting_type === "phone" ? "Phone" : "Video"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-semibold",
                      STATUS_CONFIG[m.status].color,
                    )}
                  >
                    {STATUS_CONFIG[m.status].label}
                  </span>
                </div>
              ))}
              {selectedEvents.map((e) => {
                const cfg = EVENT_TYPE_CONFIG[e.event_type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={`e-${e.id}`}
                    onClick={() => onEditEvent(e)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer border border-border/30 transition-all"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        cfg.dotColor,
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {e.title}
                      </p>
                      {(e.linked_client_name || e.linked_person_name) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {e.linked_client_name || e.linked_person_name}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold",
                        cfg.color,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
      </AnimatePresence>

      {selectedDay &&
        selectedMeetings.length === 0 &&
        selectedEvents.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground py-4"
          >
            No events on {format(selectedDay, "MMMM d")}
          </motion.p>
        )}
    </div>
  );
}

// ─── Edit Meeting Dialog ──────────────────────────────────────────────────────

function EditMeetingDialog({
  meeting,
  open,
  onClose,
  onSave,
  isUpdating,
}: {
  meeting: ScheduledMeeting | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, updates: any) => void;
  isUpdating: boolean;
}) {
  const [status, setStatus] = useState<MeetingStatus>("confirmed");
  const [meetingType, setMeetingType] = useState<MeetingType>("phone");
  const [brokerNotes, setBrokerNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (meeting) {
      setStatus(meeting.status);
      setMeetingType(meeting.meeting_type);
      setBrokerNotes(meeting.broker_notes ?? "");
      setCancelReason(meeting.cancelled_reason ?? "");
    }
  }, [meeting]);

  const handleSave = () => {
    if (!meeting) return;
    onSave(meeting.id, {
      status,
      meeting_type: meetingType,
      broker_notes: brokerNotes || undefined,
      ...(status === "cancelled"
        ? { cancelled_reason: cancelReason, cancelled_by: "broker" }
        : {}),
    });
  };

  if (!meeting) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
            <p className="font-semibold text-foreground">
              {meeting.client_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {meeting.client_email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(meeting.meeting_date)} at{" "}
              {formatTime(meeting.meeting_time)}
            </p>
          </div>
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MeetingStatus)}
            >
              <SelectTrigger className="bg-muted/40 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {(Object.keys(STATUS_CONFIG) as MeetingStatus[]).map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-foreground focus:bg-muted/50"
                  >
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Meeting Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["phone", "video"] as MeetingType[]).map((t) => {
                const isZoom = t === "video";
                return (
                  <button
                    key={t}
                    disabled={isZoom}
                    onClick={() => !isZoom && setMeetingType(t)}
                    className={cn(
                      "relative flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                      isZoom
                        ? "border-border bg-muted/20 text-muted-foreground/50 cursor-not-allowed opacity-60"
                        : meetingType === t
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                    )}
                  >
                    {t === "phone" ? (
                      <Phone className="h-4 w-4" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    {t === "phone" ? "Phone" : "Video"}
                    {isZoom && (
                      <span className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {status === "cancelled" && (
            <div>
              <Label className="text-foreground/80 text-sm mb-1.5 block">
                Cancellation Reason
              </Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional reason…"
                className="bg-muted/40 border-border text-foreground resize-none"
                rows={2}
              />
            </div>
          )}
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Private Notes
            </Label>
            <Textarea
              value={brokerNotes}
              onChange={(e) => setBrokerNotes(e.target.value)}
              placeholder="Internal notes (not shown to client)…"
              className="bg-muted/40 border-border text-foreground resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Form Dialog ────────────────────────────────────────────────────────

const eventSchema = Yup.object({
  event_type: Yup.string().required("Type required"),
  title: Yup.string().min(2, "Too short").required("Title required"),
  event_date: Yup.string().required("Date required"),
  description: Yup.string(),
  event_time: Yup.string(),
  all_day: Yup.boolean(),
  recurrence: Yup.string().oneOf(["none", "yearly"]),
  linked_person_name: Yup.string(),
});

function EventFormDialog({
  open,
  onClose,
  initial,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<CalendarEvent>;
  onSubmit: (values: any) => void;
  isSaving: boolean;
}) {
  const dispatch = useAppDispatch();
  const isEdit = !!initial?.id;

  // Client picker state — derive initial mode from existing event
  const initialPickerMode: ClientPickerMode = initial?.linked_client_id
    ? "existing"
    : "none";
  const [clientPicker, setClientPicker] = useState<ClientPickerValue>({
    mode: initialPickerMode,
    existingClientId: initial?.linked_client_id ?? undefined,
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState<string | null>(
    null,
  );

  // Sync picker when dialog re-opens with a different event
  useEffect(() => {
    if (open) {
      setClientPicker({
        mode: (initial?.linked_client_id
          ? "existing"
          : "none") as ClientPickerMode,
        existingClientId: initial?.linked_client_id ?? undefined,
      });
      setCreateClientError(null);
    }
  }, [open, initial?.id]);

  // Fetch clients when dialog opens
  useEffect(() => {
    if (open) dispatch(fetchClients({}));
  }, [open, dispatch]);

  const formik = useFormik({
    initialValues: {
      event_type: initial?.event_type ?? ("birthday" as CalendarEventType),
      title: initial?.title ?? "",
      event_date: initial?.event_date?.split("T")[0] ?? "",
      description: initial?.description ?? "",
      event_time: initial?.event_time?.slice(0, 5) ?? "",
      all_day: initial?.all_day !== false,
      recurrence: initial?.recurrence ?? "none",
    },
    validationSchema: eventSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setCreateClientError(null);
      let linkedClientId: number | null = null;
      let linkedPersonName: string | undefined;

      if (clientPicker.mode === "existing" && clientPicker.existingClientId) {
        linkedClientId = clientPicker.existingClientId;
      } else if (clientPicker.mode === "new" && clientPicker.newClient) {
        const nc = clientPicker.newClient;
        if (!nc.first_name || !nc.last_name || !nc.email) {
          setCreateClientError("Please fill in the required client fields.");
          return;
        }
        setIsCreatingClient(true);
        try {
          const result = await dispatch(
            createClient({
              first_name: nc.first_name.trim(),
              last_name: nc.last_name.trim(),
              email: nc.email.trim(),
              phone: nc.phone.trim() || undefined,
            }),
          );
          if (createClient.rejected.match(result)) {
            setCreateClientError(
              (result.payload as string) || "Failed to create client",
            );
            return;
          }
          const created = result.payload as { id: number };
          linkedClientId = created.id;
          linkedPersonName = `${nc.first_name.trim()} ${nc.last_name.trim()}`;
        } finally {
          setIsCreatingClient(false);
        }
      }

      onSubmit({
        ...values,
        event_time: values.all_day ? undefined : values.event_time || undefined,
        linked_client_id: linkedClientId,
        // Explicitly null out if not in 'new' mode to avoid stale values on edit
        linked_person_name:
          clientPicker.mode === "new" ? linkedPersonName || undefined : null,
        description: values.description || undefined,
      });
    },
  });

  const selectedTypeCfg =
    EVENT_TYPE_CONFIG[formik.values.event_type as CalendarEventType];
  const TypeIcon = selectedTypeCfg?.icon ?? Sparkles;

  // Auto-fill title for known types
  const autoFillTitle = (type: CalendarEventType) => {
    if (
      !formik.values.title ||
      formik.values.title ===
        autoTitleFor(formik.values.event_type as CalendarEventType)
    ) {
      formik.setFieldValue("title", autoTitleFor(type));
    }
    // set yearly recurrence for recurring types
    if (
      ["birthday", "home_anniversary", "realtor_anniversary"].includes(type)
    ) {
      formik.setFieldValue("recurrence", "yearly");
      formik.setFieldValue("all_day", true);
    } else {
      formik.setFieldValue("recurrence", "none");
    }
  };

  function autoTitleFor(type: CalendarEventType) {
    const map: Record<CalendarEventType, string> = {
      birthday: "Birthday",
      home_anniversary: "Home Purchase Anniversary",
      realtor_anniversary: "Realtor Anniversary",
      important_date: "Important Date",
      reminder: "Reminder",
      other: "",
    };
    return map[type];
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Calendar Event" : "New Calendar Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Event type */}
          <div>
            <Label className="text-foreground/80 text-sm mb-2 block">
              Event Type *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                Object.entries(EVENT_TYPE_CONFIG) as [
                  CalendarEventType,
                  (typeof EVENT_TYPE_CONFIG)[CalendarEventType],
                ][]
              ).map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      formik.setFieldValue("event_type", type);
                      autoFillTitle(type);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border transition-all text-sm font-medium text-left",
                      formik.values.event_type === type
                        ? cn("border-current", cfg.color)
                        : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Title *
            </Label>
            <Input
              {...formik.getFieldProps("title")}
              placeholder="e.g. Maria's Birthday"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
            />
            {formik.touched.title && formik.errors.title && (
              <p className="text-primary text-xs mt-1">{formik.errors.title}</p>
            )}
          </div>

          {/* Link to client */}
          <div>
            <Label className="text-foreground/80 text-sm mb-2 block">
              Linked Person (optional)
            </Label>
            <ClientPicker
              value={clientPicker}
              onChange={setClientPicker}
              optional
            />
          </div>

          {createClientError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {createClientError}
            </p>
          )}

          {/* Date */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Date *
            </Label>
            <Input
              {...formik.getFieldProps("event_date")}
              type="date"
              className="bg-muted/40 border-border text-foreground"
            />
            {formik.touched.event_date && formik.errors.event_date && (
              <p className="text-primary text-xs mt-1">
                {formik.errors.event_date as string}
              </p>
            )}
          </div>

          {/* All-day toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={formik.values.all_day}
              onCheckedChange={(v) => formik.setFieldValue("all_day", v)}
              className="data-[state=checked]:bg-primary"
            />
            <Label className="text-foreground/80 text-sm cursor-pointer">
              All day
            </Label>
          </div>

          {/* Time (only if not all-day) */}
          {!formik.values.all_day && (
            <div>
              <Label className="text-foreground/80 text-sm mb-1 block">
                Time
              </Label>
              <Input
                {...formik.getFieldProps("event_time")}
                type="time"
                className="bg-muted/40 border-border text-foreground"
              />
            </div>
          )}

          {/* Recurrence */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Recurrence
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["none", "yearly"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => formik.setFieldValue("recurrence", r)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all text-sm font-medium",
                    formik.values.recurrence === r
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                  )}
                >
                  {r === "none" ? "One-time" : "Every Year"}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Notes (optional)
            </Label>
            <Textarea
              {...formik.getFieldProps("description")}
              placeholder="Any details…"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isCreatingClient || !formik.isValid}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSaving || isCreatingClient ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isCreatingClient
                ? "Creating client…"
                : isEdit
                  ? "Save Changes"
                  : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Meeting Dialog ────────────────────────────────────────────────────

const createMeetingSchema = Yup.object({
  meeting_date: Yup.string().required("Date required"),
  meeting_time: Yup.string().required("Time required"),
  meeting_type: Yup.string().oneOf(["phone", "video"]).required(),
  notes: Yup.string(),
});

function CreateMeetingDialog({
  open,
  onClose,
  onCreated,
  isCreating,
  brokerToken,
  schedulerSettings,
  schedulerAvailability,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (values: any) => void;
  isCreating: boolean;
  brokerToken?: string;
  schedulerSettings: import("@shared/api").SchedulerSettings | null;
  schedulerAvailability: import("@shared/api").SchedulerAvailability[];
}) {
  const dispatch = useAppDispatch();
  const { clients } = useAppSelector((s) => s.clients);
  const { availableSlots } = useAppSelector((s) => s.scheduler);

  const [clientPicker, setClientPicker] = useState<ClientPickerValue>({
    mode: "existing",
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState<string | null>(
    null,
  );

  const formik = useFormik({
    initialValues: {
      meeting_date: "",
      meeting_time: "",
      meeting_type: "phone" as MeetingType,
      notes: "",
    },
    validationSchema: createMeetingSchema,
    onSubmit: async (values) => {
      setCreateClientError(null);
      let clientName = "";
      let clientEmail = "";
      let clientPhone: string | undefined;

      if (clientPicker.mode === "existing") {
        const c = clients.find((cl) => cl.id === clientPicker.existingClientId);
        if (!c) return;
        clientName = `${c.first_name} ${c.last_name}`;
        clientEmail = c.email;
        clientPhone = c.phone ?? undefined;
      } else if (clientPicker.mode === "new") {
        const nc = clientPicker.newClient;
        if (!nc?.first_name || !nc?.last_name || !nc?.email) return;
        setIsCreatingClient(true);
        try {
          const result = await dispatch(
            createClient({
              first_name: nc.first_name.trim(),
              last_name: nc.last_name.trim(),
              email: nc.email.trim(),
              phone: nc.phone.trim() || undefined,
            }),
          );
          if (createClient.rejected.match(result)) {
            setCreateClientError(
              (result.payload as string) || "Failed to create client",
            );
            return;
          }
          clientName = `${nc.first_name.trim()} ${nc.last_name.trim()}`;
          clientEmail = nc.email.trim();
          clientPhone = nc.phone.trim() || undefined;
        } finally {
          setIsCreatingClient(false);
        }
      }

      onCreated({
        ...values,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        notes: values.notes || undefined,
      });
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (!open) {
      formik.resetForm();
      setClientPicker({ mode: "existing" });
      setCreateClientError(null);
    }
  }, [open]);

  // Fetch clients when dialog opens
  useEffect(() => {
    if (open) dispatch(fetchClients({}));
  }, [open, dispatch]);

  const isClientReady =
    (clientPicker.mode === "existing" && !!clientPicker.existingClientId) ||
    (clientPicker.mode === "new" &&
      !!(
        clientPicker.newClient?.first_name &&
        clientPicker.newClient?.last_name &&
        clientPicker.newClient?.email
      ));

  const isBusy = isCreating || isCreatingClient;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> New Meeting
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-5">
          {/* Client picker */}
          <div>
            <Label className="text-foreground/80 text-sm mb-2 block">
              Client *
            </Label>
            <ClientPicker value={clientPicker} onChange={setClientPicker} />
          </div>

          <Separator className="opacity-30" />

          {/* Date */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Date *
            </Label>
            <BrokerDatePicker
              value={formik.values.meeting_date}
              onChange={(d) => {
                formik.setFieldValue("meeting_date", d);
                formik.setFieldValue("meeting_time", "");
              }}
              availability={schedulerAvailability}
              settings={schedulerSettings}
              disabled={isBusy}
            />
            {formik.touched.meeting_date && formik.errors.meeting_date && (
              <p className="text-primary text-xs mt-1">
                {formik.errors.meeting_date}
              </p>
            )}
          </div>

          {/* Time slots */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Time *
            </Label>
            <BrokerTimePicker
              date={formik.values.meeting_date}
              value={formik.values.meeting_time}
              onChange={(t) => formik.setFieldValue("meeting_time", t)}
              brokerToken={brokerToken}
              disabled={isBusy}
            />
            {formik.touched.meeting_time && formik.errors.meeting_time && (
              <p className="text-primary text-xs mt-1">
                {formik.errors.meeting_time}
              </p>
            )}
          </div>

          {/* Meeting type */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Method *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["phone", "video"] as MeetingType[]).map((t) => {
                const isZoom = t === "video";
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={isZoom}
                    onClick={() =>
                      !isZoom && formik.setFieldValue("meeting_type", t)
                    }
                    className={cn(
                      "relative flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                      isZoom
                        ? "border-border bg-muted/20 text-muted-foreground/50 cursor-not-allowed opacity-60"
                        : formik.values.meeting_type === t
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                    )}
                  >
                    {t === "phone" ? (
                      <Phone className="h-4 w-4" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    {t === "phone" ? "Phone" : "Video"}
                    {isZoom && (
                      <span className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Notes
            </Label>
            <Textarea
              {...formik.getFieldProps("notes")}
              placeholder="Optional notes…"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground resize-none"
              rows={2}
            />
          </div>

          {createClientError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {createClientError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={(() => {
                if (isBusy || !isClientReady || !formik.isValid) return true;
                if (!formik.values.meeting_time) return true;
                const slot = availableSlots.find(
                  (s) => s.time === formik.values.meeting_time,
                );
                if (slot && !slot.available) return true;
                return false;
              })()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isCreatingClient ? "Creating client…" : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel() {
  const dispatch = useAppDispatch();
  const {
    settings,
    availability,
    isLoadingSettings,
    isSavingSettings,
    blockedRanges,
    isLoadingBlockedRanges,
    isSavingBlockedRange,
  } = useAppSelector((s) => s.scheduler);
  const { user: authUser } = useAppSelector((s) => s.brokerAuth);
  const [localAvailability, setLocalAvailability] = useState<
    SchedulerAvailability[]
  >([]);
  const [saved, setSaved] = useState(false);
  const [availabilityDirty, setAvailabilityDirty] = useState(false);

  // Blocked range form state
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockLabel, setBlockLabel] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [rulesInfoOpen, setRulesInfoOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchBlockedRanges());
  }, [dispatch]);

  useEffect(() => {
    setLocalAvailability(
      availability.length > 0 ? availability : defaultAvailability(),
    );
  }, [availability]);

  const formik = useFormik({
    initialValues: {
      is_enabled: settings?.is_enabled ?? true,
      meeting_title: settings?.meeting_title ?? "Mortgage Consultation",
      meeting_description: settings?.meeting_description ?? "",
      slot_duration_minutes: settings?.slot_duration_minutes ?? 30,
      buffer_time_minutes: settings?.buffer_time_minutes ?? 15,
      advance_booking_days: settings?.advance_booking_days ?? 30,
      min_booking_hours: settings?.min_booking_hours ?? 2,
      timezone:
        settings?.timezone ?? authUser?.timezone ?? "America/Los_Angeles",
      allow_phone: settings?.allow_phone ?? true,
      allow_video: settings?.allow_video ?? true,
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      await dispatch(
        updateSchedulerSettings({
          ...values,
          availability: localAvailability.map((a) => ({
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
            is_active: a.is_active,
          })),
        }),
      );
      setSaved(true);
      setAvailabilityDirty(false);
      setTimeout(() => setSaved(false), 2000);
      dispatch(fetchSchedulerSettings());
      formik.resetForm({ values });
    },
  });

  const toggleDay = (d: number) => {
    setAvailabilityDirty(true);
    setLocalAvailability((p) =>
      p.map((a) =>
        a.day_of_week === d ? { ...a, is_active: !a.is_active } : a,
      ),
    );
  };
  const updateDayTime = (
    d: number,
    f: "start_time" | "end_time",
    v: string,
  ) => {
    setAvailabilityDirty(true);
    setLocalAvailability((p) =>
      p.map((a) => (a.day_of_week === d ? { ...a, [f]: v + ":00" } : a)),
    );
  };

  if (isLoadingSettings)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  const isFormDirty = formik.dirty || availabilityDirty;

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-w-2xl">
      {/* ── Sticky save header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Scheduling Rules
          </h2>
          {isFormDirty && !saved && (
            <p className="text-xs text-amber-500 mt-0.5">
              You have unsaved changes
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isSavingSettings || !isFormDirty}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40"
        >
          {isSavingSettings ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-400" />{" "}
              Saved!
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Enable */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Booking Status</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formik.values.is_enabled
                ? "Clients can book via your scheduler link"
                : "Scheduler disabled — booking link shows an error"}
            </p>
          </div>
          <Switch
            checked={formik.values.is_enabled}
            onCheckedChange={(v) => formik.setFieldValue("is_enabled", v)}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      {/* Meeting details */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Meeting Details</h3>
        <div>
          <Label className="text-foreground/80 text-sm mb-1.5 block">
            Meeting Title
          </Label>
          <Input
            {...formik.getFieldProps("meeting_title")}
            className="bg-muted/40 border-border text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground/80 text-sm mb-1.5 block">
            Description
          </Label>
          <Textarea
            {...formik.getFieldProps("meeting_description")}
            rows={3}
            className="bg-muted/40 border-border text-foreground resize-none"
            placeholder="Short description shown on the public booking page…"
          />
        </div>
      </div>

      {/* Scheduling rules */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Scheduling Rules</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Slot Duration (min)",
              field: "slot_duration_minutes",
              min: 15,
              max: 120,
              step: 15,
            },
            {
              label: "Buffer Between (min)",
              field: "buffer_time_minutes",
              min: 0,
              max: 60,
              step: 5,
            },
            {
              label: "Advance Booking (days)",
              field: "advance_booking_days",
              min: 1,
              max: 90,
              step: 1,
            },
            {
              label: "Min Notice (hrs)",
              field: "min_booking_hours",
              min: 0,
              max: 72,
              step: 1,
            },
          ].map(({ label, field, min, max, step }) => (
            <div key={field}>
              <Label className="text-foreground/80 text-sm mb-1.5 block">
                {label}
              </Label>
              <Input
                type="number"
                min={min}
                max={max}
                step={step}
                {...formik.getFieldProps(field)}
                className="bg-muted/40 border-border text-foreground"
              />
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-foreground/80 text-sm">Timezone</Label>
            <button
              type="button"
              onClick={() => {
                const detected =
                  Intl.DateTimeFormat().resolvedOptions().timeZone;
                const match = TIMEZONES.find((tz) => tz.value === detected);
                if (match) formik.setFieldValue("timezone", detected);
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" /> Detect my timezone
            </button>
          </div>
          <Select
            value={formik.values.timezone}
            onValueChange={(v) => formik.setFieldValue("timezone", v)}
          >
            <SelectTrigger className="bg-muted/40 border-border text-foreground">
              <SelectValue>
                {(() => {
                  const tz = TIMEZONES.find(
                    (t) => t.value === formik.values.timezone,
                  );
                  return tz ? (
                    <span>
                      {tz.label}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({tzOffset(tz.value)})
                      </span>
                    </span>
                  ) : (
                    formik.values.timezone
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {TIMEZONES.map((tz) => (
                <SelectItem
                  key={tz.value}
                  value={tz.value}
                  className="text-foreground focus:bg-muted/50"
                >
                  <div className="flex flex-col py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tz.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {tzOffset(tz.value)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tz.cities}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Collapsible: how these settings affect client slot availability */}
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setRulesInfoOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              How do these rules affect client availability?
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                rulesInfoOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence initial={false}>
            {rulesInfoOpen && (
              <motion.div
                key="info"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 space-y-3 text-xs text-muted-foreground border-t border-border/60 bg-muted/20">
                  <ul className="space-y-2 list-none">
                    <li className="flex gap-1.5">
                      <Dot className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>
                        <span className="font-medium text-foreground">
                          Slot Duration
                        </span>{" "}
                        — each bookable time block shown to clients. E.g. 30 min
                        → slots at 9:00, 9:30, 10:00…
                      </span>
                    </li>
                    <li className="flex gap-1.5">
                      <Dot className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>
                        <span className="font-medium text-foreground">
                          Buffer Between
                        </span>{" "}
                        — gap blocked before and after each confirmed meeting.
                        E.g. 15 min buffer around a 2:00 PM meeting greys out
                        1:30 PM and 2:30 PM for clients.
                      </span>
                    </li>
                    <li className="flex gap-1.5">
                      <Dot className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>
                        <span className="font-medium text-foreground">
                          Min Notice
                        </span>{" "}
                        — clients cannot book within this many hours from now.
                        E.g. 2 hrs = nothing bookable in the next 2 hours.
                      </span>
                    </li>
                    <li className="flex gap-1.5">
                      <Dot className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>
                        <span className="font-medium text-foreground">
                          Advance Booking
                        </span>{" "}
                        — how many days ahead clients can see available dates.
                      </span>
                    </li>
                  </ul>
                  {formik.values.buffer_time_minutes > 0 &&
                    formik.values.slot_duration_minutes > 0 && (
                      <div className="rounded-md bg-primary/8 border border-primary/20 px-3 py-2 text-primary/80 font-medium">
                        Your current settings: a{" "}
                        {formik.values.slot_duration_minutes}-min meeting (+{" "}
                        {formik.values.buffer_time_minutes} min buffer each
                        side) reserves{" "}
                        <span className="font-bold text-primary">
                          {formik.values.slot_duration_minutes +
                            formik.values.buffer_time_minutes * 2}{" "}
                          min
                        </span>{" "}
                        of your calendar per booking.
                      </div>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Connection methods */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-3">
        <h3 className="font-semibold text-foreground mb-3">
          Connection Methods
        </h3>
        {[
          {
            key: "allow_phone",
            label: "Phone Call",
            sub: "Banker calls client at scheduled time",
            icon: <Phone className="h-4 w-4 text-sky-400" />,
          },
          {
            key: "allow_video",
            label: "Video Call (Zoom)",
            sub: "Creates a Zoom meeting automatically",
            icon: <Video className="h-4 w-4 text-blue-400" />,
          },
        ].map(({ key, label, sub, icon }, i) => {
          const isZoom = key === "allow_video";
          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between py-2",
                i > 0 && "border-t border-border/30",
                isZoom && "opacity-50",
              )}
            >
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-foreground text-sm font-medium">
                      {label}
                    </p>
                    {isZoom && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                        <Lock className="h-2.5 w-2.5" /> Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
              <Switch
                checked={isZoom ? false : (formik.values as any)[key]}
                onCheckedChange={
                  isZoom ? undefined : (v) => formik.setFieldValue(key, v)
                }
                disabled={isZoom}
                className={isZoom ? "cursor-not-allowed" : ""}
              />
            </div>
          );
        })}
      </div>

      {/* Availability */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
        <h3 className="font-semibold text-foreground mb-4">
          Weekly Availability
        </h3>
        <div className="space-y-3">
          {localAvailability.map((av) => (
            <div key={av.day_of_week} className="flex items-center gap-3">
              <Switch
                checked={av.is_active}
                onCheckedChange={() => toggleDay(av.day_of_week)}
                className="data-[state=checked]:bg-primary shrink-0"
              />
              <span
                className={cn(
                  "w-24 text-sm font-medium",
                  av.is_active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {DAY_NAMES[av.day_of_week]}
              </span>
              {av.is_active ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={av.start_time.slice(0, 5)}
                    onChange={(e) =>
                      updateDayTime(
                        av.day_of_week,
                        "start_time",
                        e.target.value,
                      )
                    }
                    className="bg-muted/40 border-border text-foreground text-sm h-8 flex-1 max-w-[120px]"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={av.end_time.slice(0, 5)}
                    onChange={(e) =>
                      updateDayTime(av.day_of_week, "end_time", e.target.value)
                    }
                    className="bg-muted/40 border-border text-foreground text-sm h-8 flex-1 max-w-[120px]"
                  />
                </div>
              ) : (
                <span className="text-muted-foreground text-sm italic">
                  Unavailable
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Blocked Date/Time Ranges ─────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-border/50">
        <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Blocked Date/Time Ranges
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          Block specific date/time windows so clients cannot schedule in those
          slots. Great for vacations, personal appointments, or other
          commitments.
        </p>

        {/* Add new block form */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Start
              </label>
              <Input
                type="datetime-local"
                value={blockStart}
                onChange={(e) => {
                  setBlockStart(e.target.value);
                  setBlockError(null);
                }}
                className="bg-muted/40 border-border text-foreground text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                End
              </label>
              <Input
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => {
                  setBlockEnd(e.target.value);
                  setBlockError(null);
                }}
                className="bg-muted/40 border-border text-foreground text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Label
            </label>
            <Input
              type="text"
              placeholder="e.g. Vacation, Doctor Appointment…"
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
              required
              className="bg-muted/40 border-border text-foreground text-sm"
            />
          </div>
          {blockError && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {blockError}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={isSavingBlockedRange}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={async () => {
              if (!blockStart || !blockEnd || !blockLabel.trim()) {
                setBlockError("Please fill in start, end, and label.");
                return;
              }
              if (new Date(blockEnd) <= new Date(blockStart)) {
                setBlockError("End must be after start.");
                return;
              }
              setBlockError(null);
              await dispatch(
                addBlockedRange({
                  start_datetime: blockStart,
                  end_datetime: blockEnd,
                  label: blockLabel || undefined,
                }),
              );
              setBlockStart("");
              setBlockEnd("");
              setBlockLabel("");
            }}
          >
            {isSavingBlockedRange ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Block
          </Button>
        </div>

        {/* Existing blocked ranges list */}
        {isLoadingBlockedRanges ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : blockedRanges.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            No blocked ranges set.
          </p>
        ) : (
          <div className="space-y-2">
            {blockedRanges.map((br) => (
              <div
                key={br.id}
                className="flex items-center justify-between bg-muted/20 border border-border/40 rounded-lg px-4 py-2.5 gap-3"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <Lock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {br.label || "Blocked"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        parseISO(br.start_datetime),
                        "MMM d, yyyy h:mm a",
                      )}{" "}
                      &rarr;{" "}
                      {format(parseISO(br.end_datetime), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(deleteBlockedRange(br.id))}
                  className="shrink-0 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}

// ─── Events DataGrid column definitions ─────────────────────────────────────

const EVENTS_COLUMNS: DataGridColumn<CalendarEvent>[] = [
  {
    key: "event_type",
    label: "Type",
    sortable: true,
    shrink: true,
    render: (e) => {
      const cfg = EVENT_TYPE_CONFIG[e.event_type];
      const Icon = cfg?.icon;
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
            cfg?.color ?? "border-border/50 bg-muted/30 text-muted-foreground",
          )}
        >
          {Icon && <Icon className="h-3 w-3" />}
          {cfg?.label ?? e.event_type}
        </span>
      );
    },
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (e) => (
      <span className="font-medium text-foreground">{e.title}</span>
    ),
  },
  {
    key: "linked_client_name",
    label: "Linked to",
    sortable: true,
    render: (e) => (
      <span className="text-muted-foreground text-sm">
        {e.linked_client_name ?? e.linked_person_name ?? "—"}
      </span>
    ),
  },
  {
    key: "event_date",
    label: "Date",
    sortable: true,
    shrink: true,
    render: (e) => (
      <span className="text-sm tabular-nums">
        {format(parseISO(e.event_date), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    key: "recurrence",
    label: "Recurrence",
    sortable: true,
    shrink: true,
    render: (e) => (
      <span className="text-muted-foreground text-xs capitalize">
        {e.recurrence === "yearly" ? (
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Yearly
          </span>
        ) : (
          "Once"
        )}
      </span>
    ),
  },
];

// ─── Main Admin Calendar Page ─────────────────────────────────────────────────

const AdminCalendar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const {
    meetings,
    isLoadingMeetings,
    isUpdatingMeeting,
    isCreatingMeeting,
    settings: schedulerSettings,
    availability: schedulerAvailability,
  } = useAppSelector((s) => s.scheduler);
  const {
    events,
    isLoading: isLoadingEvents,
    isCreating: isCreatingEvent,
    isUpdating: isUpdatingEvent,
    isDeleting: isDeletingEvent,
    isSyncing: isSyncingBirthdays,
    pagination: eventsPagination,
    error: calendarError,
  } = useAppSelector((s) => s.calendarEvents);
  const { user } = useAppSelector((s) => s.brokerAuth);

  const isPartner = user?.role === "broker";

  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingMeeting, setEditingMeeting] = useState<ScheduledMeeting | null>(
    null,
  );
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [eventSortBy, setEventSortBy] = useState("event_date");
  const [eventSortDir, setEventSortDir] = useState<"ASC" | "DESC">("ASC");
  const [eventPage, setEventPage] = useState(1);
  const [urlCopied, setUrlCopied] = useState(false);

  // Lifted from UnifiedCalendarView so AdminCalendar can fetch month-scoped events
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  /** Fetch events visible in the given month (handles yearly recurrence server-side) */
  const doFetchCalendarView = useCallback(
    (month: Date) => {
      dispatch(
        fetchCalendarEvents({
          calendar_month: format(month, "yyyy-MM"),
        }),
      );
    },
    [dispatch],
  );

  /** Fetch all events (paginated) for the Events tab */
  const doFetchEvents = useCallback(
    (params: {
      search?: string;
      sort_by?: string;
      sort_order?: "ASC" | "DESC";
      event_type?: string;
      page?: number;
    }) => {
      dispatch(
        fetchCalendarEvents({
          ...(params.event_type && params.event_type !== "all"
            ? { event_type: params.event_type as any }
            : {}),
          ...(params.search ? { search: params.search } : {}),
          sort_by: params.sort_by ?? "event_date",
          sort_order: params.sort_order ?? "ASC",
          page: params.page ?? 1,
          limit: 25,
        }),
      );
    },
    [dispatch],
  );

  const handleCalendarViewDateChange = useCallback(
    (newDate: Date) => {
      setCalendarViewDate(newDate);
      doFetchCalendarView(newDate);
    },
    [doFetchCalendarView],
  );

  useEffect(() => {
    dispatch(fetchSchedulerSettings());
    dispatch(fetchScheduledMeetings());
    // Initial load: calendar tab is active, so fetch the current month
    doFetchCalendarView(new Date());
    dispatch(fetchClients({ page: 1, limit: 200 }));
  }, [dispatch]);

  // Show toast when a calendar error surfaces
  useEffect(() => {
    if (calendarError) {
      toast({
        title: "Calendar Error",
        description: calendarError,
        variant: "destructive",
      });
      dispatch(clearCalendarError());
    }
  }, [calendarError, toast, dispatch]);

  // Scheduler lives on the portal origin, not the admin subdomain
  const portalOrigin =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? window.location.origin
      : `https://portal.themortgageprofessionals.net`;

  const schedulerUrl = user?.public_token
    ? `${portalOrigin}/scheduler/${user.public_token}`
    : `${portalOrigin}/scheduler`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(schedulerUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleUpdateMeeting = useCallback(
    async (id: number, updates: any) => {
      await dispatch(
        updateScheduledMeeting({ meetingId: id, payload: updates }),
      );
      setEditingMeeting(null);
      dispatch(fetchScheduledMeetings());
    },
    [dispatch],
  );

  const handleCreateMeeting = useCallback(
    async (values: any) => {
      await dispatch(createScheduledMeeting(values));
      setShowCreateMeeting(false);
      dispatch(fetchScheduledMeetings());
    },
    [dispatch],
  );

  const handleCreateEvent = useCallback(
    async (values: CreateCalendarEventRequest) => {
      const result = await dispatch(createCalendarEvent(values));
      if (createCalendarEvent.fulfilled.match(result)) {
        toast({ title: "Event created", description: values.title });
        setShowCreateEvent(false);
        // Refresh the active view
        if (activeTab === "calendar") {
          doFetchCalendarView(calendarViewDate);
        } else {
          doFetchEvents({
            search,
            sort_by: eventSortBy,
            sort_order: eventSortDir,
            event_type: eventTypeFilter,
            page: eventPage,
          });
        }
      } else {
        toast({
          title: "Failed to create event",
          description: (result.payload as string) || "Unknown error",
          variant: "destructive",
        });
      }
    },
    [
      dispatch,
      toast,
      activeTab,
      calendarViewDate,
      doFetchCalendarView,
      doFetchEvents,
      search,
      eventSortBy,
      eventSortDir,
      eventTypeFilter,
      eventPage,
    ],
  );

  const handleUpdateEvent = useCallback(
    async (values: any) => {
      if (!editingEvent) return;
      const result = await dispatch(
        updateCalendarEvent({ eventId: editingEvent.id, payload: values }),
      );
      if (updateCalendarEvent.fulfilled.match(result)) {
        toast({ title: "Event updated" });
        setEditingEvent(null);
        if (activeTab === "calendar") {
          doFetchCalendarView(calendarViewDate);
        } else {
          doFetchEvents({
            search,
            sort_by: eventSortBy,
            sort_order: eventSortDir,
            event_type: eventTypeFilter,
            page: eventPage,
          });
        }
      } else {
        toast({
          title: "Failed to update event",
          description: (result.payload as string) || "Unknown error",
          variant: "destructive",
        });
      }
    },
    [
      dispatch,
      editingEvent,
      toast,
      activeTab,
      calendarViewDate,
      doFetchCalendarView,
      doFetchEvents,
      search,
      eventSortBy,
      eventSortDir,
      eventTypeFilter,
      eventPage,
    ],
  );

  const handleDeleteEvent = useCallback(async () => {
    if (!deletingEvent) return;
    const result = await dispatch(deleteCalendarEvent(deletingEvent.id));
    if (deleteCalendarEvent.fulfilled.match(result)) {
      toast({ title: "Event deleted" });
      setDeletingEvent(null);
      if (activeTab === "calendar") {
        doFetchCalendarView(calendarViewDate);
      } else {
        doFetchEvents({
          search,
          sort_by: eventSortBy,
          sort_order: eventSortDir,
          event_type: eventTypeFilter,
          page: eventPage,
        });
      }
    } else {
      toast({
        title: "Failed to delete event",
        description: (result.payload as string) || "Unknown error",
        variant: "destructive",
      });
    }
  }, [
    dispatch,
    deletingEvent,
    toast,
    activeTab,
    calendarViewDate,
    doFetchCalendarView,
    doFetchEvents,
    search,
    eventSortBy,
    eventSortDir,
    eventTypeFilter,
    eventPage,
  ]);

  const handleSyncBirthdays = useCallback(async () => {
    const result = await dispatch(syncBirthdays());
    if (syncBirthdays.fulfilled.match(result)) {
      const { created, updated } = result.payload;
      toast({
        title: "Birthdays synced",
        description: `${created} created, ${updated} updated`,
      });
      // Always refresh Events tab data after sync (sync is only triggered from Events tab)
      doFetchEvents({
        search,
        sort_by: eventSortBy,
        sort_order: eventSortDir,
        event_type: eventTypeFilter,
        page: eventPage,
      });
    } else {
      toast({
        title: "Birthday sync failed",
        description: (result.payload as string) || "Unknown error",
        variant: "destructive",
      });
    }
  }, [
    dispatch,
    toast,
    doFetchEvents,
    search,
    eventSortBy,
    eventSortDir,
    eventTypeFilter,
    eventPage,
  ]);

  const filteredMeetings = meetings.filter((m) => {
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && m.status !== "cancelled") ||
      m.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.client_name.toLowerCase().includes(q) ||
      m.client_email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Events are filtered/sorted server-side; no client-side filter needed.
  const filteredEvents = events;

  // Stats
  const upcomingMeetings = meetings.filter(
    (m) => m.status === "confirmed",
  ).length;
  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingEvents = events.filter((e) => {
    const base = e.event_date.split("T")[0];
    // For yearly recurring events, project to current year for comparison
    const effectiveDate =
      e.recurrence === "yearly"
        ? `${new Date().getFullYear()}-${base.slice(5)}`
        : base;
    return effectiveDate >= today;
  }).length;
  const yearlyEvents = events.filter((e) => e.recurrence === "yearly").length;
  const thisMonthEvents = events.filter((e) => {
    const d = e.event_date.split("T")[0];
    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // For yearly recurrence, project the month to this year
    const projected =
      e.recurrence === "yearly"
        ? `${now.getFullYear()}-${d.slice(5, 7)}-${d.slice(8, 10)}`
        : d;
    return projected.startsWith(thisMonthPrefix);
  }).length;

  return (
    <>
      <MetaHelmet
        title="Calendar — The Mortgage Professionals Admin"
        description="Manage your calendar, meetings, and important dates"
      />

      <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 gap-4 sm:gap-5">
        {/* Header */}
        <PageHeader
          icon={<CalendarDays className="h-7 w-7 text-primary" />}
          title="Calendar"
          description="Meetings, birthdays, anniversaries and important dates — all in one place"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => {
                  dispatch(fetchScheduledMeetings());
                  if (activeTab === "calendar") {
                    doFetchCalendarView(calendarViewDate);
                  } else {
                    doFetchEvents({
                      search,
                      sort_by: eventSortBy,
                      sort_order: eventSortDir,
                      event_type: eventTypeFilter,
                      page: eventPage,
                    });
                  }
                }}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button
                onClick={() => setShowCreateEvent(true)}
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-muted/50"
              >
                <Sparkles className="h-4 w-4 mr-1" /> Add Event
              </Button>
              <Button
                onClick={() => setShowCreateMeeting(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1" /> New Meeting
              </Button>
            </div>
          }
        />

        {/* Booking link bar */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
              Your Booking Link
            </p>
            <p className="text-sm text-foreground/80 truncate">
              {schedulerUrl}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyUrl}
              className={cn(
                "text-sm",
                urlCopied
                  ? "text-green-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {urlCopied ? (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {urlCopied ? "Copied!" : "Copy"}
            </Button>
            <a href={schedulerUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4 mr-1" /> Preview
              </Button>
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Custom underline-style tab bar */}
          <div className="shrink-0 flex items-end gap-0 border-b border-border/50 overflow-x-auto scrollbar-none">
            {(
              [
                {
                  value: "calendar",
                  label: "Calendar",
                  icon: <CalendarDays className="h-4 w-4" />,
                  badge: null,
                },
                {
                  value: "meetings",
                  label: "Meetings",
                  icon: <Phone className="h-4 w-4" />,
                  badge:
                    meetings.filter((m) => m.status === "confirmed").length ||
                    null,
                },
                {
                  value: "events",
                  label: "Events",
                  icon: <Sparkles className="h-4 w-4" />,
                  badge: events.length || null,
                },
                {
                  value: "settings",
                  label: "Settings",
                  icon: <Settings2 className="h-4 w-4" />,
                  badge: null,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  if (tab.value === "calendar") {
                    doFetchCalendarView(calendarViewDate);
                  } else if (tab.value === "events") {
                    doFetchEvents({
                      sort_by: eventSortBy,
                      sort_order: eventSortDir,
                      event_type: eventTypeFilter,
                      search,
                      page: eventPage,
                    });
                  }
                }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors select-none",
                  activeTab === tab.value
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full text-[10px] font-bold h-4 min-w-4 px-1",
                      activeTab === tab.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
                {/* Active indicator */}
                {activeTab === tab.value && (
                  <motion.span
                    layoutId="calendar-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
          {/* ── Calendar Tab ── */}
          {activeTab === "calendar" && (
            <div className="mt-3 flex-1 flex flex-col min-h-0">
              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 sm:p-6 flex-1 flex flex-col min-h-0">
                {isLoadingMeetings || isLoadingEvents ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <UnifiedCalendarView
                    meetings={meetings}
                    events={events}
                    onEditMeeting={setEditingMeeting}
                    onEditEvent={setEditingEvent}
                    viewDate={calendarViewDate}
                    onViewDateChange={handleCalendarViewDateChange}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Meetings Tab ── */}
          {activeTab === "meetings" && (
            <div className="mt-4 flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search client…"
                    className="pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-muted/40 border-border text-foreground w-[160px]">
                    <ListFilter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem
                      value="active"
                      className="text-foreground focus:bg-muted/50"
                    >
                      Active (hide cancelled)
                    </SelectItem>
                    <SelectItem
                      value="all"
                      className="text-foreground focus:bg-muted/50"
                    >
                      All statuses
                    </SelectItem>
                    {(Object.keys(STATUS_CONFIG) as MeetingStatus[]).map(
                      (s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="text-foreground focus:bg-muted/50"
                        >
                          {STATUS_CONFIG[s].label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["grid", "list"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={cn(
                        "p-2 transition-colors",
                        viewMode === m
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {m === "grid" ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <List className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingMeetings ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No meetings found</p>
                  <p className="text-sm mt-1">
                    Try adjusting your filters or create a new meeting
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMeetings.map((m) => (
                    <MeetingCard
                      key={m.id}
                      meeting={m}
                      onEdit={setEditingMeeting}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {["Client", "Date & Time", "Method", "Status", ""].map(
                          (h) => (
                            <th
                              key={h}
                              className={cn(
                                "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase",
                                !h && "text-right",
                              )}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMeetings.map((m) => {
                        const cfg = STATUS_CONFIG[m.status];
                        return (
                          <tr
                            key={m.id}
                            className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">
                                {m.client_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {m.client_email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                With {meetingWithLabel(m)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground/80">
                              <div>{formatDate(m.meeting_date)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(m.meeting_time)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-foreground/80 text-xs">
                                {m.meeting_type === "phone" ? (
                                  <Phone className="h-3.5 w-3.5 text-sky-400" />
                                ) : (
                                  <Video className="h-3.5 w-3.5 text-green-400" />
                                )}
                                {m.meeting_type === "phone" ? "Phone" : "Video"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                                  cfg.color,
                                )}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setEditingMeeting(m)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Events Tab ── */}
          {activeTab === "events" && (
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col gap-4 pb-6">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearch(val);
                        setEventPage(1);
                        doFetchEvents({
                          search: val,
                          sort_by: eventSortBy,
                          sort_order: eventSortDir,
                          event_type: eventTypeFilter,
                          page: 1,
                        });
                      }}
                      placeholder="Search events…"
                      className="pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Select
                    value={eventTypeFilter}
                    onValueChange={(val) => {
                      setEventTypeFilter(val);
                      setEventPage(1);
                      doFetchEvents({
                        search,
                        sort_by: eventSortBy,
                        sort_order: eventSortDir,
                        event_type: val,
                        page: 1,
                      });
                    }}
                  >
                    <SelectTrigger className="bg-muted/40 border-border text-foreground w-[180px]">
                      <ListFilter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Event type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem
                        value="all"
                        className="text-foreground focus:bg-muted/50"
                      >
                        All types
                      </SelectItem>
                      {(
                        Object.entries(EVENT_TYPE_CONFIG) as [
                          CalendarEventType,
                          (typeof EVENT_TYPE_CONFIG)[CalendarEventType],
                        ][]
                      ).map(([type, cfg]) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-foreground focus:bg-muted/50"
                        >
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setShowCreateEvent(true)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground ml-auto"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Event
                  </Button>
                  {!isPartner && (
                    <Button
                      onClick={handleSyncBirthdays}
                      disabled={isSyncingBirthdays}
                      size="sm"
                      variant="outline"
                      className="border-pink-500/40 text-pink-300 hover:bg-pink-500/10"
                    >
                      {isSyncingBirthdays ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Cake className="h-4 w-4 mr-1" />
                      )}
                      Sync Birthdays
                    </Button>
                  )}
                </div>

                {/* Type chips legend */}
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(EVENT_TYPE_CONFIG) as [
                      CalendarEventType,
                      (typeof EVENT_TYPE_CONFIG)[CalendarEventType],
                    ][]
                  ).map(([type, cfg]) => {
                    const Icon = cfg.icon;
                    const count = events.filter(
                      (e) => e.event_type === type,
                    ).length;
                    return count > 0 ? (
                      <button
                        key={type}
                        onClick={() => {
                          const next = eventTypeFilter === type ? "all" : type;
                          setEventTypeFilter(next);
                          setEventPage(1);
                          doFetchEvents({
                            search,
                            sort_by: eventSortBy,
                            sort_order: eventSortDir,
                            event_type: next,
                            page: 1,
                          });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                          eventTypeFilter === type
                            ? cfg.color
                            : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border",
                        )}
                      >
                        <Icon className="h-3 w-3" /> {cfg.label}{" "}
                        <Badge className="ml-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-current/20">
                          {count}
                        </Badge>
                      </button>
                    ) : null;
                  })}
                </div>

                {/* Events DataGrid */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <DataGrid<CalendarEvent>
                    data={filteredEvents}
                    columns={[
                      ...EVENTS_COLUMNS,
                      {
                        key: "actions",
                        label: "",
                        shrink: true,
                        render: (e) => (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingEvent(e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingEvent(e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                    rowKey={(e) => e.id}
                    sortBy={eventSortBy}
                    sortDir={eventSortDir}
                    onSort={(key) => {
                      const newDir =
                        eventSortBy === key && eventSortDir === "ASC"
                          ? "DESC"
                          : "ASC";
                      setEventSortBy(key);
                      setEventSortDir(newDir);
                      setEventPage(1);
                      doFetchEvents({
                        search,
                        sort_by: key,
                        sort_order: newDir,
                        event_type: eventTypeFilter,
                        page: 1,
                      });
                    }}
                    pagination={eventsPagination}
                    onPageChange={(page) => {
                      setEventPage(page);
                      doFetchEvents({
                        search,
                        sort_by: eventSortBy,
                        sort_order: eventSortDir,
                        event_type: eventTypeFilter,
                        page,
                      });
                    }}
                    isLoading={isLoadingEvents}
                    emptyMessage="No events found"
                    colSpan={6}
                    noBleeding
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Settings Tab ── */}
          {activeTab === "settings" && (
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto pb-6">
              <SettingsPanel />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <EditMeetingDialog
        meeting={editingMeeting}
        open={!!editingMeeting}
        onClose={() => setEditingMeeting(null)}
        onSave={handleUpdateMeeting}
        isUpdating={isUpdatingMeeting}
      />

      <CreateMeetingDialog
        open={showCreateMeeting}
        onClose={() => setShowCreateMeeting(false)}
        onCreated={handleCreateMeeting}
        isCreating={isCreatingMeeting}
        brokerToken={user?.public_token ?? undefined}
        schedulerSettings={schedulerSettings}
        schedulerAvailability={schedulerAvailability}
      />

      {/* Create event */}
      <EventFormDialog
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onSubmit={handleCreateEvent}
        isSaving={isCreatingEvent}
      />

      {/* Edit event */}
      {editingEvent && (
        <EventFormDialog
          key={editingEvent.id}
          open={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          initial={editingEvent}
          onSubmit={handleUpdateEvent}
          isSaving={isUpdatingEvent}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingEvent}
        onOpenChange={(o) => !o && setDeletingEvent(null)}
      >
        <AlertDialogContent className="bg-popover border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "
              <strong>{deletingEvent?.title}</strong>"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isDeletingEvent}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeletingEvent ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminCalendar;
