import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Globe,
  TrendingUp,
  MessageSquare,
  Activity,
  Edit3,
  Save,
  XCircle,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Star,
  ArrowUpRight,
  Loader2,
  Hash,
  Users,
  Tag,
  Send,
  PhoneCall,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Smartphone,
  AtSign,
  MessageCircle,
  CheckCheck,
  Clock3,
  Lock,
  FileText,
  CalendarPlus,
  Copy,
  BookmarkPlus,
  Info,
} from "lucide-react";
import SaveAsTemplateDialog from "@/components/SaveAsTemplateDialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import PhoneLink from "@/components/PhoneLink";
import EmailLink from "@/components/EmailLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientProfile,
  updateClientProfile,
  clearClientDetail,
} from "@/store/slices/clientDetailSlice";
import { fetchAnnualMetrics } from "@/store/slices/dashboardSlice";
import {
  fetchConversationMessages,
  fetchConversationTemplates,
  sendMessage,
} from "@/store/slices/conversationsSlice";
import { convertClientToBroker } from "@/store/slices/clientsSlice";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createScheduledMeeting,
  fetchSchedulerSettingsForBroker,
} from "@/store/slices/schedulerSlice";
import { BrokerDatePicker } from "@/components/BrokerDatePicker";
import { BrokerTimePicker } from "@/components/BrokerTimePicker";

interface ClientDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number | null;
  onOpenConversation?: (conversationId: string) => void;
  onOpenLoan?: (loanId: number) => void;
  onClientUpdated?: () => void;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const LEAD_SOURCES: { value: string; label: string; code: string }[] = [
  {
    value: "current_client_referral",
    label: "Current Client Referral",
    code: "CCR",
  },
  { value: "past_client", label: "Past Client", code: "PC" },
  { value: "past_client_referral", label: "Past Client Referral", code: "PR" },
  { value: "personal_friend", label: "Personal Friend", code: "PF" },
  { value: "realtor", label: "Realtor", code: "RLTR" },
  { value: "advertisement", label: "Advertisement", code: "AD" },
  { value: "business_partner", label: "Business Partner", code: "BUS" },
  { value: "builder", label: "Builder", code: "BLDR" },
  { value: "public_wizard", label: "Public Wizard", code: "PW" },
  { value: "other", label: "Other", code: "—" },
];
const LEAD_SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  LEAD_SOURCES.map((s) => [s.value, s.label]),
);

