import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Calendar,
  Clock,
} from "lucide-react";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPublicScheduler } from "@/store/slices/schedulerSlice";
import { ClientDatePicker } from "@/components/ClientDatePicker";
import { ClientTimePicker } from "@/components/ClientTimePicker";

interface RescheduleInfo {
  broker_public_token: string;
  broker_name: string | null;
  broker_timezone: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  meeting_type: "phone" | "video";
  old_meeting_date: string;
  old_meeting_time: string;
}

interface SuccessInfo {
  booking_token: string;
  meeting_date: string;
  meeting_time: string;
  zoom_join_url: string | null;
  broker_name: string;
}

export default function SchedulerReschedule() {
  const { bookingToken } = useParams<{ bookingToken: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { availableDates, isLoadingPublic } = useAppSelector(
    (s) => s.scheduler,
  );

  const [status, setStatus] = useState<
    "loading" | "confirming" | "submitting" | "success" | "error"
  >("loading");
  const [info, setInfo] = useState<RescheduleInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);

  useEffect(() => {
    if (!bookingToken) return;
    // Fetch meeting info first to show a confirmation screen
    axios
      .get<{ success: boolean; error?: string } & Partial<RescheduleInfo>>(
        `/api/public/scheduler/reschedule/${bookingToken}`,
      )
      .then(({ data }) => {
        if (!data.success) {
          setError(data.error ?? "Booking not found");
          setStatus("error");
          return;
        }
        if (!data.broker_public_token) {
          setError("This booking cannot be rescheduled right now.");
          setStatus("error");
          return;
        }
        setInfo({
          broker_public_token: data.broker_public_token!,
          broker_name: data.broker_name ?? null,
          broker_timezone: data.broker_timezone ?? null,
          client_name: data.client_name!,
          client_email: data.client_email!,
          client_phone: data.client_phone ?? null,
          meeting_type: (data.meeting_type as "phone" | "video") ?? "phone",
          old_meeting_date: data.old_meeting_date!,
          old_meeting_time: data.old_meeting_time!,
        });
        // Load public scheduler data for available dates
        dispatch(fetchPublicScheduler(data.broker_public_token!));
        setStatus("confirming");
      })
      .catch(() => {
        setError("Could not load booking information. Please try again.");
        setStatus("error");
      });
  }, [bookingToken]);

  const handleConfirm = async () => {
    if (!info || !bookingToken || !newDate || !newTime) return;
    setStatus("submitting");
    try {
      const { data } = await axios.post<{
        success: boolean;
        booking_token?: string;
        meeting_date?: string;
        meeting_time?: string;
        zoom_join_url?: string | null;
        broker_name?: string;
        error?: string;
      }>(`/api/public/scheduler/reschedule/${bookingToken}`, {
        new_date: newDate,
        new_time: newTime,
      });
      if (!data.success) {
        setError(data.error ?? "Failed to reschedule booking");
        setStatus("error");
        return;
      }
      setSuccessInfo({
        booking_token: data.booking_token!,
        meeting_date: data.meeting_date!,
        meeting_time: data.meeting_time!,
        zoom_join_url: data.zoom_join_url ?? null,
        broker_name:
          data.broker_name ?? info.broker_name ?? "Your Mortgage Banker",
      });
      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const formatDate = (d: string) => {
    const raw = (d ?? "").trim();
    const parsed = new Date(raw);
    const fallback = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00`)
      : null;
    const finalDate = !Number.isNaN(parsed.getTime())
      ? parsed
      : fallback && !Number.isNaN(fallback.getTime())
        ? fallback
        : null;

    if (!finalDate) return "Date unavailable";

    return finalDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const meetingTypeLabel = (value: "phone" | "video") =>
    value === "video" ? "Video Call" : "Phone Call";

  const isSubmitting = status === "submitting";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — matches Scheduler page */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <img
            src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
            alt="The Mortgage Professionals"
            className="h-8 w-auto"
          />
        </div>
      </header>

      <div className="flex items-center justify-center p-4 sm:p-6 py-10">
        <AnimatePresence mode="wait">
          {(status === "loading" ||
            (status === "confirming" && isLoadingPublic)) && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-muted-foreground"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading your booking…</p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4"
            >
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="text-lg font-bold text-foreground">
                Unable to Reschedule
              </h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => navigate("/")}
                className="text-sm text-primary hover:underline font-medium"
              >
                Return home
              </button>
            </motion.div>
          )}

          {status === "success" && successInfo && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-8 text-center space-y-5"
            >
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">All Set!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your meeting has been rescheduled.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">With</span>
                  <span className="font-medium text-foreground">
                    {successInfo.broker_name}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">
                    {formatDate(successInfo.meeting_date)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">
                    {formatTime(successInfo.meeting_time)}
                  </span>
                </div>
                {successInfo.zoom_join_url && (
                  <div className="pt-2 border-t border-border">
                    <a
                      href={successInfo.zoom_join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-9 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                    >
                      Join Video Call
                    </a>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                A confirmation email has been sent to {info?.client_email}.
              </p>
            </motion.div>
          )}

          {status === "confirming" && info && !isLoadingPublic && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-lg space-y-4"
            >
              {/* Header */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <CalendarClock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Reschedule Meeting
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Choose a new date and time below
                    </p>
                  </div>
                </div>

                {/* Current booking summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Current booking
                  </p>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">With</span>
                    <span className="font-medium text-foreground text-right">
                      {info.broker_name || "Your Mortgage Banker"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium text-foreground text-right">
                      {info.client_name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Meeting Type</span>
                    <span className="font-medium text-foreground text-right">
                      {meetingTypeLabel(info.meeting_type)}
                    </span>
                  </div>
                  {info.broker_timezone && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Timezone</span>
                      <span className="font-medium text-foreground text-right">
                        {info.broker_timezone}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/60 pt-2 mt-1">
                    <span className="text-muted-foreground">Was</span>
                    <span className="font-medium text-foreground text-right">
                      {formatDate(info.old_meeting_date)} ·{" "}
                      {formatTime(info.old_meeting_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* New date + time pickers */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <p className="text-sm font-semibold text-foreground">
                  Pick a new slot
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    Date
                  </div>
                  <ClientDatePicker
                    value={newDate}
                    onChange={(d) => {
                      setNewDate(d);
                      setNewTime(""); // reset time when date changes
                    }}
                    availableDates={availableDates}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    Time
                  </div>
                  <ClientTimePicker
                    date={newDate}
                    value={newTime}
                    onChange={setNewTime}
                    brokerToken={info.broker_public_token}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={!newDate || !newTime || isSubmitting}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rescheduling…
                    </>
                  ) : (
                    "Confirm Reschedule"
                  )}
                </button>
                <button
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                  className="w-full h-10 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Keep my current appointment
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
