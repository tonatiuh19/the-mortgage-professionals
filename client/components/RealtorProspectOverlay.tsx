import React, { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  Mail,
  DollarSign,
  Tag,
  User,
  Users,
  Star,
  Trophy,
  Target,
  Handshake,
  TrendingUp,
  CheckCircle2,
  Edit3,
  Trash2,
  Calendar,
  Globe,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Send,
  FileText,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  updateRealtorProspect,
  updateRealtorProspectStage,
  updateProspectStageLocal,
  deleteRealtorProspect,
} from "@/store/slices/realtorProspectingSlice";
import { toast } from "@/hooks/use-toast";
import type { RealtorProspect, RealtorProspectStage } from "@shared/api";

// ─── Stage config (mirrors board) ────────────────────────────────────────────

const STAGES: Array<{
  id: RealtorProspectStage;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  textColor: string;
  badgeBg: string;
}> = [
  {
    id: "contact_attempted",
    label: "Contact Attempted",
    description: "Initial outreach sent",
    icon: <Target className="h-3.5 w-3.5" />,
    color: "bg-slate-500",
    gradient: "from-slate-500 to-slate-600",
    textColor: "text-slate-700",
    badgeBg: "bg-slate-100 text-slate-700",
  },
  {
    id: "contacted",
    label: "Contacted",
    description: "Made initial contact",
    icon: <Phone className="h-3.5 w-3.5" />,
    color: "bg-blue-500",
    gradient: "from-blue-500 to-blue-600",
    textColor: "text-blue-700",
    badgeBg: "bg-blue-100 text-blue-700",
  },
  {
    id: "appt_set",
    label: "Appt Set",
    description: "Meeting scheduled",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-violet-500",
    gradient: "from-violet-500 to-violet-600",
    textColor: "text-violet-700",
    badgeBg: "bg-violet-100 text-violet-700",
  },
  {
    id: "waiting_for_1st_deal",
    label: "Waiting For 1st Deal",
    description: "Relationship established",
    icon: <Handshake className="h-3.5 w-3.5" />,
    color: "bg-amber-500",
    gradient: "from-amber-500 to-amber-600",
    textColor: "text-amber-700",
    badgeBg: "bg-amber-100 text-amber-700",
  },
  {
    id: "first_deal_funded",
    label: "First Deal Funded",
    description: "First referral funded",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-emerald-600",
    textColor: "text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "second_deal_funded",
    label: "2nd Deal Funded",
    description: "Repeat referral partner",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: "bg-teal-500",
    gradient: "from-teal-500 to-teal-600",
    textColor: "text-teal-700",
    badgeBg: "bg-teal-100 text-teal-700",
  },
  {
    id: "top_agent_whale",
    label: "Top Agent (Whale)",
    description: "High-volume referral partner",
    icon: <Trophy className="h-3.5 w-3.5" />,
    color: "bg-yellow-500",
    gradient: "from-yellow-500 to-amber-500",
    textColor: "text-yellow-700",
    badgeBg: "bg-yellow-100 text-yellow-800",
  },
];

const stageIndex = (id: RealtorProspectStage) =>
  STAGES.findIndex((s) => s.id === id);

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Stage progress bar ───────────────────────────────────────────────────────

function StageProgress({ stage }: { stage: RealtorProspectStage }) {
  const idx = stageIndex(stage);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-300",
                active
                  ? "w-5 h-5 bg-primary text-white shadow"
                  : done
                    ? "w-4 h-4 bg-green-100 text-green-600"
                    : "w-4 h-4 bg-gray-100 text-gray-300",
              )}
            >
              {done ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <div
                  className={cn(
                    "rounded-full",
                    active ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-gray-300",
                  )}
                />
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-3 rounded-full",
                  i < idx ? "bg-green-300" : "bg-gray-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Info row ────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={cn("mt-0.5 flex-shrink-0 text-gray-400", accent)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <div className="text-sm text-gray-900 font-medium">{value}</div>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export interface RealtorProspectOverlayProps {
  prospect: RealtorProspect | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prospect: RealtorProspect) => void;
}