const LOAN_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100" },
  app_sent: {
    label: "App Sent",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
  application_received: {
    label: "App Received",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  prequalified: {
    label: "Prequalified",
    color: "text-cyan-700",
    bg: "bg-cyan-100",
  },
  preapproved: {
    label: "Pre-Approved",
    color: "text-violet-700",
    bg: "bg-violet-100",
  },
  under_contract_loan_setup: {
    label: "Under Contract",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  submitted_to_underwriting: {
    label: "Underwriting",
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  approved_with_conditions: {
    label: "Approved",
    color: "text-lime-700",
    bg: "bg-lime-100",
  },
  clear_to_close: {
    label: "Clear to Close",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  docs_out: {
    label: "Docs Out",
    color: "text-teal-700",
    bg: "bg-teal-100",
  },
  loan_funded: {
    label: "Funded",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
};

const CLIENT_STATUS_META: Record<string, { label: string; variant: string }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  suspended: { label: "Suspended", variant: "destructive" },
};

const INCOME_TYPE_LABELS: Record<string, string> = {
  "W-2": "W-2 Employee",
  "1099": "1099 Contractor",
  "Self-Employed": "Self-Employed",
  Investor: "Investor",
  Mixed: "Mixed Income",
};

const CITIZENSHIP_LABELS: Record<string, string> = {
  us_citizen: "US Citizen",
  permanent_resident: "Permanent Resident",
  non_resident: "Non-Resident",
  other: "Other",
};

const COMM_ICONS: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
  call: <PhoneCall className="w-3.5 h-3.5" />,
  internal_note: <Edit3 className="w-3.5 h-3.5" />,
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(date);
}

/* ─── inline-edit field ───────────────────────────────────────────────────── */

interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  editValue: string;
  onEditChange: (v: string) => void;
  editing: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: string;
  /** Optional override for the read-only display node */
  renderValue?: (value: string) => React.ReactNode;
}

function EditableField({
  label,
  value,
  editValue,
  onEditChange,
  editing,
  icon,
  placeholder = "—",
  type = "text",
  renderValue,
}: EditableFieldProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </p>
      {editing ? (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="h-8 text-sm"
          placeholder={placeholder}
        />
      ) : (
        <div className="text-sm font-medium flex items-center gap-1.5 text-foreground">
          {!renderValue && icon && (
            <span className="text-muted-foreground opacity-60">{icon}</span>
          )}
          {value ? (
            renderValue ? (
              renderValue(value)
            ) : (
              value
            )
          ) : (
            <span className="text-muted-foreground italic">{placeholder}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── stat chip ───────────────────────────────────────────────────────────── */

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-xl p-3 flex-1 min-w-0">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-center leading-tight">
        {label}
      </p>
    </div>
  );
}

/* ─── compose box sub-component ──────────────────────────────────────────── */

interface ComposeBoxProps {
  composeType: "sms" | "email" | "whatsapp";
  composeSubject: string;
  composeBody: string;
  sendingMsg: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  onTypeChange: (t: "sms" | "email" | "whatsapp") => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  compact?: boolean;
  onSaveAsTemplate?: () => void;
  templates?: {
    id: number;
    name: string;
    template_type: string;
    subject?: string | null;
    body: string;
  }[];
}

function ComposeBox({
  composeType,
  composeSubject,
  composeBody,
  sendingMsg,
  hasPhone,
  hasEmail,
  onTypeChange,
  onSubjectChange,
  onBodyChange,
  onSend,
  onCancel,
  compact,
  onSaveAsTemplate,
  templates = [],
}: ComposeBoxProps) {
  const [templateOpen, setTemplateOpen] = React.useState(false);

  const relevantTemplates = templates.filter(
    (t) => t.template_type === composeType,
  );

  return (
    <div
      className={`border-t bg-card ${compact ? "px-4 pt-3 pb-3" : "mx-6 mb-4 rounded-xl border p-4"} space-y-3`}
    >
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">New Message</p>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* type selector + templates */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["sms", "email", "whatsapp"] as const).map((t) => {
          const unavailable =
            (t !== "email" && !hasPhone) || (t === "email" && !hasEmail);
          const locked = t === "whatsapp";
          const disabled = unavailable || locked;
          return (
            <button
              key={t}
              disabled={disabled}
              onClick={() => !disabled && onTypeChange(t)}
              title={locked ? "WhatsApp coming soon" : undefined}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                composeType === t && !locked
                  ? "bg-primary text-primary-foreground border-primary"
                  : disabled
                    ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {t === "sms" && <Smartphone className="w-3 h-3" />}
              {t === "email" && <Mail className="w-3 h-3" />}
              {t === "whatsapp" && <MessageCircle className="w-3 h-3" />}
              {t === "sms" ? "SMS" : t === "email" ? "Email" : "WhatsApp"}
              {locked && <Lock className="w-2.5 h-2.5 ml-0.5" />}
            </button>
          );
        })}

        {/* Templates picker — always visible; includes "Save as template" at bottom */}
        {(templates.length > 0 || onSaveAsTemplate) && (
          <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
            <PopoverTrigger asChild>
              <button className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors font-medium">
                <FileText className="w-3 h-3" />
                Templates
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0" sideOffset={6}>
              <Command>
                <CommandInput placeholder="Search templates…" />
                <CommandList className="max-h-56">
                  {templates.length > 0 ? (
                    <>
                      <CommandEmpty>No templates found.</CommandEmpty>
                      <CommandGroup>
                        {(relevantTemplates.length > 0
                          ? relevantTemplates
                          : templates
                        ).map((tmpl) => (
                          <CommandItem
                            key={tmpl.id}
                            value={tmpl.name}
                            onSelect={() => {
                              onBodyChange(tmpl.body);
                              if (tmpl.subject) onSubjectChange(tmpl.subject);
                              setTemplateOpen(false);
                            }}
                            className="flex flex-col items-start gap-0.5 cursor-pointer"
                          >
                            <span className="text-[13px] font-medium">
                              {tmpl.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate w-full">
                              {tmpl.body.substring(0, 60)}…
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  ) : (
                    <CommandEmpty>No templates yet.</CommandEmpty>
                  )}
                  {onSaveAsTemplate && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          value="__save_as_template__"
                          disabled={!composeBody.trim()}
                          onSelect={() => {
                            if (!composeBody.trim()) return;
                            setTemplateOpen(false);
                            onSaveAsTemplate();
                          }}
                          className="gap-2 text-primary data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                          Save current message as template
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {compact && (
          <button
            onClick={onCancel}
            className="ml-auto text-muted-foreground hover:text-foreground p-1"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* subject for email */}
      {composeType === "email" && (
        <Input
          placeholder="Subject"
          value={composeSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="h-8 text-sm"
        />
      )}

      {/* Template variable hint */}
      {(() => {
        const vars = Array.from(
          new Set(
            [...(composeBody.matchAll(/\{\{([^}]+)\}\}/g) || [])].map(
              (m) => m[1],
            ),
          ),
        );
        if (vars.length === 0) return null;
        return (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-300">
              Variables{" "}
              {vars.map((v, i) => (
                <span key={v}>
                  <code className="font-mono bg-amber-100 dark:bg-amber-900 px-0.5 rounded">{`{{${v}}}`}</code>
                  {i < vars.length - 1 ? ", " : ""}
                </span>
              ))}{" "}
              will be auto-filled from this client's profile when sent.
            </p>
          </div>
        );
      })()}

      {/* body */}
      <div className="relative">
        <Textarea
          placeholder={`Write a ${composeType} message…`}
          value={composeBody}
          onChange={(e) => onBodyChange(e.target.value)}
          className="min-h-[80px] text-sm resize-none pr-10"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !sendingMsg) {
              onSend();
            }
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">⌘+Enter to send</p>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={onSend}
          disabled={sendingMsg || !composeBody.trim()}
        >
          {sendingMsg ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Send
        </Button>
      </div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────────────────── */

export default function ClientDetailPanel({
  isOpen,
  onClose,
  clientId,
  onOpenConversation,
  onOpenLoan,
  onClientUpdated,
}: ClientDetailPanelProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { profile, isLoading, isSaving, error } = useAppSelector(
    (s) => s.clientDetail,
  );
  const { templates: convTemplates } = useAppSelector((s) => s.conversations);
  const { user: currentBroker } = useAppSelector((s) => s.brokerAuth);
  const {
    settings: schedulerSettings,
    availability: schedulerAvailability,
    availableSlots,
  } = useAppSelector((s) => s.scheduler);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    meeting_date: "",
    meeting_time: "",
    meeting_type: "phone" as "phone" | "video",
    notes: "",
  });
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  /* ── convert to broker ── */
  const [convertToRealtorOpen, setConvertToRealtorOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvertToRealtor = async () => {
    if (!clientId) return;
    setIsConverting(true);
    try {
      await dispatch(convertClientToBroker({ clientId, payload: {} })).unwrap();
      toast({
        title: "Converted",
        description: `${client?.first_name} ${client?.last_name} is now a partner realtor`,
      });
      setConvertToRealtorOpen(false);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: String(err) || "Conversion failed",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  /* ── conversations inner state ── */
  type ConvView = "list" | "thread";
  const [convView, setConvView] = useState<ConvView>("list");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"sms" | "email" | "whatsapp">(
    "sms",
  );
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const openThread = async (conversationId: string) => {
    setActiveConvId(conversationId);
    setConvView("thread");
    setLoadingThread(true);
    try {
      const result = await dispatch(
        fetchConversationMessages({ conversationId, limit: 100 }),
      ).unwrap();
      setThreadMessages(result.messages ?? []);
    } catch {
      setThreadMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendMessage = async () => {
    if (!composeBody.trim() || !client) return;
    const recipientPhone = client.phone ?? undefined;
    const recipientEmail = client.email ?? undefined;
    setSendingMsg(true);
    try {
      const result = await dispatch(
        sendMessage({
          client_id: clientId!,
          conversation_id: activeConvId ?? undefined,
          communication_type: composeType,
          recipient_phone: composeType !== "email" ? recipientPhone : undefined,
          recipient_email: composeType === "email" ? recipientEmail : undefined,
          subject:
            composeType === "email" ? composeSubject || undefined : undefined,
          body: composeBody.trim(),
          message_type: "text",
        }),
      ).unwrap();
      toast({ title: "Message sent" });
      setComposeBody("");
      setComposeSubject("");
      setComposeOpen(false);
      // If we're in thread view, reload messages; otherwise reload profile
      if (convView === "thread" && result.conversation_id) {
        const updated = await dispatch(
          fetchConversationMessages({
            conversationId: result.conversation_id,
            limit: 100,
          }),
        ).unwrap();
        setThreadMessages(updated.messages ?? []);
        setActiveConvId(result.conversation_id);
      } else {
        dispatch(fetchClientProfile(clientId!));
      }
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setSendingMsg(false);
    }
  };

  /* fetch on open */
  useEffect(() => {
    if (isOpen && clientId) {
      dispatch(fetchClientProfile(clientId));
      if (convTemplates.length === 0) {
        dispatch(fetchConversationTemplates(undefined));
      }
    }
    if (!isOpen) {
      setEditing(false);
      dispatch(clearClientDetail());
    }
  }, [isOpen, clientId, dispatch]);

  /* populate edit form when profile loads */
  useEffect(() => {
    if (profile?.client) {
      const c = profile.client;
      setForm({
        first_name: c.first_name ?? "",
        last_name: c.last_name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        alternate_phone: c.alternate_phone ?? "",
        date_of_birth: c.date_of_birth ? c.date_of_birth.split("T")[0] : "",
        address_street: c.address_street ?? "",
        address_city: c.address_city ?? "",
        address_state: c.address_state ?? "",
        address_zip: c.address_zip ?? "",
        employment_status: c.employment_status ?? "",
        income_type: c.income_type ?? "",
        annual_income: c.annual_income != null ? String(c.annual_income) : "",
        credit_score: c.credit_score != null ? String(c.credit_score) : "",
        citizenship_status: c.citizenship_status ?? "",
        source: c.source ?? "",
      });
    }
  }, [profile]);

  const field = useCallback((key: string) => form[key] ?? "", [form]);

  const setField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!clientId || !profile) return;
    try {
      await dispatch(
        updateClientProfile({
          clientId,
          payload: {
            first_name: form.first_name || undefined,
            last_name: form.last_name || undefined,
            phone: form.phone || undefined,
            alternate_phone: form.alternate_phone || undefined,
            date_of_birth:
              form.date_of_birth &&
              /^\d{4}-\d{2}-\d{2}$/.test(form.date_of_birth)
                ? form.date_of_birth
                : undefined,
            address_street: form.address_street || undefined,
            address_city: form.address_city || undefined,
            address_state: form.address_state || undefined,
            address_zip: form.address_zip || undefined,
            employment_status: form.employment_status || undefined,
            income_type: form.income_type || undefined,
            annual_income: form.annual_income
              ? Number(form.annual_income)
              : null,
            credit_score: form.credit_score ? Number(form.credit_score) : null,
            citizenship_status: form.citizenship_status || undefined,
            source: form.source !== undefined ? form.source || null : undefined,
          },
        }),
      ).unwrap();
      toast({
        title: "Client updated",
        description: "Changes saved successfully.",
      });
      setEditing(false);
      onClientUpdated?.();
      dispatch(fetchClientProfile(clientId));
      // If source changed, refresh dashboard Lead Source Analysis
      if (form.source !== undefined) {
        dispatch(
          fetchAnnualMetrics({
            year: new Date().getFullYear(),
            filterBrokerIds: [],
          }),
        );
      }
    } catch (err: any) {
      logger.error("[ClientDetailPanel] save error", err);
      toast({ title: "Save failed", description: err, variant: "destructive" });
    }
  };

  const client = profile?.client;
  const loans = profile?.loans ?? [];
  const conversations = profile?.conversations ?? [];
  const communications = profile?.communications ?? [];
  const hasAssignedBroker = Boolean(client?.assigned_broker?.id);

  const statusMeta = CLIENT_STATUS_META[client?.status ?? "active"];

  /* ── build timeline from loans + communications ── */
  const timeline = React.useMemo(() => {
    const items: Array<{
      id: string;
      type: "loan_created" | "loan_status" | "communication" | "client_created";
      date: string;
      label: string;
      sub?: string;
      commType?: string;
      direction?: string;
    }> = [];

    if (client) {
      items.push({
        id: "client_created",
        type: "client_created",
        date: client.created_at,
        label: "Client created",
        sub: `Added to the system`,
      });
    }

    loans.forEach((loan) => {
      items.push({
        id: `loan_created_${loan.id}`,
        type: "loan_created",
        date: loan.created_at,
        label: `Loan created — ${loan.application_number}`,
        sub: loan.loan_type,
      });
      if (loan.updated_at && loan.updated_at !== loan.created_at) {
        items.push({
          id: `loan_status_${loan.id}`,
          type: "loan_status",
          date: loan.updated_at,
          label: `Loan updated — ${loan.application_number}`,
          sub: LOAN_STATUS_META[loan.status]?.label ?? loan.status,
        });
      }
    });

    communications.forEach((cm) => {
      items.push({
        id: `comm_${cm.id}`,
        type: "communication",
        date: cm.created_at,
        label:
          cm.direction === "inbound"
            ? "Inbound message"
            : (cm.subject ?? `Outbound ${cm.communication_type}`),
        sub: cm.body
          ? cm.body.slice(0, 80) + (cm.body.length > 80 ? "…" : "")
          : undefined,
        commType: cm.communication_type,
        direction: cm.direction,
      });
    });

    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [client, loans, communications]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[600px] sm:max-w-[600px] p-0 flex flex-col gap-0"
        style={{ maxWidth: "600px" }}
      >
        {/* ─── header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 px-6 pt-6 pb-4 border-b bg-gradient-to-br from-card to-muted/30">
          {isLoading ? (
            <div className="flex items-center gap-4 w-full">
              <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : client ? (
            <>
              <div className="flex items-start gap-4 w-full pr-8">
                {/* avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-inner">
                    <span className="text-xl font-bold text-primary">
                      {getInitials(client.first_name, client.last_name)}
                    </span>
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                      client.status === "active"
                        ? "bg-green-500"
                        : client.status === "suspended"
                          ? "bg-red-500"
                          : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground truncate">
                      {client.first_name} {client.last_name}
                    </h2>
                    <Badge
                      variant={
                        statusMeta.variant as
                          | "default"
                          | "secondary"
                          | "destructive"
                      }
                      className="text-xs"
                    >
                      {statusMeta.label}
                    </Badge>
                  </div>

                  {client.email && (
                    <EmailLink
                      email={client.email}
                      className="text-sm text-muted-foreground mt-0.5"
                    />
                  )}
                  {client.phone && (
                    <PhoneLink
                      phone={client.phone}
                      clientName={`${client.first_name} ${client.last_name}`}
                      clientId={client.id}
                      className="text-sm text-muted-foreground"
                    />
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Joined {fmtDate(client.created_at)}
                    </span>
                    {client.last_login && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Last seen {timeAgo(client.last_login)}
                      </span>
                    )}
                    {client.source && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {LEAD_SOURCE_LABEL[client.source] ?? client.source}
                      </span>
                    )}
                    {/* Convert to realtor CTA when source is realtor */}
                    {client.source === "realtor" && !editing && (
                      <button
                        onClick={() => setConvertToRealtorOpen(true)}
                        className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium underline underline-offset-2"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        Convert to Partner Realtor
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* action buttons — below the info row */}
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                      className="h-8 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-8 text-xs"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={!hasAssignedBroker}
                              onClick={() => {
                                const brokerId = client?.assigned_broker?.id;
                                if (!brokerId) return;
                                dispatch(
                                  fetchSchedulerSettingsForBroker(brokerId),
                                );
                                setScheduleDialogOpen(true);
                              }}
                              className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0 disabled:opacity-50"
                            >
                              <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                              Schedule
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!hasAssignedBroker && (
                          <TooltipContent>
                            Assign a Partner / Mortgage Banker before
                            scheduling.
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="h-8 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* ─── tabs ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 px-6 py-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : client ? (
          <Tabs
            defaultValue="profile"
            className="flex-1 grid grid-rows-[auto_1fr] overflow-hidden min-h-0"
          >
            <TabsList className="mx-6 mt-3 mb-0 shrink-0 grid grid-cols-4 h-9">
              <TabsTrigger value="profile" className="text-xs">
                Profile
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="text-xs">
                Pipeline{loans.length > 0 && ` (${loans.length})`}
              </TabsTrigger>
              <TabsTrigger value="conversations" className="text-xs">
                Convos{conversations.length > 0 && ` (${conversations.length})`}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                Activity
              </TabsTrigger>
            </TabsList>

            {/* ── PROFILE TAB ── */}
            <TabsContent
              value="profile"
              className="mt-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="px-6 py-4 space-y-6">
                  {/* Owner */}
                  {client.assigned_broker && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Owner / Assigned Broker
                      </h3>
                      <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/40 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-violet-700">
                            {getInitials(
                              client.assigned_broker.first_name,
                              client.assigned_broker.last_name,
                            )}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {client.assigned_broker.first_name}{" "}
                            {client.assigned_broker.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize flex items-center gap-1 flex-wrap">
                            {client.assigned_broker.role === "broker"
                              ? "Partner / Mortgage Banker"
                              : client.assigned_broker.role === "admin"
                                ? "Mortgage Banker"
                                : client.assigned_broker.role}{" "}
                            ·{" "}
                            <EmailLink
                              email={client.assigned_broker.email}
                              noIcon
                              className="text-xs"
                            />
                          </p>
                        </div>
                        <Shield className="w-4 h-4 ml-auto text-muted-foreground/40" />
                      </div>
                    </section>
                  )}

                  <Separator />

                  {/* Contact */}
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <EditableField
                        label="First Name"
                        value={client.first_name}
                        editValue={field("first_name")}
                        onEditChange={(v) => setField("first_name", v)}
                        editing={editing}
                        icon={<User className="w-3.5 h-3.5" />}
                      />
                      <EditableField
                        label="Last Name"
                        value={client.last_name}
                        editValue={field("last_name")}
                        onEditChange={(v) => setField("last_name", v)}
                        editing={editing}
                        icon={<User className="w-3.5 h-3.5" />}
                      />
                      <EditableField
                        label="Email"
                        value={client.email}
                        editValue={field("email")}
                        onEditChange={(v) => setField("email", v)}
                        editing={false} /* email not editable */
                        icon={<Mail className="w-3.5 h-3.5" />}
                        renderValue={(v) => <EmailLink email={v} />}
                      />
                      <EditableField
                        label="Phone"
                        value={client.phone}
                        editValue={field("phone")}
                        onEditChange={(v) => setField("phone", v)}
                        editing={editing}
                        icon={<Phone className="w-3.5 h-3.5" />}
                        placeholder="Add phone"
                        renderValue={(v) => (
                          <PhoneLink
                            phone={v}
                            clientName={`${client.first_name} ${client.last_name}`}
                            clientId={client.id}
                          />
                        )}
                      />
                      <EditableField
                        label="Alt. Phone"
                        value={client.alternate_phone}
                        editValue={field("alternate_phone")}
                        onEditChange={(v) => setField("alternate_phone", v)}
                        editing={editing}
                        icon={<Phone className="w-3.5 h-3.5" />}
                        placeholder="Add alt. phone"
                        renderValue={(v) => (
                          <PhoneLink
                            phone={v}
                            clientName={`${client.first_name} ${client.last_name}`}
                            clientId={client.id}
                          />
                        )}
                      />
                      <EditableField
                        label="Date of Birth"
                        value={
                          client.date_of_birth
                            ? fmtDate(client.date_of_birth)
                            : null
                        }
                        editValue={field("date_of_birth")}
                        onEditChange={(v) => setField("date_of_birth", v)}
                        editing={editing}
                        type="date"
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                  </section>

                  <Separator />

                  {/* Address */}
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Address
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <EditableField
                          label="Street"
                          value={client.address_street}
                          editValue={field("address_street")}
                          onEditChange={(v) => setField("address_street", v)}
                          editing={editing}
                          icon={<MapPin className="w-3.5 h-3.5" />}
                          placeholder="Street address"
                        />
                      </div>
                      <EditableField
                        label="City"
                        value={client.address_city}
                        editValue={field("address_city")}
                        onEditChange={(v) => setField("address_city", v)}
                        editing={editing}
                        placeholder="City"
                      />
                      <EditableField
                        label="State"
                        value={client.address_state}
                        editValue={field("address_state")}
                        onEditChange={(v) => setField("address_state", v)}
                        editing={editing}
                        placeholder="State"
                      />
                      <EditableField
                        label="ZIP"
                        value={client.address_zip}
                        editValue={field("address_zip")}
                        onEditChange={(v) => setField("address_zip", v)}
                        editing={editing}
                        placeholder="ZIP"
                      />
                    </div>
                  </section>

                  <Separator />

                  {/* Financial */}
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Financial & Employment
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Income Type
                        </p>
                        {editing ? (
                          <Select
                            value={field("income_type")}
                            onValueChange={(v) => setField("income_type", v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(INCOME_TYPE_LABELS).map(
                                ([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    {v}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground/60" />
                            {INCOME_TYPE_LABELS[client.income_type ?? ""] ??
                              client.income_type ??
                              "—"}
                          </p>
                        )}
                      </div>

                      <EditableField
                        label="Employment Status"
                        value={client.employment_status}
                        editValue={field("employment_status")}
                        onEditChange={(v) => setField("employment_status", v)}
                        editing={editing}
                        icon={<Briefcase className="w-3.5 h-3.5" />}
                        placeholder="e.g. Full-time"
                      />

                      <EditableField
                        label="Annual Income"
                        value={
                          client.annual_income != null
                            ? fmtMoney(client.annual_income)
                            : null
                        }
                        editValue={field("annual_income")}
                        onEditChange={(v) => setField("annual_income", v)}
                        editing={editing}
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        placeholder="0"
                      />

                      <EditableField
                        label="Credit Score"
                        value={
                          client.credit_score != null
                            ? String(client.credit_score)
                            : null
                        }
                        editValue={field("credit_score")}
                        onEditChange={(v) => setField("credit_score", v)}
                        editing={editing}
                        icon={<TrendingUp className="w-3.5 h-3.5" />}
                        placeholder="e.g. 720"
                      />

                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Citizenship
                        </p>
                        {editing ? (
                          <Select
                            value={field("citizenship_status")}
                            onValueChange={(v) =>
                              setField("citizenship_status", v)
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CITIZENSHIP_LABELS).map(
                                ([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    {v}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground/60" />
                            {CITIZENSHIP_LABELS[
                              client.citizenship_status ?? ""
                            ] ??
                              client.citizenship_status ??
                              "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Source */}
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Lead Source
                    </h3>
                    {editing ? (
                      <Select
                        value={
                          LEAD_SOURCES.some((s) => s.value === field("source"))
                            ? field("source")
                            : "unset"
                        }
                        onValueChange={(v) =>
                          setField("source", v === "unset" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select source…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">
                            <span className="text-muted-foreground">
                              — Not set —
                            </span>
                          </SelectItem>
                          {LEAD_SOURCES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary min-w-[28px]">
                                  {s.code}
                                </span>
                                {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {client.source ? (
                            (LEAD_SOURCE_LABEL[client.source] ?? client.source)
                          ) : (
                            <span className="text-muted-foreground italic">
                              No source set
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </section>

                  {/* Verified badges */}
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
                        client.email_verified
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <Mail className="w-3 h-3" />
                      Email {client.email_verified ? "Verified" : "Unverified"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
                        client.phone_verified
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <Phone className="w-3 h-3" />
                      Phone {client.phone_verified ? "Verified" : "Unverified"}
                    </span>
                    {client.referral_code && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border bg-violet-50 text-violet-700 border-violet-200">
                        <Hash className="w-3 h-3" />
                        Ref: {client.referral_code}
                      </span>
                    )}
                  </div>

                  <div className="h-4" />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── PIPELINE TAB ── */}
            <TabsContent
              value="pipeline"
              className="mt-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="px-6 py-4 space-y-3">
                  {loans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <Building2 className="w-12 h-12 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        No loans in pipeline
                      </p>
                    </div>
                  ) : (
                    loans.map((loan) => {
                      const statusMeta =
                        LOAN_STATUS_META[loan.status] ?? LOAN_STATUS_META.draft;
                      return (
                        <button
                          key={loan.id}
                          onClick={() => onOpenLoan?.(loan.id)}
                          className="w-full text-left group rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.color}`}
                                >
                                  {statusMeta.label}
                                </span>
                                {loan.priority === "urgent" && (
                                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-foreground">
                                #{loan.application_number}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {loan.loan_type?.replace(/_/g, " ")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {loan.loan_amount && (
                                <p className="text-base font-bold text-foreground">
                                  {fmtMoney(loan.loan_amount)}
                                </p>
                              )}
                              {loan.property_value && (
                                <p className="text-xs text-muted-foreground">
                                  {fmtMoney(loan.property_value)} value
                                </p>
                              )}
                            </div>
                          </div>

                          {(loan.property_address || loan.property_city) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {[
                                loan.property_address,
                                loan.property_city,
                                loan.property_state,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(loan.created_at)}
                            </p>
                            {loan.broker_first_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {loan.broker_first_name} {loan.broker_last_name}
                              </p>
                            )}
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── CONVERSATIONS TAB ── */}
            <TabsContent
              value="conversations"
              className="mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden"
            >
              {convView === "list" ? (
                /* ── thread list ── */
                <div className="flex flex-col flex-1 min-h-0">
                  {/* toolbar */}
                  <div className="flex items-center justify-between px-6 pt-3 pb-2 shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {conversations.length} thread
                      {conversations.length !== 1 ? "s" : ""}
                    </p>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => {
                        setActiveConvId(null);
                        setComposeOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Message
                    </Button>
                  </div>

                  {/* compose box (new thread) */}
                  {composeOpen && !activeConvId && (
                    <ComposeBox
                      composeType={composeType}
                      composeSubject={composeSubject}
                      composeBody={composeBody}
                      sendingMsg={sendingMsg}
                      hasPhone={!!client?.phone}
                      hasEmail={!!client?.email}
                      onTypeChange={setComposeType}
                      onSubjectChange={setComposeSubject}
                      onBodyChange={setComposeBody}
                      onSend={handleSendMessage}
                      onCancel={() => setComposeOpen(false)}
                      onSaveAsTemplate={() => setSaveTemplateOpen(true)}
                      templates={convTemplates}
                    />
                  )}

                  <ScrollArea className="flex-1">
                    <div className="px-6 pb-4 space-y-2.5">
                      {conversations.length === 0 && !composeOpen ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                          <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">
                            No conversations yet
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveConvId(null);
                              setComposeOpen(true);
                            }}
                            className="gap-1.5 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Start a conversation
                          </Button>
                        </div>
                      ) : (
                        conversations.map((conv) => {
                          const typeIcon =
                            conv.last_message_type === "email" ? (
                              <Mail className="w-4 h-4" />
                            ) : conv.last_message_type === "whatsapp" ? (
                              <MessageCircle className="w-4 h-4 text-green-500" />
                            ) : conv.last_message_type === "call" ? (
                              <PhoneCall className="w-4 h-4" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            );
                          return (
                            <button
                              key={conv.id}
                              onClick={() => openThread(conv.conversation_id)}
                              className="w-full text-left group rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/[0.02] hover:shadow-sm transition-all p-3.5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                  {typeIcon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-foreground capitalize">
                                      {conv.last_message_type ?? "SMS"} thread
                                    </p>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {conv.unread_count > 0 && (
                                        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
                                          {conv.unread_count} new
                                        </span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground">
                                        {conv.last_message_at
                                          ? timeAgo(conv.last_message_at)
                                          : "—"}
                                      </span>
                                    </div>
                                  </div>
                                  {conv.last_message_preview && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {conv.last_message_preview}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {conv.message_count} message
                                    {conv.message_count !== 1 ? "s" : ""}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                /* ── thread detail ── */
                <div className="flex flex-col flex-1 min-h-0">
                  {/* thread header */}
                  <div className="flex items-center gap-3 px-6 pt-3 pb-2 border-b shrink-0">
                    <button
                      onClick={() => {
                        setConvView("list");
                        setActiveConvId(null);
                        setComposeOpen(false);
                        setThreadMessages([]);
                      }}
                      className="p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const conv = conversations.find(
                          (c) => c.conversation_id === activeConvId,
                        );
                        return (
                          <div>
                            <p className="text-sm font-semibold capitalize">
                              {conv?.last_message_type ?? "SMS"} conversation
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {conv?.message_count ?? threadMessages.length}{" "}
                              messages
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setComposeOpen((v) => !v)}
                      >
                        <Send className="w-3 h-3" />
                        Reply
                      </Button>
                      {onOpenConversation && activeConvId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => onOpenConversation(activeConvId)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* messages */}
                  <ScrollArea className="flex-1">
                    <div className="px-6 py-4 space-y-3">
                      {loadingThread ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                          >
                            <Skeleton
                              className={`h-14 rounded-xl ${i % 2 === 0 ? "w-3/4" : "w-2/3"}`}
                            />
                          </div>
                        ))
                      ) : threadMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                          <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">
                            No messages loaded
                          </p>
                        </div>
                      ) : (
                        threadMessages.map((msg) => {
                          const isOutbound = msg.direction === "outbound";
                          const isSms =
                            msg.communication_type === "sms" ||
                            msg.communication_type === "whatsapp";
                          const isEmail = msg.communication_type === "email";
                          const isCall = msg.communication_type === "call";
                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${isOutbound ? "flex-row-reverse" : "flex-row"}`}
                            >
                              {/* type dot */}
                              <div
                                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 text-xs ${
                                  isOutbound
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isEmail ? (
                                  <Mail className="w-3 h-3" />
                                ) : isCall ? (
                                  <PhoneCall className="w-3 h-3" />
                                ) : msg.communication_type === "whatsapp" ? (
                                  <MessageCircle className="w-3 h-3" />
                                ) : (
                                  <Smartphone className="w-3 h-3" />
                                )}
                              </div>

                              <div
                                className={`max-w-[75%] space-y-0.5 ${isOutbound ? "items-end" : "items-start"} flex flex-col`}
                              >
                                {isEmail && msg.subject && (
                                  <p
                                    className={`text-[10px] font-semibold uppercase tracking-wide px-1 ${isOutbound ? "text-right text-primary/70" : "text-muted-foreground"}`}
                                  >
                                    {msg.subject}
                                  </p>
                                )}
                                <div
                                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                    isOutbound
                                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                                      : "bg-muted text-foreground rounded-tl-sm"
                                  }`}
                                >
                                  {msg.body || (
                                    <span className="italic opacity-60">
                                      {isCall ? "Voice call" : "No content"}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`flex items-center gap-1.5 px-1 ${isOutbound ? "flex-row-reverse" : "flex-row"}`}
                                >
                                  <span className="text-[10px] text-muted-foreground">
                                    {timeAgo(msg.sent_at ?? msg.created_at)}
                                  </span>
                                  {isOutbound && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {msg.delivery_status === "read" ? (
                                        <CheckCheck className="w-3 h-3 text-blue-500" />
                                      ) : msg.delivery_status ===
                                        "delivered" ? (
                                        <CheckCheck className="w-3 h-3 text-muted-foreground" />
                                      ) : msg.delivery_status === "failed" ? (
                                        <AlertCircle className="w-3 h-3 text-destructive" />
                                      ) : (
                                        <Clock3 className="w-3 h-3 text-muted-foreground/50" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* reply compose */}
                  {composeOpen && (
                    <ComposeBox
                      composeType={composeType}
                      composeSubject={composeSubject}
                      composeBody={composeBody}
                      sendingMsg={sendingMsg}
                      hasPhone={!!client?.phone}
                      hasEmail={!!client?.email}
                      onTypeChange={setComposeType}
                      onSubjectChange={setComposeSubject}
                      onBodyChange={setComposeBody}
                      onSend={handleSendMessage}
                      onCancel={() => setComposeOpen(false)}
                      compact
                      onSaveAsTemplate={() => setSaveTemplateOpen(true)}
                      templates={convTemplates}
                    />
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── ACTIVITY TAB ── */}
            <TabsContent
              value="activity"
              className="mt-0 overflow-y-auto data-[state=inactive]:hidden"
            >
              <div className="px-6 py-4">
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                    <Activity className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No activity yet
                    </p>
                  </div>
                ) : (
                  timeline.map((item, i) => {
                    const isLast = i === timeline.length - 1;
                    let iconEl: React.ReactNode;
                    let dotColor = "bg-muted-foreground";
                    if (item.type === "client_created") {
                      iconEl = <Star className="w-3 h-3" />;
                      dotColor = "bg-primary";
                    } else if (item.type === "loan_created") {
                      iconEl = <Building2 className="w-3 h-3" />;
                      dotColor = "bg-violet-500";
                    } else if (item.type === "loan_status") {
                      iconEl = <CheckCircle2 className="w-3 h-3" />;
                      dotColor = "bg-green-500";
                    } else if (item.type === "communication") {
                      iconEl =
                        COMM_ICONS[item.commType ?? "sms"] ?? COMM_ICONS.sms;
                      dotColor =
                        item.direction === "inbound"
                          ? "bg-blue-500"
                          : "bg-slate-400";
                    }
                    return (
                      <div
                        key={item.id}
                        className="relative flex items-start gap-4 pb-5"
                      >
                        {!isLast && (
                          <div className="absolute left-[16px] top-[34px] bottom-0 w-px bg-border" />
                        )}
                        <div
                          className={`relative z-10 w-[34px] h-[34px] shrink-0 rounded-full ${dotColor} bg-opacity-15 flex items-center justify-center border-2 border-background shadow-sm`}
                        >
                          <div
                            className={`${dotColor} text-white rounded-full w-5 h-5 flex items-center justify-center`}
                          >
                            {iconEl}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-sm font-medium text-foreground leading-tight">
                            {item.label}
                          </p>
                          {item.sub && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                              {item.sub}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {fmtDate(item.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>

      {/* ── Schedule Meeting dialog ── */}
      <Dialog
        open={scheduleDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setMeetingForm({
              meeting_date: "",
              meeting_time: "",
              meeting_type: "phone",
              notes: "",
            });
            setScheduleDialogOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-violet-600" />
              Schedule a Meeting
            </DialogTitle>
            <DialogDescription>
              Book a meeting with{" "}
              <strong>
                {client
                  ? `${client.first_name} ${client.last_name}`
                  : "this client"}
              </strong>
              . A confirmation email will be sent automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Client info read-only row */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                {client?.email ?? "—"}
              </span>
              {client?.phone && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{client.phone}</span>
                </>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <BrokerDatePicker
                value={meetingForm.meeting_date}
                onChange={(d) =>
                  setMeetingForm((f) => ({
                    ...f,
                    meeting_date: d,
                    meeting_time: "",
                  }))
                }
                availability={schedulerAvailability}
                settings={schedulerSettings}
                disabled={isSavingMeeting}
              />
            </div>

            {/* Time slots */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Time</Label>
              <BrokerTimePicker
                date={meetingForm.meeting_date}
                value={meetingForm.meeting_time}
                onChange={(t) =>
                  setMeetingForm((f) => ({ ...f, meeting_time: t }))
                }
                brokerToken={
                  client?.assigned_broker?.public_token ??
                  currentBroker?.public_token ??
                  undefined
                }
                disabled={isSavingMeeting}
              />
            </div>

            {/* Meeting type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Meeting Type</Label>
              <Select
                value={meetingForm.meeting_type}
                onValueChange={(v) =>
                  setMeetingForm((f) => ({
                    ...f,
                    meeting_type: v as "phone" | "video",
                  }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">
                    <span className="flex items-center gap-2">
                      <PhoneCall className="h-3.5 w-3.5" /> Phone Call
                    </span>
                  </SelectItem>
                  <SelectItem value="video" disabled>
                    <span className="flex items-center gap-2 opacity-50">
                      <Lock className="h-3.5 w-3.5" /> Video (Zoom) — coming
                      soon
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="meet-notes" className="text-xs font-medium">
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="meet-notes"
                placeholder="Agenda, topics to discuss…"
                rows={2}
                value={meetingForm.notes}
                onChange={(e) =>
                  setMeetingForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleDialogOpen(false)}
              disabled={isSavingMeeting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={(() => {
                if (
                  isSavingMeeting ||
                  !meetingForm.meeting_date ||
                  !meetingForm.meeting_time
                )
                  return true;
                const slot = availableSlots.find(
                  (s) => s.time === meetingForm.meeting_time,
                );
                // slot not found means time was typed manually — allow it
                if (slot && !slot.available) return true;
                return false;
              })()}
              onClick={async () => {
                if (!client) return;
                setIsSavingMeeting(true);
                try {
                  const result = await dispatch(
                    createScheduledMeeting({
                      client_name:
                        `${client.first_name} ${client.last_name}`.trim(),
                      client_email: client.email,
                      client_phone: client.phone ?? undefined,
                      meeting_date: meetingForm.meeting_date,
                      meeting_time: meetingForm.meeting_time,
                      meeting_type: meetingForm.meeting_type,
                      notes: meetingForm.notes || undefined,
                    }),
                  );
                  if (createScheduledMeeting.fulfilled.match(result)) {
                    toast({
                      title: "Meeting scheduled!",
                      description: `Confirmation sent to ${client.email}.`,
                    });
                    setScheduleDialogOpen(false);
                    setMeetingForm({
                      meeting_date: "",
                      meeting_time: "",
                      meeting_type: "phone",
                      notes: "",
                    });
                  } else {
                    toast({
                      title: "Error",
                      description:
                        (result.payload as string) ??
                        "Failed to schedule meeting.",
                      variant: "destructive",
                    });
                  }
                } finally {
                  setIsSavingMeeting(false);
                }
              }}
            >
              {isSavingMeeting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <CalendarPlus className="h-3.5 w-3.5 mr-1" />
              )}
              Book Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert to Realtor Confirmation ─────────────────────────────── */}
      <Dialog
        open={convertToRealtorOpen}
        onOpenChange={setConvertToRealtorOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-violet-500" />
              Convert to Partner Realtor
            </DialogTitle>
            <DialogDescription>
              {client?.first_name} {client?.last_name} will be deactivated as a
              client and added as a Partner Realtor. Their conversation history
              will be re-linked.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 flex items-start gap-2 text-violet-800 text-xs leading-snug">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
            This action preserves conversation history. The client account will
            be set to inactive (not deleted) so loan history remains intact.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertToRealtorOpen(false)}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertToRealtor}
              disabled={isConverting}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {isConverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Convert to Realtor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save message as reusable template */}
      <SaveAsTemplateDialog
        isOpen={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        channelType={composeType}
        defaultBody={composeBody}
        defaultSubject={composeSubject}
      />
    </Sheet>
  );
}
