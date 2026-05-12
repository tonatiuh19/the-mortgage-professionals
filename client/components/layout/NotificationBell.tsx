import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellRing,
  CheckCheck,
  X,
  MessageSquare,
  Phone,
  DollarSign,
  Users,
  CheckCircle2,
  Workflow,
  UserPlus,
  Sparkles,
  Inbox,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  acknowledgeArrivals,
  selectNotifications,
  selectUnreadCount,
  selectLastSeenMaxId,
  selectHasFetchedOnce,
  type BrokerNotification,
  type NotificationCategory,
  type NotificationType,
} from "@/store/slices/notificationsSlice";
import { useToast } from "@/hooks/use-toast";
import {
  playNotificationChime,
  isNotificationSoundMuted,
  setNotificationSoundMuted,
} from "@/lib/notification-sound";
import { getSharedAblyClient } from "@/lib/ably-client";

/**
 * Idle-tab safety net poll interval. The primary delivery channel is Ably
 * realtime — this only runs when the tab regains focus or reconnects, to
 * catch notifications that may have arrived while the websocket was down.
 */
const FALLBACK_POLL_MS = 5 * 60 * 1000;

const CATEGORY_ICON: Record<
  NotificationCategory,
  React.ComponentType<{ className?: string }>
> = {
  message: MessageSquare,
  call: Phone,
  loan: DollarSign,
  client: Users,
  task: CheckCircle2,
  flow: Workflow,
  lead: UserPlus,
  system: Sparkles,
};

const TYPE_RING: Record<NotificationType, string> = {
  info: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
  success: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  error: "bg-red-500/10 text-red-600 ring-red-500/20",
};

interface NotificationBellProps {
  /** Visual variant — `compact` is used in the mobile header. */
  variant?: "default" | "compact";
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  variant = "default",
  className,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionToken = useAppSelector((s) => s.brokerAuth.sessionToken);
  const brokerId = useAppSelector((s) => s.brokerAuth.user?.id ?? null);
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const lastSeenMaxId = useAppSelector(selectLastSeenMaxId);
  const hasFetchedOnce = useAppSelector(selectHasFetchedOnce);

  const [open, setOpen] = React.useState(false);
  const [ringing, setRinging] = React.useState(false);
  const [muted, setMuted] = React.useState(() => isNotificationSoundMuted());
  const ringTimerRef = React.useRef<number | null>(null);

