import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Users,
  DollarSign,
  Building2,
  Phone,
  Mail,
  Star,
  Trophy,
  Handshake,
  Target,
  TrendingUp,
  ChevronDown,
  X,
  MoreHorizontal,
  Trash2,
  Edit3,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchRealtorProspects,
  createRealtorProspect,
  updateRealtorProspectStage,
  updateRealtorProspect,
  deleteRealtorProspect,
  updateProspectStageLocal,
} from "@/store/slices/realtorProspectingSlice";
import { fetchMortgageBankers } from "@/store/slices/brokersSlice";
import { toast } from "@/hooks/use-toast";
import { RealtorProspectOverlay } from "@/components/RealtorProspectOverlay";
import type {
  RealtorProspect,
  RealtorProspectStage,
  CreateRealtorProspectRequest,
} from "@shared/api";

// ─── Stage Configuration ─────────────────────────────────────────────────────

const STAGES: Array<{
  id: RealtorProspectStage;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  headerGradient: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}> = [
  {
    id: "contact_attempted",
    label: "Contact Attempted",
    description: "Initial outreach sent",
    icon: <Target className="h-3.5 w-3.5" />,
    color: "bg-slate-50 border-slate-200",
    headerGradient: "from-slate-500 to-slate-600",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
  },
  {
    id: "contacted",
    label: "Contacted",
    description: "Made initial contact",
    icon: <Phone className="h-3.5 w-3.5" />,
    color: "bg-blue-50 border-blue-200",
    headerGradient: "from-blue-500 to-blue-600",
    dotColor: "bg-blue-400",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  {
    id: "appt_set",
    label: "Appt Set",
    description: "Meeting scheduled",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-violet-50 border-violet-200",
    headerGradient: "from-violet-500 to-violet-600",
    dotColor: "bg-violet-400",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
  },
  {
    id: "waiting_for_1st_deal",
    label: "Waiting For 1st Deal",
    description: "Relationship established",
    icon: <Handshake className="h-3.5 w-3.5" />,
    color: "bg-amber-50 border-amber-200",
    headerGradient: "from-amber-500 to-amber-600",
    dotColor: "bg-amber-400",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  {
    id: "first_deal_funded",
    label: "First Deal Funded",
    description: "First referral funded",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    color: "bg-emerald-50 border-emerald-200",
    headerGradient: "from-emerald-500 to-emerald-600",
    dotColor: "bg-emerald-400",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
  {
    id: "second_deal_funded",
    label: "2nd Deal Funded",
    description: "Repeat referral partner",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: "bg-teal-50 border-teal-200",
    headerGradient: "from-teal-500 to-teal-600",
    dotColor: "bg-teal-400",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700",
  },
  {
    id: "top_agent_whale",
    label: "Top Agent (Whale)",
    description: "High-volume referral partner",
    icon: <Trophy className="h-3.5 w-3.5" />,
    color: "bg-gradient-to-b from-amber-50 to-yellow-50 border-yellow-300",
    headerGradient: "from-yellow-500 to-amber-500",
    dotColor: "bg-yellow-400",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
  },
];

// ─── Opportunity Form Modal ───────────────────────────────────────────────────

interface OpportunityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStage?: RealtorProspectStage;
  editingProspect?: RealtorProspect | null;
  onSuccess?: () => void;
}

function OpportunityForm({
  open,
  onOpenChange,
  initialStage = "contact_attempted",
  editingProspect,
  onSuccess,
}: OpportunityFormProps) {
  const dispatch = useAppDispatch();
  const { isCreating, isUpdating } = useAppSelector(
    (s) => s.realtorProspecting,
  );
  const mortgageBankers = useAppSelector((s) => s.brokers.mortgageBankers);
  const { user } = useAppSelector((s) => s.brokerAuth);

  const isEditing = !!editingProspect;
  const isBusy = isCreating || isUpdating;

  const [form, setForm] = useState<CreateRealtorProspectRequest>({
    opportunity_name: "",
    stage: initialStage,
    status: "open",
    opportunity_value: 0,
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    business_name: "",
    opportunity_source: "",
    tags: [],
    notes: "",
    owner_broker_id: null,
    followers: [],
    progress_report: null,
    add_to_refi_rates_dropped: false,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      if (editingProspect) {
        setForm({
          opportunity_name: editingProspect.opportunity_name,
          stage: editingProspect.stage,
          status: editingProspect.status,
          opportunity_value: editingProspect.opportunity_value,
          contact_name: editingProspect.contact_name ?? "",
          contact_email: editingProspect.contact_email ?? "",
          contact_phone: editingProspect.contact_phone ?? "",
          business_name: editingProspect.business_name ?? "",
          opportunity_source: editingProspect.opportunity_source ?? "",
          tags: editingProspect.tags ?? [],
          notes: editingProspect.notes ?? "",
          owner_broker_id: editingProspect.owner_broker_id ?? null,
          followers: editingProspect.followers ?? [],
          progress_report: editingProspect.progress_report ?? null,
          add_to_refi_rates_dropped:
            editingProspect.add_to_refi_rates_dropped ?? false,
        });
      } else {
        setForm({
          opportunity_name: "",
          stage: initialStage,
          status: "open",
          opportunity_value: 0,
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          business_name: "",
          opportunity_source: "",
          tags: [],
          notes: "",
          owner_broker_id:
            user?.role === "admin" || user?.role === "superadmin"
              ? user.id
              : null,
          followers: [],
          progress_report: null,
          add_to_refi_rates_dropped: false,
        });
      }
      setTagInput("");
    }
  }, [open, editingProspect, initialStage, user]);

  const set = (field: keyof CreateRealtorProspectRequest, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) {
      set("tags", [...(form.tags ?? []), t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    set(
      "tags",
      (form.tags ?? []).filter((t) => t !== tag),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.opportunity_name?.trim()) {
      toast({
        title: "Opportunity Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && editingProspect) {
        await dispatch(
          updateRealtorProspect({ id: editingProspect.id, payload: form }),
        ).unwrap();
        toast({ title: "Opportunity updated" });
      } else {
        await dispatch(createRealtorProspect(form)).unwrap();
        toast({
          title: "Opportunity created",
          description: form.opportunity_name,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Edit Opportunity" : "Add new opportunity"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the opportunity details"
              : "Create new opportunity by filling in details and selecting a contact"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-1.5">
              Contact details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Primary Contact Name
                </Label>
                <Input
                  placeholder="Enter contact name"
                  value={form.contact_name ?? ""}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Primary Email</Label>
                <Input
                  type="email"
                  placeholder="Enter Email"
                  value={form.contact_email ?? ""}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </div>
            </div>
            <div className="max-w-xs">
              <Label className="text-sm font-medium">Primary Phone</Label>
              <Input
                type="tel"
                placeholder="Phone"
                value={form.contact_phone ?? ""}
                onChange={(e) => set("contact_phone", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Opportunity Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-1.5">
              Opportunity Details
            </h3>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Opportunity Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter opportunity name"
                value={form.opportunity_name}
                onChange={(e) => set("opportunity_name", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pipeline</Label>
                <div className="h-9 flex items-center px-3 bg-gray-50 border rounded-md text-sm text-gray-700 font-medium">
                  Realtor Prospecting
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => set("stage", v as RealtorProspectStage)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opportunity Value</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.opportunity_value ?? 0}
                    onChange={(e) =>
                      set("opportunity_value", parseFloat(e.target.value) || 0)
                    }
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Owner</Label>
                <Select
                  value={form.owner_broker_id?.toString() ?? "unassigned"}
                  onValueChange={(v) =>
                    set(
                      "owner_broker_id",
                      v === "unassigned" ? null : parseInt(v),
                    )
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {mortgageBankers.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.first_name} {b.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Opportunity Source
                </Label>
                <Input
                  placeholder="Enter Source"
                  value={form.opportunity_source ?? ""}
                  onChange={(e) => set("opportunity_source", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Business Name</Label>
                <Input
                  placeholder="Enter Business Name"
                  value={form.business_name ?? ""}
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    className="px-3"
                  >
                    Add
                  </Button>
                </div>
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(form.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2.5 py-1 font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                placeholder="Add notes about this realtor..."
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Progress Report */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Progress Report</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="progress_report"
                    value="ready_to_send"
                    checked={form.progress_report === "ready_to_send"}
                    onChange={() => set("progress_report", "ready_to_send")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Ready To Send</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="progress_report"
                    value="sent"
                    checked={form.progress_report === "sent"}
                    onChange={() => set("progress_report", "sent")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Send</span>
                </label>
                {form.progress_report && (
                  <button
                    type="button"
                    onClick={() => set("progress_report", null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Add to Refi Rates Dropped */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.add_to_refi_rates_dropped ?? false}
                  onChange={(e) =>
                    set("add_to_refi_rates_dropped", e.target.checked)
                  }
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-sm font-medium">
                  Add to Refi Rates Dropped
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy} className="min-w-[80px]">
              {isBusy ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Prospect Card ────────────────────────────────────────────────────────────

interface ProspectCardProps {
  prospect: RealtorProspect;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

function ProspectCard({
  prospect,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onView,
}: ProspectCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const initials =
    prospect.contact_name
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const stageConf = STAGES.find((s) => s.id === prospect.stage);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // Only open detail view if not dragging and not clicking the menu
        if (
          !isDragging &&
          !(e.target as HTMLElement).closest(
            "[data-radix-popper-content-wrapper],[data-radix-dropdown-menu-content]",
          )
        ) {
          onView();
        }
      }}
      className={cn(
        "group bg-white rounded-lg border transition-all duration-150 select-none",
        isDragging
          ? "opacity-40 scale-95 border-blue-400 shadow-inner cursor-grabbing"
          : "border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 active:cursor-grabbing",
      )}
    >
      {/* Thin top accent */}
      <div
        className={cn(
          "w-full h-0.5 rounded-t-lg",
          stageConf?.dotColor ?? "bg-gray-400",
        )}
      />

      <div className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
                {prospect.contact_name || prospect.opportunity_name}
              </p>
              {prospect.contact_name && (
                <p className="text-[11px] text-gray-500 truncate">
                  {prospect.opportunity_name}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-xs text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Business / Brokerage */}
        {prospect.business_name && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">
              {prospect.business_name}
            </span>
          </div>
        )}

        {/* Contact info row */}
        <div className="flex items-center gap-3">
          {prospect.contact_phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-[11px] text-gray-500">
                {prospect.contact_phone}
              </span>
            </div>
          )}
          {prospect.contact_email && (
            <div className="flex items-center gap-1 min-w-0">
              <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="text-[11px] text-gray-500 truncate">
                {prospect.contact_email}
              </span>
            </div>
          )}
        </div>

        {/* Value */}
        {prospect.opportunity_value > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              {formatCurrency(prospect.opportunity_value)}
            </span>
            <span className="text-[10px] text-gray-400 ml-0.5">Opp. Val.</span>
          </div>
        )}

        {/* Tags */}
        {prospect.tags && prospect.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prospect.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium"
              >
                {tag}
              </span>
            ))}
            {prospect.tags.length > 3 && (
              <span className="inline-block text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                +{prospect.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: owner + status badges */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {prospect.owner_first_name ? (
              <>
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {prospect.owner_first_name[0]}
                </div>
                <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
                  {prospect.owner_first_name} {prospect.owner_last_name}
                </span>
              </>
            ) : (
              <span className="text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 font-medium">
                Unassigned
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {prospect.status !== "open" && (
              <Badge
                className={cn(
                  "text-[9px] h-4 px-1.5 font-semibold",
                  prospect.status === "won"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700",
                )}
              >
                {prospect.status.toUpperCase()}
              </Badge>
            )}
            {prospect.stage === "top_agent_whale" && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Realtor Prospecting Board ──────────────────────────────────────────

interface RealtorProspectingBoardProps {
  searchQuery: string;
}

export function RealtorProspectingBoard({
  searchQuery,
}: RealtorProspectingBoardProps) {
  const dispatch = useAppDispatch();
  const { prospects, isLoading } = useAppSelector((s) => s.realtorProspecting);

  // Drag and drop state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingFromStage, setDraggingFromStage] = useState<string | null>(
    null,
  );

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [addStage, setAddStage] =
    useState<RealtorProspectStage>("contact_attempted");
  const [editingProspect, setEditingProspect] =
    useState<RealtorProspect | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RealtorProspect | null>(
    null,
  );
  const [pendingMove, setPendingMove] = useState<{
    id: number;
    fromStage: RealtorProspectStage;
    toStage: RealtorProspectStage;
    prospectLabel: string;
  } | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingProspect, setViewingProspect] =
    useState<RealtorProspect | null>(null);

  // Keep the overlay in sync when the store updates (after stage/status/notes changes)
  useEffect(() => {
    if (viewingProspect) {
      const updated = prospects.find((p) => p.id === viewingProspect.id);
      if (updated) setViewingProspect(updated);
    }
  }, [prospects]);

  useEffect(() => {
    dispatch(fetchRealtorProspects({}));
    dispatch(fetchMortgageBankers() as any);
  }, [dispatch]);

  // Listen for the "add opportunity" event fired by the parent pipeline header button
  useEffect(() => {
    const handleAddOpportunity = () => {
      setAddStage("contact_attempted");
      setAddOpen(true);
    };
    window.addEventListener("realtor-add-opportunity", handleAddOpportunity);
    return () => {
      window.removeEventListener(
        "realtor-add-opportunity",
        handleAddOpportunity,
      );
    };
  }, []);

  // Filter prospects by search query
  const filteredProspects = prospects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.opportunity_name.toLowerCase().includes(q) ||
      p.contact_name?.toLowerCase().includes(q) ||
      p.contact_email?.toLowerCase().includes(q) ||
      p.business_name?.toLowerCase().includes(q)
    );
  });

  const prospectsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.id] = filteredProspects.filter((p) => p.stage === stage.id);
      return acc;
    },
    {} as Record<string, RealtorProspect[]>,
  );

  const totalValue = prospects.reduce(
    (sum, p) => sum + (p.opportunity_value || 0),
    0,
  );

  // Drag handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    id: number,
    fromStage: string,
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("prospectId", String(id));
    setDraggingId(id);
    setDraggingFromStage(fromStage);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
    setDraggingFromStage(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (stageId: string) => {
    setDragOverStage(stageId);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    toStageId: string,
  ) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("prospectId"), 10);
    const fromStage = draggingFromStage;
    setDragOverStage(null);
    setDraggingId(null);
    setDraggingFromStage(null);

    if (!id || fromStage === toStageId || !fromStage) return;

    const prospect = prospects.find((p) => p.id === id);
    const prospectLabel =
      prospect?.contact_name || prospect?.opportunity_name || `#${id}`;

    setPendingMove({
      id,
      fromStage: fromStage as RealtorProspectStage,
      toStage: toStageId as RealtorProspectStage,
      prospectLabel,
    });
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    setIsMoving(true);
    try {
      await dispatch(
        updateRealtorProspectStage({
          id: pendingMove.id,
          stage: pendingMove.toStage,
        }),
      ).unwrap();
      dispatch(
        updateProspectStageLocal({
          id: pendingMove.id,
          stage: pendingMove.toStage,
        }),
      );
      const toLabel =
        STAGES.find((s) => s.id === pendingMove.toStage)?.label ??
        pendingMove.toStage;
      toast({
        title: "Stage updated",
        description: `${pendingMove.prospectLabel} moved to ${toLabel}`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to update stage",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
      setPendingMove(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteRealtorProspect(deleteTarget.id)).unwrap();
      toast({ title: "Opportunity deleted" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openAddForStage = (stageId: RealtorProspectStage) => {
    setAddStage(stageId);
    setAddOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {prospects.length}{" "}
            <span className="text-gray-400 font-normal">prospects</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-gray-700">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }).format(totalValue)}{" "}
            <span className="text-gray-400 font-normal">total value</span>
          </span>
        </div>
        {isLoading && (
          <RefreshCw className="h-3.5 w-3.5 text-gray-400 animate-spin ml-auto" />
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 min-w-max h-full">
          {STAGES.map((stage) => {
            const stageProspects = prospectsByStage[stage.id] ?? [];
            const stageValue = stageProspects.reduce(
              (sum, p) => sum + (p.opportunity_value || 0),
              0,
            );
            const isDragOver =
              dragOverStage === stage.id && draggingFromStage !== stage.id;

            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <div className="flex flex-col h-full">
                  {/* Column Header — same style as Loan Pipeline */}
                  <div className="rounded-lg border border-gray-200 p-3 mb-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm text-gray-900">
                        {stage.label}
                      </h3>
                      <Badge className="bg-gray-100 text-gray-700 text-xs px-2 py-1">
                        {stageProspects.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{stage.description}</p>
                  </div>

                  {/* Drop Zone */}
                  <div
                    className={cn(
                      "flex-1 space-y-3 p-3 rounded-lg border-2 min-h-[400px] transition-all duration-150",
                      isDragOver
                        ? "border-blue-400 bg-blue-50 scale-[1.01]"
                        : cn("border-gray-200", stage.color),
                    )}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(stage.id)}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverStage(null);
                      }
                    }}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {stageProspects.map((prospect) => (
                      <ProspectCard
                        key={prospect.id}
                        prospect={prospect}
                        isDragging={draggingId === prospect.id}
                        onDragStart={(e) =>
                          handleDragStart(e, prospect.id, stage.id)
                        }
                        onDragEnd={handleDragEnd}
                        onEdit={() => setEditingProspect(prospect)}
                        onDelete={() => setDeleteTarget(prospect)}
                        onView={() => setViewingProspect(prospect)}
                      />
                    ))}

                    {/* Empty state — same style as Loan Pipeline */}
                    {stageProspects.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">
                          No opportunities
                        </p>
                      </div>
                    )}

                    {/* Add button at bottom of column */}
                    <button
                      onClick={() =>
                        openAddForStage(stage.id as RealtorProspectStage)
                      }
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border border-dashed",
                        isDragOver
                          ? "opacity-0"
                          : "text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300 hover:bg-white/60",
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add opportunity
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <OpportunityForm
        open={addOpen || !!editingProspect}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false);
            setEditingProspect(null);
          }
        }}
        initialStage={addStage}
        editingProspect={editingProspect}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteTarget?.contact_name || deleteTarget?.opportunity_name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stage change confirmation */}
      <AlertDialog
        open={!!pendingMove}
        onOpenChange={(o) => {
          if (!o && !isMoving) setPendingMove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to a new stage?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Moving{" "}
                  <span className="font-semibold text-foreground">
                    {pendingMove?.prospectLabel}
                  </span>{" "}
                  from{" "}
                  <span className="font-semibold text-foreground">
                    {STAGES.find((s) => s.id === pendingMove?.fromStage)?.label}
                  </span>{" "}
                  →{" "}
                  <span className="font-semibold text-foreground">
                    {STAGES.find((s) => s.id === pendingMove?.toStage)?.label}
                  </span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isMoving} onClick={handleConfirmMove}>
              {isMoving ? "Moving..." : "Yes, move it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prospect detail overlay */}
      <RealtorProspectOverlay
        prospect={viewingProspect}
        isOpen={!!viewingProspect}
        onClose={() => setViewingProspect(null)}
        onEdit={(p) => {
          setViewingProspect(null);
          setEditingProspect(p);
        }}
      />
    </div>
  );
}

export default RealtorProspectingBoard;
