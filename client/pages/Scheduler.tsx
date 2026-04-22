import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import {
  CalendarDays,
  Clock,
  Phone,
  Video,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  User,
  Mail,
  MessageSquare,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  Star,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPublicScheduler,
  fetchPublicSlots,
  bookMeeting,
  setSelectedDate,
  clearBookingSuccess,
} from "@/store/slices/schedulerSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useFormik } from "formik";
import * as Yup from "yup";
import type { MeetingType } from "@shared/api";
import { MetaHelmet } from "@/components/MetaHelmet";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type Step = "calendar" | "slots" | "form" | "confirm";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatSlotTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TZ_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time (ET)",
  "America/Chicago": "Central Time (CT)",
  "America/Denver": "Mountain Time (MT)",
  "America/Phoenix": "Mountain Time – no DST (MT)",
  "America/Los_Angeles": "Pacific Time (PT)",
  "America/Anchorage": "Alaska Time (AKT)",
  "Pacific/Honolulu": "Hawaii Time (HST)",
};

function friendlyTz(tz: string): string {
  return TZ_LABELS[tz] ?? tz.replace(/_/g, " ");
}

function formatDisplayDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMMM d");
}

// ---------------------------------------------------------------------------
// Booking form validation
// ---------------------------------------------------------------------------