  // Initial fetch + visibility/connectivity-aware safety net.
  // Ably is the primary delivery channel (see effect below); this only fetches
  // on mount, when the tab becomes visible, when the network reconnects, and
  // every 5 minutes as a backstop against missed websocket events.
  React.useEffect(() => {
    if (!sessionToken) return;
    dispatch(fetchNotifications());

    const refresh = () => {
      if (document.visibilityState === "visible") {
        dispatch(fetchNotifications());
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onOnline = () => refresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    const id = window.setInterval(refresh, FALLBACK_POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [dispatch, sessionToken]);

  // Real-time delivery via Ably — subscribes to the per-broker channel and
  // refreshes the slice the moment the server publishes a new notification.
  // No polling cost when the tab is idle and the websocket is healthy.
  React.useEffect(() => {
    if (!sessionToken || !brokerId) return;
    let channel: ReturnType<
      Awaited<ReturnType<typeof getSharedAblyClient>>["channels"]["get"]
    > | null = null;
    let cancelled = false;

    (async () => {
      const client = await getSharedAblyClient(sessionToken);
      if (cancelled || !client) return;
      channel = client.channels.get(`broker-notifications:${brokerId}`);
      channel.subscribe("new", () => {
        // Pull the canonical record (with id + read state) from the API so
        // dedup/grouping logic stays in one place.
        dispatch(fetchNotifications());
      });
    })();

    return () => {
      cancelled = true;
      try {
        channel?.unsubscribe();
      } catch {
        /* noop */
      }
    };
  }, [dispatch, sessionToken, brokerId]);

  // Detect new arrivals — toast + ring animation
  React.useEffect(() => {
    if (!hasFetchedOnce) return;
    const fresh = notifications.filter(
      (n) => n.id > lastSeenMaxId && !n.is_read,
    );
    if (fresh.length === 0) return;

    // Trigger bell ring animation
    setRinging(true);
    if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    ringTimerRef.current = window.setTimeout(() => setRinging(false), 1800);

    // Cool synthesized chime (independent from call audio)
    playNotificationChime();

    // Toast (most recent only, to avoid spamming)
    const latest = fresh[0];
    toast({
      title: latest.title,
      description: latest.message,
    });

    // Acknowledge so we don't toast again next poll
    dispatch(acknowledgeArrivals());
  }, [notifications, lastSeenMaxId, hasFetchedOnce, dispatch, toast]);

  // Clear ring timer only on unmount to prevent the ping staying forever
  React.useEffect(() => {
    return () => {
      if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    };
  }, []);

  const handleClickNotification = (n: BrokerNotification) => {
    if (!n.is_read) dispatch(markAsRead(n.id));
    if (n.action_url) {
      setOpen(false);
      // Old email notifications were stored with /admin/conversations URL
      // (before the email-specific route existed). Rewrite them on the fly so
      // clicking either old or new email notifications always opens the Email page.
      const isEmailNotification = /\bemail\b/i.test(n.title);
      const conversationsEmailUrl = n.action_url.replace(
        /^\/admin\/conversations(\?conversation=)/,
        "/admin/email$1",
      );
      navigate(isEmailNotification ? conversationsEmailUrl : n.action_url);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) dispatch(markAllAsRead());
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setNotificationSoundMuted(next);
    // Audible confirmation when unmuting so the user hears the sound.
    if (!next) playNotificationChime();
  };

  const grouped = React.useMemo(
    () => groupByDate(notifications),
    [notifications],
  );

  const buttonSize = variant === "compact" ? "h-9 w-9" : "h-9 w-9";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className={cn(
            "relative rounded-full hover:bg-primary/10 transition-colors",
            buttonSize,
            className,
          )}
        >
          <motion.div
            animate={
              ringing
                ? {
                    rotate: [0, -18, 16, -14, 12, -8, 6, -3, 0],
                  }
                : { rotate: 0 }
            }
            transition={{ duration: 1.4, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 0%" }}
          >
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-primary" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
          </motion.div>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-background shadow-sm"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Pulse ring when ringing */}
          {ringing && (
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,400px)] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 via-primary/0 to-primary/5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleMute}
                  aria-label={
                    muted
                      ? "Unmute notification sound"
                      : "Mute notification sound"
                  }
                  aria-pressed={muted}
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{muted ? "Sound muted" : "Sound on"}</p>
              </TooltipContent>
            </Tooltip>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[480px] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="py-1">
              {grouped.map(([label, items]) => (
                <div key={label}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                  <AnimatePresence initial={false}>
                    {items.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onClick={() => handleClickNotification(n)}
                        onDismiss={() => dispatch(dismissNotification(n.id))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const NotificationItem: React.FC<{
  notification: BrokerNotification;
  onClick: () => void;
  onDismiss: () => void;
}> = ({ notification, onClick, onDismiss }) => {
  const Icon = CATEGORY_ICON[notification.category] ?? Sparkles;
  const ring = TYPE_RING[notification.notification_type] ?? TYPE_RING.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2",
        notification.is_read
          ? "border-transparent hover:bg-muted/50"
          : "border-primary bg-primary/5 hover:bg-primary/10",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "shrink-0 h-9 w-9 rounded-full flex items-center justify-center ring-1",
          ring,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug truncate",
              notification.is_read ? "font-medium" : "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted-foreground/10"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
      <Inbox className="h-6 w-6 text-primary" />
    </div>
    <p className="text-sm font-semibold">You're all caught up</p>
    <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
      New messages, calls, loans and reminders will show up here in real time.
    </p>
  </div>
);

// ----- helpers -----

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function groupByDate(
  list: BrokerNotification[],
): [string, BrokerNotification[]][] {
  const today: BrokerNotification[] = [];
  const yesterday: BrokerNotification[] = [];
  const earlier: BrokerNotification[] = [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  for (const n of list) {
    const t = new Date(n.created_at).getTime();
    if (t >= startOfToday) today.push(n);
    else if (t >= startOfYesterday) yesterday.push(n);
    else earlier.push(n);
  }

  const out: [string, BrokerNotification[]][] = [];
  if (today.length) out.push(["Today", today]);
  if (yesterday.length) out.push(["Yesterday", yesterday]);
  if (earlier.length) out.push(["Earlier", earlier]);
  return out;
}

export default NotificationBell;
