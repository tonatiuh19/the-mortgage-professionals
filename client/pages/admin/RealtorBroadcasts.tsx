import { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Mail,
  MessageSquare,
  Send,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getSharedAblyClient } from "@/lib/ably-client";
import {
  fetchBroadcasts,
  fetchBroadcastDetail,
  fetchBroadcastRecipients,
  previewBroadcastAudience,
  createBroadcast,
  cancelBroadcast,
  clearAudiencePreview,
  clearActiveBroadcast,
  clearBroadcastError,
} from "@/store/slices/broadcastsSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@shared/api";
import type {
  RealtorBroadcast,
  RealtorBroadcastChannel,
  RealtorBroadcastAudienceFilter,
} from "@shared/api";
import {
  estimateSmsSegments,
  estimateBroadcastSmsSegments,
  SMS_COST_PER_SEGMENT_USD,
  SMS_SEGMENT_SOFT_WARN,
  SMS_SEGMENT_HARD_CONFIRM,
} from "@shared/sms-segments";

const SEGMENT_OPTIONS = [
  { value: "all_active_realtors", label: "Active realtors / partners" },
  { value: "prospects", label: "Realtor prospects" },
  { value: "all_clients", label: "Active clients" },
  { value: "refi_rates_dropped", label: "Refi rates-dropped list" },
];

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-sky-100 text-sky-800",
  sending: "bg-amber-100 text-amber-800",
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-slate-200 text-slate-600",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("gap-1 font-normal", STATUS_STYLE[status] || "")}>
      {status === "sending" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === "sent" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : status === "scheduled" ? (
        <Calendar className="h-3 w-3" />
      ) : status === "cancelled" ? (
        <Ban className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {status}
    </Badge>
  );
}

