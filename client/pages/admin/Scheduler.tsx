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
  Mail,
  MessageSquare,
  Loader2,
  Edit2,
  Trash2,
  ListFilter,
  LayoutGrid,
  List,
  Copy,
  ExternalLink,
  Save,
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
} from "date-fns";
import { MetaHelmet } from "@/components/MetaHelmet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSchedulerSettings,
  updateSchedulerSettings,
  fetchScheduledMeetings,
  updateScheduledMeeting,
  createScheduledMeeting,
  clearError,
} from "@/store/slices/schedulerSlice";
import { fetchBrokers } from "@/store/slices/brokersSlice";
import type {
  ScheduledMeeting,
  SchedulerAvailability,
  MeetingStatus,
  MeetingType,
} from "@shared/api";
import { useFormik } from "formik";
import * as Yup from "yup";

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

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

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

// ─── Default availability (Mon-Fri 9-5) ──────────────────────────────────────

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

      {meeting.meeting_type === "video" && meeting.zoom_join_url && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={meeting.zoom_join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Join Zoom
          </a>
          {meeting.zoom_start_url && (
            <a
              href={meeting.zoom_start_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Video className="h-3 w-3" />
              Start as host
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  meetings,
  onEditMeeting,
}: {
  meetings: ScheduledMeeting[];
  onEditMeeting: (m: ScheduledMeeting) => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOffset = getDay(monthStart);
  const emptyBefore = Array(firstDayOffset).fill(null);

  const meetingsByDate = meetings.reduce<Record<string, ScheduledMeeting[]>>(
    (acc, m) => {
      const key = m.meeting_date.split("T")[0];
      acc[key] = acc[key] || [];
      acc[key].push(m);
      return acc;
    },
    {},
  );

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() =>
            setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
          }
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-bold text-foreground text-lg">
          {format(viewDate, "MMMM yyyy")}
        </h3>
        <button
          onClick={() =>
            setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))
          }
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyBefore.map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayMeetings = meetingsByDate[key] || [];
          const hasConfirmed = dayMeetings.some(
            (m) => m.status === "confirmed",
          );
          const hasCancelled =
            dayMeetings.every((m) => m.status === "cancelled") &&
            dayMeetings.length > 0;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[70px] rounded-xl p-1.5 border transition-all",
                isToday(day)
                  ? "border-red-500/50 bg-red-500/8"
                  : "border-border/30 hover:border-border bg-muted/10",
              )}
            >
              <div
                className={cn(
                  "text-right text-xs font-semibold mb-1 pr-1",
                  isToday(day) ? "text-primary" : "text-muted-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayMeetings.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onEditMeeting(m)}
                    className={cn(
                      "w-full text-left text-[10px] leading-tight rounded px-1.5 py-1 truncate font-medium transition-all hover:opacity-80",
                      m.status === "confirmed" &&
                        "bg-green-500/20 text-green-300",
                      m.status === "cancelled" &&
                        "bg-red-500/15 text-red-300 line-through",
                      m.status === "completed" &&
                        "bg-blue-500/20 text-blue-300",
                      m.status === "no_show" &&
                        "bg-slate-500/20 text-muted-foreground",
                      m.status === "pending" &&
                        "bg-yellow-500/20 text-yellow-300",
                    )}
                    title={`${m.client_name} — ${formatTime(m.meeting_time)}`}
                  >
                    {formatTime(m.meeting_time)} {m.client_name.split(" ")[0]}
                  </button>
                ))}
                {dayMeetings.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{dayMeetings.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  const [brokerNotes, setBrokerNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>("phone");

  useEffect(() => {
    if (meeting) {
      setStatus(meeting.status);
      setBrokerNotes(meeting.broker_notes || "");
      setCancelReason(meeting.cancelled_reason || "");
      setMeetingType(meeting.meeting_type);
    }
  }, [meeting]);

  if (!meeting) return null;

  const handleSave = () => {
    const updates: any = {
      status,
      broker_notes: brokerNotes || undefined,
      meeting_type: meetingType,
    };
    if (status === "cancelled") {
      updates.cancelled_reason = cancelReason || undefined;
      updates.cancelled_by = "broker";
    }
    onSave(meeting.id, updates);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Meeting Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client info */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-300 font-bold text-sm">
                {meeting.client_name[0]}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {meeting.client_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {meeting.client_email}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 text-primary" />
                {formatDate(meeting.meeting_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary" />
                {formatTime(meeting.meeting_time)} –{" "}
                {formatTime(meeting.meeting_end_time)}
              </span>
              {meeting.client_phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-primary" />
                  <a
                    href={`tel:${meeting.client_phone}`}
                    className="hover:underline"
                  >
                    {meeting.client_phone}
                  </a>
                </span>
              )}
              {meeting.zoom_join_url && (
                <div className="flex items-center gap-2 col-span-2 flex-wrap">
                  <a
                    href={meeting.zoom_join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <Video className="h-3 w-3" />
                    Join Zoom
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {meeting.zoom_start_url && (
                    <a
                      href={meeting.zoom_start_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:text-primary/80"
                    >
                      Start as host
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
            {meeting.notes && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground italic">
                  "{meeting.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Status */}
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

          {/* Meeting type */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Meeting Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["phone", "video"] as MeetingType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMeetingType(t)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                    meetingType === t
                      ? "border-red-500 bg-red-500/15 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                  )}
                >
                  {t === "phone" ? (
                    <Phone className="h-4 w-4" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {t === "phone" ? "Phone" : "Video"}
                </button>
              ))}
            </div>
          </div>

          {/* Cancellation reason */}
          {status === "cancelled" && (
            <div>
              <Label className="text-foreground/80 text-sm mb-1.5 block">
                Cancellation Reason
              </Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional reason to include in the email…"
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Broker notes */}
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Private Notes
            </Label>
            <Textarea
              value={brokerNotes}
              onChange={(e) => setBrokerNotes(e.target.value)}
              placeholder="Internal notes (not shown to client)…"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground resize-none"
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

// ─── Create Meeting Dialog ────────────────────────────────────────────────────

const createSchema = Yup.object({
  client_name: Yup.string().min(2).required("Name required"),
  client_email: Yup.string().email("Invalid email").required("Email required"),
  client_phone: Yup.string(),
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
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (values: any) => void;
  isCreating: boolean;
}) {
  const formik = useFormik({
    initialValues: {
      client_name: "",
      client_email: "",
      client_phone: "",
      meeting_date: "",
      meeting_time: "",
      meeting_type: "phone" as MeetingType,
      notes: "",
    },
    validationSchema: createSchema,
    onSubmit: (values) => {
      onCreated({
        ...values,
        client_phone: values.client_phone || undefined,
        notes: values.notes || undefined,
      });
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Meeting
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/80 text-sm mb-1 block">
                Name *
              </Label>
              <Input
                {...formik.getFieldProps("client_name")}
                placeholder="Client name"
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
              />
              {formik.touched.client_name && formik.errors.client_name && (
                <p className="text-primary text-xs mt-1">
                  {formik.errors.client_name}
                </p>
              )}
            </div>
            <div>
              <Label className="text-foreground/80 text-sm mb-1 block">
                Phone
              </Label>
              <Input
                {...formik.getFieldProps("client_phone")}
                placeholder="(555) 000-0000"
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground/80 text-sm mb-1 block">
              Email *
            </Label>
            <Input
              {...formik.getFieldProps("client_email")}
              type="email"
              placeholder="client@example.com"
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
            />
            {formik.touched.client_email && formik.errors.client_email && (
              <p className="text-primary text-xs mt-1">
                {formik.errors.client_email}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/80 text-sm mb-1 block">
                Date *
              </Label>
              <Input
                {...formik.getFieldProps("meeting_date")}
                type="date"
                className="bg-muted/40 border-border text-foreground "
              />
              {formik.touched.meeting_date && formik.errors.meeting_date && (
                <p className="text-primary text-xs mt-1">
                  {formik.errors.meeting_date}
                </p>
              )}
            </div>
            <div>
              <Label className="text-foreground/80 text-sm mb-1 block">
                Time *
              </Label>
              <Input
                {...formik.getFieldProps("meeting_time")}
                type="time"
                className="bg-muted/40 border-border text-foreground "
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Method *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["phone", "video"] as MeetingType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => formik.setFieldValue("meeting_type", t)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                    formik.values.meeting_type === t
                      ? "border-red-500 bg-red-500/15 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                  )}
                >
                  {t === "phone" ? (
                    <Phone className="h-4 w-4" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {t === "phone" ? "Phone" : "Video"}
                </button>
              ))}
            </div>
          </div>

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
              disabled={isCreating || !formik.isValid}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Meeting
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
  const { settings, availability, isLoadingSettings, isSavingSettings } =
    useAppSelector((s) => s.scheduler);
  const { user: authUser } = useAppSelector((s) => s.brokerAuth);
  const { brokers } = useAppSelector((s) => s.brokers);
  const isAdmin = authUser?.role === "admin";

  // Load partner brokers for admin link generation
  useEffect(() => {
    if (isAdmin && brokers.length === 0) {
      dispatch(fetchBrokers({}));
    }
  }, [isAdmin]); // eslint-disable-line

  const [copiedBrokerId, setCopiedBrokerId] = useState<number | null>(null);
  const handleCopyPartnerLink = (
    brokerId: number,
    token: string | null | undefined,
  ) => {
    if (!token) return;
    const link = `${window.location.origin}/scheduler/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedBrokerId(brokerId);
    setTimeout(() => setCopiedBrokerId(null), 2000);
  };

  const [localAvailability, setLocalAvailability] = useState<
    SchedulerAvailability[]
  >([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (availability.length > 0) {
      setLocalAvailability(availability);
    } else {
      setLocalAvailability(defaultAvailability());
    }
  }, [availability]);

  const settingsFormik = useFormik({
    initialValues: {
      is_enabled: settings?.is_enabled ?? true,
      meeting_title: settings?.meeting_title ?? "Mortgage Consultation",
      meeting_description: settings?.meeting_description ?? "",
      slot_duration_minutes: settings?.slot_duration_minutes ?? 30,
      buffer_time_minutes: settings?.buffer_time_minutes ?? 15,
      advance_booking_days: settings?.advance_booking_days ?? 30,
      min_booking_hours: settings?.min_booking_hours ?? 2,
      timezone: settings?.timezone ?? "America/Chicago",
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
      setTimeout(() => setSaved(false), 2000);
      dispatch(fetchSchedulerSettings());
    },
  });

  const toggleDay = (dayOfWeek: number) => {
    setLocalAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, is_active: !a.is_active } : a,
      ),
    );
  };

  const updateDayTime = (
    dayOfWeek: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setLocalAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, [field]: value + ":00" } : a,
      ),
    );
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form
      onSubmit={settingsFormik.handleSubmit}
      className="space-y-6 max-w-2xl"
    >
      {/* Enable toggle */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Scheduler Status</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {settingsFormik.values.is_enabled
                ? "Clients can book meetings through your scheduler link"
                : "Scheduler is disabled — booking link will show an error"}
            </p>
          </div>
          <Switch
            checked={settingsFormik.values.is_enabled}
            onCheckedChange={(v) =>
              settingsFormik.setFieldValue("is_enabled", v)
            }
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
            {...settingsFormik.getFieldProps("meeting_title")}
            className="bg-muted/40 border-border text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground/80 text-sm mb-1.5 block">
            Description
          </Label>
          <Textarea
            {...settingsFormik.getFieldProps("meeting_description")}
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
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Slot Duration (min)
            </Label>
            <Input
              type="number"
              min={15}
              max={120}
              step={15}
              {...settingsFormik.getFieldProps("slot_duration_minutes")}
              className="bg-muted/40 border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Buffer Between (min)
            </Label>
            <Input
              type="number"
              min={0}
              max={60}
              step={5}
              {...settingsFormik.getFieldProps("buffer_time_minutes")}
              className="bg-muted/40 border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Advance Booking (days)
            </Label>
            <Input
              type="number"
              min={1}
              max={90}
              {...settingsFormik.getFieldProps("advance_booking_days")}
              className="bg-muted/40 border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground/80 text-sm mb-1.5 block">
              Min Booking Notice (hrs)
            </Label>
            <Input
              type="number"
              min={0}
              max={72}
              {...settingsFormik.getFieldProps("min_booking_hours")}
              className="bg-muted/40 border-border text-foreground"
            />
          </div>
        </div>

        <div>
          <Label className="text-foreground/80 text-sm mb-1.5 block">
            Timezone
          </Label>
          <Select
            value={settingsFormik.values.timezone}
            onValueChange={(v) => settingsFormik.setFieldValue("timezone", v)}
          >
            <SelectTrigger className="bg-muted/40 border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {TIMEZONES.map((tz) => (
                <SelectItem
                  key={tz}
                  value={tz}
                  className="text-foreground focus:bg-muted/50"
                >
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Connection methods */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-3">
        <h3 className="font-semibold text-foreground mb-3">
          Connection Methods
        </h3>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-sky-400" />
            <div>
              <p className="text-foreground text-sm font-medium">Phone Call</p>
              <p className="text-xs text-muted-foreground">
                Banker calls client at scheduled time
              </p>
            </div>
          </div>
          <Switch
            checked={settingsFormik.values.allow_phone}
            onCheckedChange={(v) =>
              settingsFormik.setFieldValue("allow_phone", v)
            }
          />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border/30">
          <div className="flex items-center gap-3">
            <Video className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-foreground text-sm font-medium">
                Video Call (Zoom)
              </p>
              <p className="text-xs text-muted-foreground">
                Creates a Zoom meeting automatically. Requires Zoom credentials
                in server env.
              </p>
            </div>
          </div>
          <Switch
            checked={settingsFormik.values.allow_video}
            onCheckedChange={(v) =>
              settingsFormik.setFieldValue("allow_video", v)
            }
          />
        </div>
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
                    className="bg-muted/40 border-border text-foreground text-sm h-8  flex-1 max-w-[120px]"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={av.end_time.slice(0, 5)}
                    onChange={(e) =>
                      updateDayTime(av.day_of_week, "end_time", e.target.value)
                    }
                    className="bg-muted/40 border-border text-foreground text-sm h-8  flex-1 max-w-[120px]"
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

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSavingSettings}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
        >
          {isSavingSettings ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" /> Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save Settings
            </>
          )}
        </Button>
      </div>

      {/* ── Partner Scheduler Links (admin-only) ───────────────────────────── */}
      {isAdmin && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Partner / Mortgage Banker Booking Links
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Copy a personalised booking link for any active broker or partner
            and share it with their clients.
          </p>
          <div className="space-y-2">
            {brokers
              .filter((b) => b.status === "active")
              .map((b) => {
                const link = b.public_token
                  ? `${window.location.origin}/scheduler/${b.public_token}`
                  : null;
                const isCopied = copiedBrokerId === b.id;
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {b.first_name} {b.last_name}
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          {b.role}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link ?? "No public token — link unavailable"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!link}
                      onClick={() =>
                        handleCopyPartnerLink(b.id, b.public_token)
                      }
                      className={cn(
                        "shrink-0 text-xs",
                        isCopied
                          ? "text-green-400"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground hover:text-foreground text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Preview
                        </Button>
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </form>
  );
}

// ─── Main Admin Scheduler Page ────────────────────────────────────────────────

const AdminScheduler: React.FC = () => {
  const dispatch = useAppDispatch();

  const {
    meetings,
    isLoadingMeetings,
    isUpdatingMeeting,
    isCreatingMeeting,
    error,
  } = useAppSelector((s) => s.scheduler);

  const { user } = useAppSelector((s) => s.brokerAuth);

  const [activeTab, setActiveTab] = useState("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingMeeting, setEditingMeeting] = useState<ScheduledMeeting | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchSchedulerSettings());
    dispatch(fetchScheduledMeetings());
  }, [dispatch]);

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
      setShowCreate(false);
      dispatch(fetchScheduledMeetings());
    },
    [dispatch],
  );

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

  const stats = {
    total: meetings.length,
    confirmed: meetings.filter((m) => m.status === "confirmed").length,
    completed: meetings.filter((m) => m.status === "completed").length,
    cancelled: meetings.filter((m) => m.status === "cancelled").length,
  };

  // Broker scheduler share link — personalised with the logged-in broker's public_token
  const schedulerUrl = user?.public_token
    ? `${window.location.origin}/scheduler/${user.public_token}`
    : `${window.location.origin}/scheduler`;

  const [urlCopied, setUrlCopied] = useState(false);
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(schedulerUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <>
      <MetaHelmet
        title="Scheduler — The Mortgage Professionals Admin"
        description="Manage your meeting schedule"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Scheduler
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your availability and client meetings
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => dispatch(fetchScheduledMeetings())}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Meeting
            </Button>
          </div>
        </div>

        {/* Share link bar */}
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
                <ExternalLink className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: stats.total,
              color: "text-foreground",
              bg: "border-border bg-card",
            },
            {
              label: "Confirmed",
              value: stats.confirmed,
              color: "text-green-300",
              bg: "border-green-500/20 bg-green-500/5",
            },
            {
              label: "Completed",
              value: stats.completed,
              color: "text-blue-300",
              bg: "border-blue-500/20 bg-blue-500/5",
            },
            {
              label: "Cancelled",
              value: stats.cancelled,
              color: "text-red-300",
              bg: "border-red-500/20 bg-red-500/5",
            },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-4", s.bg)}>
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/40 border border-border p-1">
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Calendar
            </TabsTrigger>
            <TabsTrigger
              value="meetings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
            >
              <List className="h-4 w-4 mr-1.5" />
              Meetings
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-6">
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
              {isLoadingMeetings ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <CalendarView
                  meetings={meetings}
                  onEditMeeting={setEditingMeeting}
                />
              )}
            </div>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="mt-6 space-y-4">
            {/* Filters */}
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Client
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Date & Time
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Method
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="text-right px-4 py-3" />
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <EditMeetingDialog
        meeting={editingMeeting}
        open={!!editingMeeting}
        onClose={() => setEditingMeeting(null)}
        onSave={handleUpdateMeeting}
        isUpdating={isUpdatingMeeting}
      />

      {/* Create Dialog */}
      <CreateMeetingDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreateMeeting}
        isCreating={isCreatingMeeting}
      />
    </>
  );
};

export default AdminScheduler;