export function RealtorProspectOverlay({
  prospect,
  isOpen,
  onClose,
  onEdit,
}: RealtorProspectOverlayProps) {
  const dispatch = useAppDispatch();
  const { isUpdating } = useAppSelector((s) => s.realtorProspecting);

  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [stageChanging, setStageChanging] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progressChanging, setProgressChanging] = useState(false);

  useEffect(() => {
    if (prospect) {
      setNotes(prospect.notes ?? "");
    }
  }, [prospect?.id]);

  if (!prospect) return null;

  const stageConf = STAGES.find((s) => s.id === prospect.stage)!;
  const currentIdx = stageIndex(prospect.stage);
  const nextStage = STAGES[currentIdx + 1] ?? null;

  const handleStageChange = async (newStage: RealtorProspectStage) => {
    if (newStage === prospect.stage || stageChanging) return;
    setStageChanging(true);
    try {
      await dispatch(
        updateRealtorProspectStage({ id: prospect.id, stage: newStage }),
      ).unwrap();
      dispatch(updateProspectStageLocal({ id: prospect.id, stage: newStage }));
      toast({
        title: "Stage updated",
        description: `Moved to ${STAGES.find((s) => s.id === newStage)?.label}`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to update stage",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setStageChanging(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === prospect.status || statusChanging) return;
    setStatusChanging(true);
    try {
      await dispatch(
        updateRealtorProspect({
          id: prospect.id,
          payload: { status: newStatus as any },
        }),
      ).unwrap();
      toast({ title: "Status updated" });
    } catch (e: any) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setStatusChanging(false);
    }
  };

  const handleProgressChange = async (newProgress: string | null) => {
    if (progressChanging) return;
    setProgressChanging(true);
    try {
      await dispatch(
        updateRealtorProspect({
          id: prospect.id,
          payload: { progress_report: newProgress as any },
        }),
      ).unwrap();
      toast({ title: "Progress report updated" });
    } catch (e: any) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setProgressChanging(false);
    }
  };

  const handleSaveNotes = async () => {
    if (isSavingNotes) return;
    setIsSavingNotes(true);
    try {
      await dispatch(
        updateRealtorProspect({ id: prospect.id, payload: { notes } }),
      ).unwrap();
      toast({ title: "Notes saved" });
    } catch (e: any) {
      toast({
        title: "Error saving notes",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteRealtorProspect(prospect.id)).unwrap();
      toast({ title: "Opportunity deleted" });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white max-h-screen">
          {/* ── Header (same structure as LoanOverlay) ──────────────── */}
          <SheetHeader className="border-b border-gray-100 pb-4 mb-6">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                {initials(prospect.contact_name)}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight truncate">
                  {prospect.contact_name || prospect.opportunity_name}
                </SheetTitle>
                {prospect.business_name && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {prospect.business_name}
                  </p>
                )}
              </div>
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge
                className={cn(
                  "text-xs font-medium px-3 py-1",
                  stageConf.badgeBg,
                )}
              >
                {stageConf.label}
              </Badge>
              <Badge
                className={cn(
                  "text-xs px-3 py-1",
                  prospect.status === "won"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : prospect.status === "lost"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-gray-100 text-gray-700 border-gray-200",
                )}
              >
                {prospect.status.charAt(0).toUpperCase() +
                  prospect.status.slice(1)}
              </Badge>
              {prospect.stage === "top_agent_whale" && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs px-3 py-1 gap-1">
                  <Star className="h-3 w-3 fill-yellow-500" />
                  Top Agent
                </Badge>
              )}
            </div>

            {/* Pipeline progress */}
            <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">
                Pipeline Progress — Stage {currentIdx + 1} of {STAGES.length}:{" "}
                <span className="text-gray-700">{stageConf.label}</span>
              </p>
              <StageProgress stage={prospect.stage} />
            </div>
          </SheetHeader>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Quick actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {nextStage && (
                <Button
                  size="sm"
                  disabled={stageChanging}
                  onClick={() => handleStageChange(nextStage.id)}
                  className="gap-2 h-8 text-xs"
                >
                  {stageChanging ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  Move to {nextStage.label}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(prospect)}
                className="gap-2 h-8 text-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="gap-2 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>

            {/* Stage + Status */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <Hash className="h-4 w-4 text-primary" />
                  Stage &amp; Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Stage</p>
                  <Select
                    value={prospect.stage}
                    onValueChange={(v) =>
                      handleStageChange(v as RealtorProspectStage)
                    }
                    disabled={stageChanging}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-sm">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Status</p>
                  <Select
                    value={prospect.status}
                    onValueChange={handleStatusChange}
                    disabled={statusChanging}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open" className="text-sm">
                        Open
                      </SelectItem>
                      <SelectItem value="won" className="text-sm">
                        Won ✓
                      </SelectItem>
                      <SelectItem value="lost" className="text-sm">
                        Lost ✗
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Contact + Opportunity */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <User className="h-4 w-4 text-blue-500" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {prospect.contact_name && (
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="Name"
                    value={prospect.contact_name}
                  />
                )}
                {prospect.contact_email && (
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={
                      <a
                        href={`mailto:${prospect.contact_email}`}
                        className="text-primary hover:underline"
                      >
                        {prospect.contact_email}
                      </a>
                    }
                  />
                )}
                {prospect.contact_phone && (
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={
                      <a
                        href={`tel:${prospect.contact_phone}`}
                        className="text-primary hover:underline"
                      >
                        {prospect.contact_phone}
                      </a>
                    }
                  />
                )}
                {prospect.business_name && (
                  <InfoRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Brokerage / Business"
                    value={prospect.business_name}
                  />
                )}
              </CardContent>
            </Card>

            {/* Opportunity */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Opportunity Name"
                  value={prospect.opportunity_name}
                />
                {prospect.opportunity_source && (
                  <InfoRow
                    icon={<Globe className="h-4 w-4" />}
                    label="Source"
                    value={prospect.opportunity_source}
                  />
                )}
                {prospect.opportunity_value > 0 && (
                  <InfoRow
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Value"
                    value={
                      <span className="text-green-600 font-semibold text-base">
                        {formatCurrency(prospect.opportunity_value)}
                      </span>
                    }
                    accent="text-green-500"
                  />
                )}
                {prospect.tags && prospect.tags.length > 0 && (
                  <InfoRow
                    icon={<Tag className="h-4 w-4" />}
                    label="Tags"
                    value={
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {prospect.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 font-medium"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}
              </CardContent>
            </Card>

            {/* Ownership */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Ownership
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Owner"
                  value={
                    prospect.owner_first_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                          {prospect.owner_first_name[0]}
                        </div>
                        {prospect.owner_first_name} {prospect.owner_last_name}
                      </div>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium">
                        Unassigned
                      </span>
                    )
                  }
                />
                {prospect.creator_first_name && (
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="Created By"
                    value={`${prospect.creator_first_name} ${prospect.creator_last_name}`}
                  />
                )}
                {prospect.created_at && (
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Created"
                    value={formatDate(prospect.created_at) ?? "—"}
                  />
                )}
                {prospect.updated_at && (
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Last Updated"
                    value={formatDate(prospect.updated_at) ?? "—"}
                  />
                )}
              </CardContent>
            </Card>

            {/* Progress Report */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <Send className="h-4 w-4 text-violet-500" />
                  Progress Report
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {(["ready_to_send", "sent", null] as const).map((val) => {
                    const label =
                      val === "ready_to_send"
                        ? "Ready to Send"
                        : val === "sent"
                          ? "Sent"
                          : "None";
                    const active = prospect.progress_report === val;
                    return (
                      <button
                        key={String(val)}
                        disabled={progressChanging}
                        onClick={() => handleProgressChange(val)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                        )}
                      >
                        {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Refi rates dropped */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700 font-medium">
                      Add to Refi Rates Dropped
                    </span>
                  </div>
                  <button
                    disabled={isUpdating}
                    onClick={() =>
                      dispatch(
                        updateRealtorProspect({
                          id: prospect.id,
                          payload: {
                            add_to_refi_rates_dropped:
                              !prospect.add_to_refi_rates_dropped,
                          },
                        }),
                      )
                    }
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      prospect.add_to_refi_rates_dropped
                        ? "bg-primary"
                        : "bg-gray-200",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                        prospect.add_to_refi_rates_dropped
                          ? "translate-x-4"
                          : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this realtor..."
                  rows={4}
                  className="resize-none text-sm"
                />
                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    disabled={isSavingNotes || notes === (prospect.notes ?? "")}
                    onClick={handleSaveNotes}
                    className="gap-2 h-8 text-xs"
                  >
                    {isSavingNotes ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {prospect.contact_name || prospect.opportunity_name}
              </span>
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default RealtorProspectOverlay;
