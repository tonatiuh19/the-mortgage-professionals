import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Loader2,
  Trash2,
  Filter,
  ExternalLink,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  dismissNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  type NotificationCategory,
} from "@/store/slices/notificationsSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: Array<{ value: "all" | NotificationCategory; label: string }> =
  [
    { value: "all", label: "All" },
    { value: "message", label: "Messages" },
    { value: "call", label: "Calls" },
    { value: "loan", label: "Loans" },
    { value: "client", label: "Clients" },
    { value: "task", label: "Tasks" },
    { value: "flow", label: "Flows" },
    { value: "lead", label: "Leads" },
    { value: "system", label: "System" },
  ];

const Notifications = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifications, unreadCount, isLoading } = useAppSelector(
    (s) => s.notifications,
  );
  const [category, setCategory] = useState<"all" | NotificationCategory>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (category !== "all" && n.category !== category) return false;
      if (unreadOnly && n.is_read) return false;
      return true;
    });
  }, [notifications, category, unreadOnly]);

  const handleOpen = async (id: number, actionUrl: string | null, isRead: boolean) => {
    if (!isRead) {
      await dispatch(markAsRead(id));
    }
    if (actionUrl) {
      navigate(actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`);
    }
  };

  const handleMarkAll = async () => {
    try {
      await dispatch(markAllAsRead()).unwrap();
      toast({ title: "All notifications marked as read" });
    } catch (err: unknown) {
      toast({
        title: "Could not mark all as read",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Notifications",
          "Notification management and alert system",
        )}
      />
      <div className="flex flex-col h-full min-h-0 gap-4 p-4 md:p-6">
        <PageHeader
          title="Notification Center"
          description="Review in-app alerts for loans, messages, calls, and workflows. Email toggles live on your Profile."
          icon={<Bell className="h-5 w-5" />}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={handleMarkAll}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={category}
              onValueChange={(v) =>
                setCategory(v as "all" | NotificationCategory)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="sm"
            variant={unreadOnly ? "default" : "outline"}
            onClick={() => setUnreadOnly((v) => !v)}
          >
            Unread only
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>

        {isLoading && notifications.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No notifications match your filters.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2 pb-8">
            {filtered.map((n) => (
              <li key={n.id}>
                <Card
                  className={cn(
                    "transition-colors",
                    !n.is_read && "border-primary/30 bg-primary/[0.03]",
                  )}
                >
                  <CardContent className="flex flex-wrap items-start gap-3 p-4">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        handleOpen(n.id, n.action_url, n.is_read)
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{n.title}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {n.category}
                        </Badge>
                        {!n.is_read && (
                          <Badge className="text-xs bg-primary text-primary-foreground">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {n.action_url && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            handleOpen(n.id, n.action_url, n.is_read)
                          }
                          aria-label="Open"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {!n.is_read && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => dispatch(markAsRead(n.id))}
                        >
                          Mark read
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => dispatch(dismissNotification(n.id))}
                        aria-label="Dismiss"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default Notifications;