const RealtorBroadcasts = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const user = useAppSelector((s) => s.brokerAuth.user);
  const sessionToken = useAppSelector((s) => s.brokerAuth.sessionToken);
  const {
    broadcasts,
    audiencePreview,
    activeBroadcast,
    recipients,
    isLoading,
    isSending,
    isPreviewing,
    error,
  } = useAppSelector((s) => s.broadcasts);

  const isAdmin = isAdminRole(user?.role ?? "");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<RealtorBroadcastChannel>("sms");
  const [segments, setSegments] = useState<string[]>(["all_active_realtors"]);
  const [subject, setSubject] = useState("");
  const [bodyEmail, setBodyEmail] = useState("");
  const [bodySms, setBodySms] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule" | "draft">(
    "now",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirmHighSegs, setConfirmHighSegs] = useState(false);

  const smsEstimate = useMemo(() => estimateSmsSegments(bodySms), [bodySms]);
  const smsRecipientCount = audiencePreview?.sms_count ?? 0;
  const blastCost = useMemo(
    () => estimateBroadcastSmsSegments(bodySms, smsRecipientCount),
    [bodySms, smsRecipientCount],
  );

  useEffect(() => {
    if (isAdmin) dispatch(fetchBroadcasts({ limit: 50 }));
  }, [dispatch, isAdmin]);

  // Live refresh when a broadcast finishes (async send completes in background).
  useEffect(() => {
    if (!isAdmin || !sessionToken || !user?.id) return;
    let ablyCleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const client = await getSharedAblyClient(sessionToken);
      if (cancelled || !client) return;
      const ch = client.channels.get(`broker-notifications:${user.id}`);
      const onUpdate = () => {
        dispatch(fetchBroadcasts({ limit: 50 }));
        if (detailId != null) {
          dispatch(fetchBroadcastDetail(detailId));
          dispatch(
            fetchBroadcastRecipients({ broadcastId: detailId, limit: 100 }),
          );
        }
      };
      ch.subscribe("broadcast-updated", onUpdate);
      ablyCleanup = () => {
        try {
          ch.unsubscribe("broadcast-updated", onUpdate);
        } catch {
          /* noop */
        }
      };
    })();

    return () => {
      cancelled = true;
      ablyCleanup?.();
    };
  }, [dispatch, isAdmin, sessionToken, user?.id, detailId]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Broadcast error",
        description: error,
        variant: "destructive",
      });
      dispatch(clearBroadcastError());
    }
  }, [error, toast, dispatch]);

  const resetWizard = () => {
    setStep(0);
    setTitle("");
    setChannel("sms");
    setSegments(["all_active_realtors"]);
    setSubject("");
    setBodyEmail("");
    setBodySms("");
    setSendMode("now");
    setScheduledAt("");
    setConfirmHighSegs(false);
    dispatch(clearAudiencePreview());
  };

  const toggleSegment = (value: string) => {
    setSegments((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const audienceFilter = (): RealtorBroadcastAudienceFilter => ({ segments });

  const runPreview = async () => {
    if (!segments.length) {
      toast({
        title: "Select at least one audience segment",
        variant: "destructive",
      });
      return;
    }
    const result = await dispatch(
      previewBroadcastAudience({
        audience_filter: audienceFilter(),
        channel,
        body_sms: bodySms || undefined,
      }),
    );
    if (previewBroadcastAudience.fulfilled.match(result)) {
      setStep(1);
    }
  };

  const submitBroadcast = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if ((channel === "sms" || channel === "both") && !bodySms.trim()) {
      toast({ title: "SMS body is required", variant: "destructive" });
      return;
    }
    if ((channel === "email" || channel === "both") && !bodyEmail.trim()) {
      toast({ title: "Email body is required", variant: "destructive" });
      return;
    }
    if (
      smsEstimate.segmentCount >= SMS_SEGMENT_HARD_CONFIRM &&
      !confirmHighSegs
    ) {
      toast({
        title: "Confirm long SMS",
        description: `This message uses ${SMS_SEGMENT_HARD_CONFIRM}+ segments. Check the confirmation box.`,
        variant: "destructive",
      });
      return;
    }
    if (sendMode === "schedule" && !scheduledAt) {
      toast({ title: "Pick a schedule time", variant: "destructive" });
      return;
    }

    const result = await dispatch(
      createBroadcast({
        title: title.trim(),
        channel,
        subject: subject || undefined,
        body_email: bodyEmail || undefined,
        body_sms: bodySms || undefined,
        audience_filter: audienceFilter(),
        send_now: sendMode === "now",
        scheduled_at:
          sendMode === "schedule"
            ? new Date(scheduledAt).toISOString()
            : undefined,
      }),
    );

    if (createBroadcast.fulfilled.match(result)) {
      toast({
        title:
          sendMode === "draft"
            ? "Draft saved"
            : sendMode === "schedule"
              ? "Broadcast scheduled"
              : "Broadcast queued",
        description: `${result.payload.recipient_count} recipients`,
      });
      setWizardOpen(false);
      resetWizard();
      dispatch(fetchBroadcasts({ limit: 50 }));
    }
  };

  const handleCancel = async (b: RealtorBroadcast) => {
    const result = await dispatch(cancelBroadcast(b.id));
    if (cancelBroadcast.fulfilled.match(result)) {
      toast({ title: "Broadcast cancelled" });
      dispatch(fetchBroadcasts({ limit: 50 }));
    }
  };

  const openDetail = (id: number) => {
    setDetailId(id);
    dispatch(fetchBroadcastDetail(id));
    dispatch(fetchBroadcastRecipients({ broadcastId: id, limit: 100 }));
  };

  const closeDetail = () => {
    setDetailId(null);
    dispatch(clearActiveBroadcast());
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-muted-foreground">
        Admin access is required for Broadcast Center.
      </div>
    );
  }

  return (
    <>
      <MetaHelmet
        {...adminPageMeta("Broadcasts", "Email and SMS broadcast center")}
      />
      <div className="flex flex-col h-full min-h-0 gap-4 p-4 md:p-6">
        <PageHeader
          title="Broadcast Center"
          description="Compose and send SMS or email blasts to realtors, prospects, and clients"
          icon={<Megaphone className="h-5 w-5 text-primary" />}
          actions={
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                resetWizard();
                setWizardOpen(true);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              New broadcast
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-primary/20 bg-primary/[0.03] py-16 text-center text-muted-foreground">
            No broadcasts yet. Create your first campaign.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell className="uppercase text-xs tracking-wide text-muted-foreground">
                      {b.channel}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {b.recipient_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.sent_count}
                      {b.failed_count > 0 ? (
                        <span className="text-red-600 ml-1">
                          / {b.failed_count} failed
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(b.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(b.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        History
                      </Button>
                      {["draft", "scheduled", "sending"].includes(b.status) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(b)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) resetWizard();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Megaphone className="h-5 w-5" />
              Compose broadcast
            </DialogTitle>
          </DialogHeader>

          {step === 0 && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Campaign title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="March rate update"
                />
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(v) =>
                    setChannel(v as RealtorBroadcastChannel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> SMS only
                      </span>
                    </SelectItem>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email only
                      </span>
                    </SelectItem>
                    <SelectItem value="both">Email + SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  {SEGMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={segments.includes(opt.value)}
                        onCheckedChange={() => toggleSegment(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 py-2">
              {(channel === "email" || channel === "both") && (
                <>
                  <div className="space-y-2">
                    <Label>Email subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email body (HTML ok)</Label>
                    <Textarea
                      rows={5}
                      value={bodyEmail}
                      onChange={(e) => setBodyEmail(e.target.value)}
                      placeholder="Hi {{first_name}}, …"
                    />
                  </div>
                </>
              )}

              {(channel === "sms" || channel === "both") && (
                <div className="space-y-2">
                  <Label>SMS body</Label>
                  <Textarea
                    rows={4}
                    value={bodySms}
                    onChange={(e) => {
                      setBodySms(e.target.value);
                      setConfirmHighSegs(false);
                    }}
                    placeholder="Hi {{first_name}}, rates just dropped…"
                    maxLength={1600}
                  />
                  <div
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs space-y-1",
                      smsEstimate.hardConfirm
                        ? "border-[#F9A826]/60 bg-[#FFF8EB] text-[#0A2F52]"
                        : smsEstimate.softWarn
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-primary/20 bg-primary/[0.04] text-foreground",
                    )}
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Encoding: <strong>{smsEstimate.encoding}</strong>
                      </span>
                      <span>Chars: {smsEstimate.charCount}</span>
                      <span>
                        Segments: <strong>{smsEstimate.segmentCount}</strong>
                      </span>
                      <span>
                        Est. cost ≈ ${blastCost.estimatedCostUsd.toFixed(2)} (~$
                        {SMS_COST_PER_SEGMENT_USD}/seg × {smsRecipientCount || "?"}{" "}
                        recipients)
                      </span>
                    </div>
                    {smsEstimate.hasEmoji && (
                      <p className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Emoji detected — UCS-2 (shorter segments, higher cost).
                      </p>
                    )}
                    {smsEstimate.softWarn && !smsEstimate.hardConfirm && (
                      <p className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Soft warning: {SMS_SEGMENT_SOFT_WARN}+ segments increases
                        cost.
                      </p>
                    )}
                    {smsEstimate.hardConfirm && (
                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <Checkbox
                          checked={confirmHighSegs}
                          onCheckedChange={(v) =>
                            setConfirmHighSegs(v === true)
                          }
                        />
                        I confirm sending a {SMS_SEGMENT_HARD_CONFIRM}+ segment
                        SMS
                      </label>
                    )}
                  </div>
                </div>
              )}

              {audiencePreview && (
                <div className="rounded-md border bg-muted/20 p-3 text-sm flex flex-wrap gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-primary" />
                    Reachable: <strong>{audiencePreview.count}</strong>
                  </span>
                  {(channel === "email" || channel === "both") && (
                    <span>Email: {audiencePreview.email_count}</span>
                  )}
                  {(channel === "sms" || channel === "both") && (
                    <span>SMS: {audiencePreview.sms_count}</span>
                  )}
                  <span className="text-muted-foreground">
                    Skipped: {audiencePreview.skipped_count}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Delivery</Label>
                <Select
                  value={sendMode}
                  onValueChange={(v) =>
                    setSendMode(v as "now" | "schedule" | "draft")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Send now</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="draft">Save as draft</SelectItem>
                  </SelectContent>
                </Select>
                {sendMode === "schedule" && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === 1 && (
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
            )}
            {step === 0 ? (
              <Button
                className="bg-primary text-primary-foreground"
                disabled={isPreviewing || !title.trim()}
                onClick={runPreview}
              >
                {isPreviewing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Preview audience
              </Button>
            ) : (
              <Button
                className="bg-primary text-primary-foreground"
                disabled={isSending}
                onClick={submitBroadcast}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {sendMode === "draft"
                  ? "Save draft"
                  : sendMode === "schedule"
                    ? "Schedule"
                    : "Send"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {activeBroadcast?.title || "Broadcast history"}
            </DialogTitle>
          </DialogHeader>
          {activeBroadcast ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-3 items-center">
                <StatusBadge status={activeBroadcast.status} />
                <span className="uppercase text-xs text-muted-foreground">
                  {activeBroadcast.channel}
                </span>
                <span>
                  Recipients: <strong>{activeBroadcast.recipient_count}</strong>
                </span>
                <span>
                  Sent: <strong>{activeBroadcast.sent_count}</strong>
                </span>
                {activeBroadcast.failed_count > 0 ? (
                  <span className="text-amber-800">
                    Failed: {activeBroadcast.failed_count}
                  </span>
                ) : null}
              </div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email status</TableHead>
                      <TableHead>SMS status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No recipients logged
                        </TableCell>
                      </TableRow>
                    ) : (
                      recipients.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.recipient_name || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {r.recipient_email || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.recipient_phone || "—"}
                          </TableCell>
                          <TableCell>{r.email_status || "—"}</TableCell>
                          <TableCell>{r.sms_status || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RealtorBroadcasts;