const bookingSchema = Yup.object({
  client_name: Yup.string()
    .min(2, "Name too short")
    .required("Full name is required"),
  client_email: Yup.string()
    .email("Invalid email")
    .required("Email is required"),
  client_phone: Yup.string().matches(
    /^[\d\s\-\(\)\+]*$/,
    "Invalid phone number",
  ),
  notes: Yup.string().max(500, "Max 500 characters"),
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CalendarGrid({
  year,
  month,
  availableDates,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  availableDates: string[];
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const availableSet = new Set(availableDates);

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-foreground font-semibold text-base">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const cellDate = new Date(year, month, day);
          const isPast = cellDate < today;
          const isAvailable = availableSet.has(dateStr);

          return (
            <button
              key={dateStr}
              disabled={isPast || !isAvailable}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "aspect-square rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center relative",
                isPast && "text-muted-foreground/30 cursor-not-allowed",
                !isPast &&
                  !isAvailable &&
                  "text-muted-foreground/40 cursor-not-allowed",
                isAvailable &&
                  !isPast && [
                    "text-foreground cursor-pointer",
                    "bg-gradient-to-br from-primary/15 to-primary/20",
                    "border border-primary/30 hover:border-primary",
                    "hover:from-primary/30 hover:to-primary/40",
                    "hover:scale-105 hover:shadow-lg hover:shadow-primary/20",
                  ],
              )}
            >
              {day}
              {isAvailable && !isPast && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotGrid({
  slots,
  onSelect,
}: {
  slots: Array<{ time: string; end_time: string; available: boolean }>;
  onSelect: (time: string) => void;
}) {
  const available = slots.filter((s) => s.available);

  if (available.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No slots available on this day</p>
        <p className="text-sm mt-1">Please pick another date</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {available.map((slot) => (
        <motion.button
          key={slot.time}
          onClick={() => onSelect(slot.time)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="py-2.5 px-1 rounded-xl border border-primary/30 bg-primary/10 text-foreground text-sm font-medium hover:border-primary hover:bg-primary/20 transition-all text-center"
        >
          {formatSlotTime(slot.time)}
        </motion.button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SchedulerPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const location = useLocation();
  const prefill = (
    location.state as {
      prefill?: {
        client_name?: string;
        client_email?: string;
        client_phone?: string | null;
      };
    } | null
  )?.prefill;
  const dispatch = useAppDispatch();

  const {
    publicBroker,
    availableDates,
    selectedDate,
    availableSlots,
    isLoadingPublic,
    isLoadingSlots,
    isBooking,
    bookingSuccess,
    publicError,
  } = useAppSelector((s) => s.scheduler);

  const [step, setStep] = useState<Step>("calendar");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>("phone");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dispatch(fetchPublicScheduler(token));
  }, [dispatch, token]);

  useEffect(() => {
    if (bookingSuccess) setStep("confirm");
  }, [bookingSuccess]);

  const handleSelectDate = useCallback(
    (date: string) => {
      dispatch(setSelectedDate(date));
      dispatch(fetchPublicSlots({ brokerToken: token, date }));
      setStep("slots");
    },
    [dispatch, token],
  );

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep("form");
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
  };

  const formik = useFormik({
    initialValues: {
      client_name: prefill?.client_name ?? "",
      client_email: prefill?.client_email ?? "",
      client_phone: prefill?.client_phone ?? "",
      notes: "",
    },
    validationSchema: bookingSchema,
    onSubmit: (values) => {
      if (!publicBroker || !selectedDate || !selectedTime) return;
      dispatch(
        bookMeeting({
          broker_token: token || "default",
          client_name: values.client_name,
          client_email: values.client_email,
          client_phone: values.client_phone || undefined,
          meeting_date: selectedDate,
          meeting_time: selectedTime,
          meeting_type: meetingType,
          notes: values.notes || undefined,
        }),
      );
    },
  });

  const handleCopyLink = () => {
    if (bookingSuccess?.zoom_join_url) {
      navigator.clipboard.writeText(bookingSuccess.zoom_join_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ------------- loading / error states -------------
  if (isLoadingPublic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  if (publicError || !publicBroker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Scheduler Unavailable
          </h2>
          <p className="text-muted-foreground">
            {publicError || "This scheduler link is not active."}
          </p>
        </div>
      </div>
    );
  }

  const brokerFullName = `${publicBroker.first_name} ${publicBroker.last_name}`;
  const selectedSlotData = availableSlots.find((s) => s.time === selectedTime);

  const stepProgress =
    step === "calendar"
      ? 25
      : step === "slots"
        ? 50
        : step === "form"
          ? 75
          : 100;

  return (
    <>
      <MetaHelmet
        title={`Schedule a Call — ${brokerFullName} | The Mortgage Professionals`}
        description={
          publicBroker.meeting_description ||
          "Book a free mortgage consultation."
        }
      />

      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <img
              src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
              alt="The Mortgage Professionals"
              className="h-8 w-auto"
            />
            <Badge
              variant="outline"
              className="border-primary/40 text-primary text-xs"
            >
              Free Consultation
            </Badge>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-10 lg:py-16">
          <div className="grid lg:grid-cols-[340px_1fr] gap-8">
            {/* Left panel — broker info */}
            <aside className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-4 mb-5">
                  <Avatar className="h-14 w-14 border-2 border-primary/40">
                    <AvatarImage src={publicBroker.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                      {publicBroker.first_name[0]}
                      {publicBroker.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-bold text-foreground text-lg leading-tight">
                      {brokerFullName}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {publicBroker.role === "broker"
                        ? "Partner"
                        : "Mortgage Banker"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-base">
                    {publicBroker.meeting_title}
                  </h3>
                  {publicBroker.meeting_description && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {publicBroker.meeting_description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-5 border-t border-border space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {publicBroker.slot_duration_minutes} min per session
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Up to {publicBroker.advance_booking_days} days in advance
                    </span>
                  </div>
                  {publicBroker.allow_phone && (
                    <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <span>Phone call available</span>
                    </div>
                  )}
                  {publicBroker.allow_video && (
                    <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                      <Video className="h-4 w-4 text-primary shrink-0" />
                      <span>Video call available (Zoom)</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Selected summary */}
              <AnimatePresence>
                {selectedDate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Selected
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        {formatDisplayDate(selectedDate)}
                      </div>
                      {step !== "confirm" && (
                        <button
                          type="button"
                          onClick={() => setStep("calendar")}
                          className="text-xs font-semibold text-primary hover:underline shrink-0"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    {selectedTime && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          {formatSlotTime(selectedTime)}
                          {selectedSlotData && (
                            <span className="text-muted-foreground text-sm">
                              – {formatSlotTime(selectedSlotData.end_time)}
                            </span>
                          )}
                        </div>
                        {step !== "confirm" && (
                          <button
                            type="button"
                            onClick={() => setStep("slots")}
                            className="text-xs font-semibold text-primary hover:underline shrink-0"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    )}
                    {meetingType && step === "form" && (
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        {meetingType === "phone" ? (
                          <Phone className="h-4 w-4 text-primary" />
                        ) : (
                          <Video className="h-4 w-4 text-primary" />
                        )}
                        {meetingType === "phone" ? "Phone call" : "Video call"}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>

            {/* Right panel — step content */}
            <main>
              {/* Progress bar */}
              {step !== "confirm" && (
                <div className="mb-7">
                  <div className="flex items-center gap-2 mb-2">
                    {(["calendar", "slots", "form"] as Step[]).map((s, i) => (
                      <React.Fragment key={s}>
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                            step === s || stepProgress > (i + 1) * 25
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </div>
                        {i < 2 && (
                          <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{
                                width:
                                  stepProgress > (i + 1) * 25 ? "100%" : "0%",
                              }}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-0.5">
                    <span>Date</span>
                    <span className="mr-2">Time</span>
                    <span>Details</span>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ── Step 1: Calendar ────────────────────────────────── */}
                {step === "calendar" && (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Pick a Date
                    </h2>
                    <CalendarGrid
                      year={calYear}
                      month={calMonth}
                      availableDates={availableDates}
                      onSelectDate={handleSelectDate}
                      onPrevMonth={handlePrevMonth}
                      onNextMonth={handleNextMonth}
                    />
                    {availableDates.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm mt-6">
                        No available dates found. Please check back later.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* ── Step 2: Time slots ──────────────────────────────── */}
                {step === "slots" && (
                  <motion.div
                    key="slots"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => setStep("calendar")}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        {selectedDate
                          ? formatDisplayDate(selectedDate)
                          : "Pick a Time"}
                      </h2>
                    </div>

                    {/* Timezone notice */}
                    {publicBroker.timezone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 bg-muted/40 rounded-lg px-3 py-2">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Times shown in{" "}
                          <span className="font-semibold text-foreground">
                            {friendlyTz(publicBroker.timezone)}
                          </span>
                          {Intl.DateTimeFormat().resolvedOptions().timeZone !==
                            publicBroker.timezone && (
                            <span className="ml-1 text-amber-600">
                              · your local time is{" "}
                              <span className="font-semibold">
                                {friendlyTz(
                                  Intl.DateTimeFormat().resolvedOptions()
                                    .timeZone,
                                )}
                              </span>
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {isLoadingSlots ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      </div>
                    ) : (
                      <SlotGrid
                        slots={availableSlots}
                        onSelect={handleSelectTime}
                      />
                    )}
                  </motion.div>
                )}

                {/* ── Step 3: Booking form ────────────────────────────── */}
                {step === "form" && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => setStep("slots")}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                      <h2 className="text-lg font-bold text-foreground">
                        Your Details
                      </h2>
                    </div>

                    {/* Meeting type selector */}
                    {publicBroker.allow_phone && publicBroker.allow_video && (
                      <div className="mb-6">
                        <p className="text-sm font-medium text-foreground/80 mb-3">
                          How would you like to connect?
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            {
                              type: "phone" as MeetingType,
                              icon: Phone,
                              label: "Phone Call",
                              desc: "We'll call you",
                            },
                            {
                              type: "video" as MeetingType,
                              icon: Video,
                              label: "Video Call",
                              desc: "Zoom meeting",
                            },
                          ].map(({ type, icon: Icon, label, desc }) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setMeetingType(type)}
                              className={cn(
                                "rounded-xl border p-4 text-left transition-all",
                                meetingType === type
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-border/80 bg-muted/30",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-5 w-5 mb-2",
                                  meetingType === type
                                    ? "text-primary"
                                    : "text-muted-foreground",
                                )}
                              />
                              <p
                                className={cn(
                                  "font-semibold text-sm",
                                  meetingType === type
                                    ? "text-foreground"
                                    : "text-foreground/80",
                                )}
                              >
                                {label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Only phone allowed */}
                    {publicBroker.allow_phone && !publicBroker.allow_video && (
                      <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/8 p-4 flex items-center gap-3">
                        <Phone className="h-5 w-5 text-sky-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            Phone Call
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Your banker will call you at the scheduled time.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Only video allowed */}
                    {!publicBroker.allow_phone && publicBroker.allow_video && (
                      <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/8 p-4 flex items-center gap-3">
                        <Video className="h-5 w-5 text-green-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            Video Call via Zoom
                          </p>
                          <p className="text-xs text-muted-foreground">
                            No download required — works in any browser.
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={formik.handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                          Full Name <span className="text-primary">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...formik.getFieldProps("client_name")}
                            placeholder="John Smith"
                            className="pl-9"
                          />
                        </div>
                        {formik.touched.client_name &&
                          formik.errors.client_name && (
                            <p className="text-red-400 text-xs mt-1">
                              {formik.errors.client_name}
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                          Email <span className="text-primary">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...formik.getFieldProps("client_email")}
                            type="email"
                            placeholder="john@example.com"
                            className="pl-9"
                          />
                        </div>
                        {formik.touched.client_email &&
                          formik.errors.client_email && (
                            <p className="text-red-400 text-xs mt-1">
                              {formik.errors.client_email}
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                          Phone
                          {meetingType === "phone" && (
                            <span className="text-primary ml-1">*</span>
                          )}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...formik.getFieldProps("client_phone")}
                            type="tel"
                            placeholder="(555) 000-0000"
                            className="pl-9"
                          />
                        </div>
                        {formik.touched.client_phone &&
                          formik.errors.client_phone && (
                            <p className="text-red-400 text-xs mt-1">
                              {formik.errors.client_phone}
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                          Notes{" "}
                          <span className="text-muted-foreground text-xs">
                            (optional)
                          </span>
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            {...formik.getFieldProps("notes")}
                            rows={3}
                            placeholder="Tell us about your situation, goals, or any questions…"
                            className="pl-9 resize-none"
                          />
                        </div>
                        {formik.touched.notes && formik.errors.notes && (
                          <p className="text-red-400 text-xs mt-1">
                            {formik.errors.notes}
                          </p>
                        )}
                      </div>

                      {publicError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center gap-2 text-red-300 text-sm">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {publicError}
                        </div>
                      )}

                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          type="submit"
                          disabled={isBooking || !formik.isValid}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl"
                        >
                          {isBooking ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Booking...
                            </>
                          ) : (
                            "Confirm Booking"
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </motion.div>
                )}

                {/* ── Step 4: Confirmation ────────────────────────────── */}
                {step === "confirm" && bookingSuccess && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-green-500/30 bg-card p-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        delay: 0.1,
                      }}
                      className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle2 className="h-10 w-10 text-green-400" />
                    </motion.div>

                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      You're Booked!
                    </h2>
                    <p className="text-muted-foreground mb-7">
                      A confirmation email has been sent to{" "}
                      <strong className="text-foreground">
                        {formik.values.client_email}
                      </strong>
                    </p>

                    <div className="rounded-xl border border-border bg-muted/30 p-5 mb-6 text-left space-y-3">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground font-medium">
                          {format(
                            parseISO(bookingSuccess.meeting_date),
                            "EEEE, MMMM d, yyyy",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground font-medium">
                          {formatSlotTime(bookingSuccess.meeting_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {bookingSuccess.meeting_type === "phone" ? (
                          <Phone className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Video className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <span className="text-foreground font-medium">
                          {bookingSuccess.meeting_type === "phone"
                            ? "Phone Call"
                            : "Video Call"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground font-medium">
                          {bookingSuccess.broker_name}
                        </span>
                      </div>
                    </div>

                    {bookingSuccess.zoom_join_url && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-4 mb-6">
                        <p className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                          <Video className="h-4 w-4" /> Zoom Meeting Link
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-foreground/80 flex-1 break-all">
                            {bookingSuccess.zoom_join_url}
                          </p>
                          <button
                            onClick={handleCopyLink}
                            className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <a
                            href={bookingSuccess.zoom_join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )}

                    <p className="text-muted-foreground text-sm">
                      Need to cancel? Use the link in your confirmation email.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default SchedulerPage;
