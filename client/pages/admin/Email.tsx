import React, { useEffect, useState, useRef, useCallback } from "react";
import * as AblyLib from "ably";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "isomorphic-dompurify";
import {
  Mail,
  RefreshCw,
  Search,
  Send,
  Inbox,
  ChevronLeft,
  Clock,
  CheckCheck,
  Check,
  Loader2,
  ExternalLink,
  Reply,
  ReplyAll,
  MailOpen,
  Pencil,
  X,
  SendHorizonal,
  FolderOpen,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchEmailThreads,
  fetchEmailMessages,
  sendEmailMessage,
  fetchEmailMailboxes,
  syncEmailMailbox,
  setEmailCurrentThread,
  setEmailSearch,
  setEmailFolder,
  emailMessageReceived,
} from "@/store/slices/emailSlice";
import { fetchAblyToken } from "@/store/slices/voiceSlice";
import { fetchClients } from "@/store/slices/clientsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import {
  markAsRead,
  selectNotifications,
} from "@/store/slices/notificationsSlice";
import type {
  ConversationThread,
  Communication,
  EmailRecipient,
} from "@shared/api";

// ─── Quill config ─────────────────────────────────────────────────────────────

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "color",
  "background",
  "list",
  "bullet",
  "align",
  "link",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function isHtmlContent(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

function safeHtml(body: string): string {
  return DOMPurify.sanitize(body, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "strike",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "blockquote",
      "pre",
      "code",
      "span",
      "div",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "src", "alt"],
  });
}

// ─── Folders ──────────────────────────────────────────────────────────────────

type Folder = "inbox" | "sent";

const FOLDERS: {
  key: Folder;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "inbox", label: "Inbox", Icon: Inbox },
  { key: "sent", label: "Sent", Icon: SendHorizonal },
];

// ─── RecipientPills ───────────────────────────────────────────────────────────

function RecipientPill({
  recipient,
  onRemove,
}: {
  recipient: EmailRecipient;
  onRemove?: () => void;
}) {
  const display = recipient.name || recipient.email;
  const tooltip = recipient.name
    ? `${recipient.name} <${recipient.email}>`
    : recipient.email;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-full bg-muted/80 border border-border/60 text-xs text-foreground/80 hover:border-primary/40 transition-colors cursor-default max-w-[180px]">
            <span className="truncate">{display}</span>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="shrink-0 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RecipientPillGroup({
  recipients,
  label,
  onRemove,
}: {
  recipients: EmailRecipient[];
  label?: string;
  onRemove?: (email: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const MAX_SHOWN = 3;
  const shown = expanded ? recipients : recipients.slice(0, MAX_SHOWN);
  const extra = recipients.length - MAX_SHOWN;

  if (recipients.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      {label && (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 w-5">
          {label}
        </span>
      )}
      {shown.map((r, i) => (
        <RecipientPill
          key={`${r.email}-${i}`}
          recipient={r}
          onRemove={onRemove ? () => onRemove(r.email) : undefined}
        />
      ))}
      {!expanded && extra > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          <Users className="h-2.5 w-2.5" />+{extra}
        </button>
      )}
    </div>
  );
}

// ─── ThreadItem ───────────────────────────────────────────────────────────────

function ThreadItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: ConversationThread;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border/50 transition-all duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        isSelected && "bg-primary/5 border-l-[3px] border-l-primary pl-[13px]",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {getInitials(thread.client_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-sm truncate",
                thread.unread_count > 0
                  ? "font-bold text-foreground"
                  : "font-medium text-foreground/80",
              )}
            >
              {thread.client_name ?? thread.client_email ?? "Unknown"}
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatRelativeTime(thread.last_message_at)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p
              className={cn(
                "text-xs truncate",
                thread.unread_count > 0
                  ? "text-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              {(thread.last_message_preview ?? "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()}
            </p>
            {thread.unread_count > 0 && (
              <Badge
                variant="default"
                className="h-4 min-w-4 px-1 text-[10px] shrink-0 rounded-full"
              >
                {thread.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── MessageCard ──────────────────────────────────────────────────────────────

function MessageCard({
  msg,
  defaultOpen = false,
  clientName,
}: {
  msg: Communication;
  defaultOpen?: boolean;
  clientName?: string | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOutbound = msg.direction === "outbound";
  const html = isHtmlContent(msg.body) ? safeHtml(msg.body) : null;
  const senderLabel = isOutbound ? "Me" : (clientName ?? "Client");
  const senderInitials = isOutbound ? "Me" : getInitials(clientName);
  const ChevronDown = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-200",
        !open && "cursor-pointer hover:border-primary/40",
      )}
    >
      <div
        className="flex items-start gap-3 px-5 py-4"
        onClick={() => !open && setOpen(true)}
        role={open ? undefined : "button"}
      >
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              isOutbound
                ? "bg-primary/10 text-primary"
                : "bg-secondary/50 text-secondary-foreground",
            )}
          >
            {senderInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">{senderLabel}</span>
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              {formatFullDate(msg.created_at)}
              {isOutbound && (
                <span className="ml-1">
                  {msg.delivery_status === "read" ? (
                    <CheckCheck className="h-3 w-3 text-blue-400" />
                  ) : msg.delivery_status === "delivered" ? (
                    <CheckCheck className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Check className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              )}
            </span>
          </div>
          {msg.subject && (
            <p className="text-xs text-muted-foreground truncate">
              {msg.subject}
            </p>
          )}
          {!open && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-70">
              {html
                ? msg.body.replace(/<[^>]+>/g, " ").slice(0, 100)
                : msg.body.slice(0, 100)}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="shrink-0 rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {open && (
        <>
          {/* Recipients row — shown when metadata is available */}
          {(msg.metadata?.to_recipients?.length > 0 ||
            msg.metadata?.cc_recipients?.length > 0 ||
            msg.metadata?.from_email) && (
            <div className="px-5 py-2.5 bg-muted/20 border-b border-border/40 space-y-1.5">
              {msg.metadata?.from_email && !isOutbound && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 w-5">
                    Fr
                  </span>
                  <RecipientPill
                    recipient={{
                      email: msg.metadata.from_email,
                      name: msg.metadata.from_name || null,
                    }}
                  />
                </div>
              )}
              {msg.metadata?.to_recipients &&
                msg.metadata.to_recipients.length > 0 && (
                  <RecipientPillGroup
                    recipients={msg.metadata.to_recipients}
                    label="To"
                  />
                )}
              {msg.metadata?.cc_recipients &&
                msg.metadata.cc_recipients.length > 0 && (
                  <RecipientPillGroup
                    recipients={msg.metadata.cc_recipients}
                    label="CC"
                  />
                )}
            </div>
          )}
          <Separator />
          <div className="px-5 py-4">
            {html ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert email-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {msg.body}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── NoMailboxScreen ──────────────────────────────────────────────────────────

function NoMailboxScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
        <Mail className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-semibold">No email account connected</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect your Office 365 mailbox in your profile settings to manage
          emails with clients directly.
        </p>
      </div>
      <Button onClick={() => navigate("/admin/profile")} className="gap-2">
        <ExternalLink className="h-4 w-4" />
        Go to Profile Settings
      </Button>
    </div>
  );
}

// ─── EmailTagInput ────────────────────────────────────────────────────────────

function EmailTagInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: EmailRecipient[];
  onChange: (v: EmailRecipient[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [inputVal, setInputVal] = useState("");

  const commit = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    if (value.some((r) => r.email === email)) {
      setInputVal("");
      return;
    }
    onChange([...value, { email }]);
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", "Tab", " "].includes(e.key)) {
      if (inputVal.trim()) {
        e.preventDefault();
        commit(inputVal);
      }
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-0.5">
      {value.map((r) => (
        <span
          key={r.email}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary max-w-[240px]"
        >
          <span className="truncate">{r.name || r.email}</span>
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x.email !== r.email))}
            className="shrink-0 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors ml-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        autoFocus={autoFocus}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(inputVal)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 py-0.5"
      />
    </div>
  );
}

// ─── ComposeFieldRow ──────────────────────────────────────────────────────────

function ComposeFieldRow({
  label,
  children,
  actions,
}: {
  label: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="group flex items-center gap-0 border-b border-border/60 px-5 py-2.5 focus-within:border-primary/50 transition-colors duration-150">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
      {actions && <div className="shrink-0 ml-2">{actions}</div>}
    </div>
  );
}

// ─── ComposeDialog ────────────────────────────────────────────────────────────

function ComposeDialog({
  open,
  onOpenChange,
  mailboxEmail,
  defaultReplyTo,
  defaultSubject,
  mailboxId,
  isMobile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mailboxEmail?: string;
  defaultReplyTo?: string;
  defaultSubject?: string;
  mailboxId?: number;
  isMobile?: boolean;
}) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isSendingMessage } = useAppSelector((s) => s.email);
  const clients = useAppSelector((s) => s.clients.clients);
  const [to, setTo] = useState(defaultReplyTo ?? "");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState<EmailRecipient[]>([]);
  const [bcc, setBcc] = useState<EmailRecipient[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [suggestions, setSuggestions] = useState<typeof clients>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const toInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTo(defaultReplyTo ?? "");
      setSubject(defaultSubject ?? "");
      setBody("");
      setCc([]);
      setBcc([]);
      setShowCc(false);
      setShowBcc(false);
      setSuggestions([]);
      setShowSuggestions(false);
      // Load clients if not yet fetched
      if (clients.length === 0) dispatch(fetchClients());
    }
  }, [open, defaultReplyTo, defaultSubject]);

  const handleToChange = (val: string) => {
    setTo(val);
    const q = val.trim().toLowerCase();
    if (q.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const matches = clients
      .filter(
        (c) =>
          c.email?.toLowerCase().includes(q) ||
          c.first_name?.toLowerCase().includes(q) ||
          c.last_name?.toLowerCase().includes(q),
      )
      .slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const pickSuggestion = (c: (typeof clients)[number]) => {
    setTo(c.email);
    setShowSuggestions(false);
    toInputRef.current?.blur();
  };

  const canSend =
    to.trim().length > 0 && body.replace(/<[^>]+>/g, "").trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    const result = await dispatch(
      sendEmailMessage({
        communication_type: "email",
        recipient_email: to.trim(),
        mailbox_id: mailboxId,
        subject: subject || undefined,
        body,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
      }),
    );
    if (sendEmailMessage.fulfilled.match(result)) {
      toast({ title: "Email sent" });
      onOpenChange(false);
      dispatch(fetchEmailThreads());
    } else {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 gap-0 overflow-hidden",
          isMobile
            ? "!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none !h-[100dvh] !max-h-none !rounded-none"
            : "max-w-2xl max-h-[90vh]",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Pencil className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-sm font-semibold leading-none">
              New Message
            </DialogTitle>
            {mailboxEmail && (
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                From: {mailboxEmail}
              </DialogDescription>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col shrink-0">
          {/* To row */}
          <ComposeFieldRow
            label="To"
            actions={
              <div className="flex items-center gap-1">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded transition-colors"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded transition-colors"
                  >
                    Bcc
                  </button>
                )}
              </div>
            }
          >
            <div className="relative">
              <input
                ref={toInputRef}
                type="text"
                autoFocus
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => handleToChange(e.target.value)}
                onFocus={() =>
                  to.trim() && showSuggestions && setShowSuggestions(true)
                }
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 py-0.5"
              />
              {/* Autocomplete dropdown */}
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 z-[200] mt-1 w-full min-w-[280px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
                >
                  {suggestions.map((c) => {
                    const name = `${c.first_name} ${c.last_name}`.trim();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickSuggestion(c);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-primary/8 hover:bg-primary/10 text-left transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">
                            {getInitials(name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {name || c.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.email}
                          </p>
                        </div>
                        {c.status && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                              c.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {c.status}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ComposeFieldRow>

          {/* Cc row */}
          {showCc && (
            <ComposeFieldRow
              label="Cc"
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setCc([]);
                  }}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              }
            >
              <EmailTagInput
                value={cc}
                onChange={setCc}
                placeholder="Add Cc recipients…"
                autoFocus
              />
            </ComposeFieldRow>
          )}

          {/* Bcc row */}
          {showBcc && (
            <ComposeFieldRow
              label="Bcc"
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setBcc([]);
                  }}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              }
            >
              <EmailTagInput
                value={bcc}
                onChange={setBcc}
                placeholder="Add Bcc recipients…"
                autoFocus
              />
            </ComposeFieldRow>
          )}

          {/* Subject row */}
          <ComposeFieldRow label="Subject">
            <input
              type="text"
              placeholder="(no subject)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 py-0.5"
            />
          </ComposeFieldRow>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ReactQuill
            theme="snow"
            value={body}
            onChange={setBody}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            placeholder="Write your message…"
            className={isMobile ? "flex-1" : "min-h-[220px]"}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Discard
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSendingMessage || !canSend}
            className="gap-2"
          >
            {isSendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ReplyBox (always-open Gmail/Outlook style) ───────────────────────────────

function ReplyBox({
  thread,
  mailboxId,
  mailboxEmail,
  messages,
  onSent,
}: {
  thread: ConversationThread;
  mailboxId?: number;
  mailboxEmail?: string;
  messages: Communication[];
  onSent: () => void;
}) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isSendingMessage } = useAppSelector((s) => s.email);
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll">("reply");
  const [ccList, setCcList] = useState<EmailRecipient[]>([]);
  const isMobile = useIsMobile();

  const computeReplyAllCc = useCallback((): EmailRecipient[] => {
    const lastInbound = [...messages]
      .reverse()
      .find((m) => m.direction === "inbound");
    if (!lastInbound?.metadata) return [];
    const mailboxLower = (mailboxEmail || "").toLowerCase();
    const clientLower = (thread.client_email || "").toLowerCase();
    const toRecips: EmailRecipient[] = (
      lastInbound.metadata.to_recipients || []
    ).filter(
      (r: EmailRecipient) =>
        r.email.toLowerCase() !== mailboxLower &&
        r.email.toLowerCase() !== clientLower,
    );
    const ccRecips: EmailRecipient[] = (
      lastInbound.metadata.cc_recipients || []
    ).filter((r: EmailRecipient) => r.email.toLowerCase() !== mailboxLower);
    return [...toRecips, ...ccRecips];
  }, [messages, mailboxEmail, thread.client_email]);

  const handleSetReplyMode = (mode: "reply" | "replyAll") => {
    setReplyMode(mode);
    setCcList(mode === "replyAll" ? computeReplyAllCc() : []);
  };

  const handleSend = async () => {
    if (!body.replace(/<[^>]+>/g, "").trim()) return;
    const result = await dispatch(
      sendEmailMessage({
        conversation_id: thread.conversation_id,
        communication_type: "email",
        recipient_email: thread.client_email ?? undefined,
        mailbox_id: mailboxId,
        body,
        cc: ccList.length > 0 ? ccList : undefined,
      }),
    );
    if (sendEmailMessage.fulfilled.match(result)) {
      setBody("");
      setFocused(false);
      setCcList([]);
      setReplyMode("reply");
      onSent();
    } else {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  const hasReplyAll = messages.some(
    (m) =>
      m.direction === "inbound" &&
      ((m.metadata?.to_recipients?.length ?? 0) > 1 ||
        (m.metadata?.cc_recipients?.length ?? 0) > 0),
  );

  return (
    <div
      className={cn(
        "mx-4 mb-4 mt-2 rounded-xl border bg-card shadow-md transition-all duration-300 overflow-hidden",
        focused ? "border-primary/60 shadow-primary/10" : "border-border",
        expanded &&
          "mx-0 mb-0 mt-0 rounded-none border-x-0 border-b-0 shadow-none",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border/60">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
            Me
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              {replyMode === "replyAll" ? "Reply All to " : "Reply to "}
              <span className="text-primary">
                {thread.client_name ?? thread.client_email ?? "Client"}
              </span>
            </span>
            {(thread.client_email || mailboxEmail) && (
              <span className="text-[10px] text-muted-foreground">
                {thread.client_email && `→ ${thread.client_email}`}
                {mailboxEmail && ` · from ${mailboxEmail}`}
              </span>
            )}
          </div>
          {/* CC pills row */}
          {ccList.length > 0 && (
            <div className="mt-1.5">
              <RecipientPillGroup
                recipients={ccList}
                label="CC"
                onRemove={(email) =>
                  setCcList((prev) => prev.filter((r) => r.email !== email))
                }
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Reply / Reply All toggle */}
          {hasReplyAll && (
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSetReplyMode("reply")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors",
                        replyMode === "reply"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Reply className="h-3 w-3" />
                      Reply
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Reply to sender only
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSetReplyMode("replyAll")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors border-l border-border",
                        replyMode === "replyAll"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <ReplyAll className="h-3 w-3" />
                      All
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Reply to everyone
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={expanded ? "Collapse editor" : "Expand editor"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Rich editor — always visible */}
      <div
        className="ql-no-border"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <ReactQuill
          theme="snow"
          value={body}
          onChange={setBody}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          placeholder="Write your reply…"
          className={expanded ? "min-h-[360px]" : "min-h-[96px]"}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20">
        {!isMobile && (
          <span className="text-[11px] text-muted-foreground">
            ⌘ Enter to send
          </span>
        )}
        <div className="flex items-center gap-2">
          {body.replace(/<[^>]+>/g, "").trim() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBody("")}
              className="text-muted-foreground h-8 px-3 text-xs"
            >
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSendingMessage || !body.replace(/<[^>]+>/g, "").trim()}
            className="gap-1.5 h-8"
          >
            {isSendingMessage ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {replyMode === "replyAll" ? "Reply All" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MobileBottomNav ──────────────────────────────────────────────────────────

function MobileBottomNav({
  folder,
  totalUnread,
  onFolderChange,
}: {
  folder: Folder;
  totalUnread: number;
  onFolderChange: (f: Folder) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-border bg-card/95 backdrop-blur-md">
      {FOLDERS.map((f) => {
        const isActive = folder === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onFolderChange(f.key)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isActive && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-b-full bg-primary" />
            )}
            <div className="relative">
              <f.Icon className="h-5 w-5" />
              {f.key === "inbox" && totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center leading-none">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Email Page ───────────────────────────────────────────────────────────────

const Email = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    threads,
    currentThread,
    messages,
    mailboxes,
    isLoadingThreads,
    isLoadingMessages,
    isSyncingMailbox,
    isLoadingMailboxes,
    search,
    folder,
  } = useAppSelector((state) => state.email);
  const notifications = useAppSelector(selectNotifications);

  const activeMailbox = mailboxes.find((m) => m.status === "active");
  const [composeOpen, setComposeOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"list" | "thread">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Resizable thread-list panel ─────────────────────────────────────────
  const LIST_MIN = 220;
  const LIST_MAX = 560;
  const [listWidth, setListWidth] = useState(320);
  const listWidthRef = useRef(320);

  const handleResizerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = listWidthRef.current;
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const newW = Math.min(
          LIST_MAX,
          Math.max(LIST_MIN, startW + ev.clientX - startX),
        );
        listWidthRef.current = newW;
        setListWidth(newW);
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [],
  );
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchEmailMailboxes());
    dispatch(fetchEmailThreads());
  }, [dispatch]);

  // Re-fetch threads whenever the folder changes so the list updates
  useEffect(() => {
    dispatch(fetchEmailThreads());
  }, [folder, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-open a thread when navigating from a notification (?conversation=...)
  // Runs whenever conversationParam or threads change — threads may be empty
  // on first render so we wait until they load.
  const conversationParam = searchParams.get("conversation");
  const didAutoOpenRef = useRef(false);
  useEffect(() => {
    if (!conversationParam) return;
    if (threads.length === 0) return; // wait for threads to load
    if (didAutoOpenRef.current) return; // already handled
    const match = threads.find((t) => t.conversation_id === conversationParam);
    if (match) {
      didAutoOpenRef.current = true;
      dispatch(setEmailCurrentThread(match));
      dispatch(fetchEmailMessages({ conversationId: match.conversation_id }));
      if (isMobile) setMobilePanel("thread");
      setSearchParams(
        (p) => {
          p.delete("conversation");
          return p;
        },
        { replace: true },
      );
    }
  }, [conversationParam, threads, dispatch, isMobile, setSearchParams]);

  // Reset auto-open guard when the param changes (new notification click)
  useEffect(() => {
    didAutoOpenRef.current = false;
  }, [conversationParam]);

  // Real-time: subscribe to conversations:all for thread list updates
  useEffect(() => {
    let client: AblyLib.Realtime | null = null;
    let cancelled = false;
    (async () => {
      try {
        const tokenRequest = await dispatch(fetchAblyToken()).unwrap();
        if (cancelled) return;
        client = new AblyLib.Realtime({
          authCallback: (_p, cb) => cb(null, tokenRequest),
        });
        const ch = client.channels.get("conversations:all");
        ch.subscribe("thread-updated", () => {
          dispatch(fetchEmailThreads());
        });
      } catch {
        /* graceful degradation */
      }
    })();
    return () => {
      cancelled = true;
      client?.close();
    };
  }, [dispatch]);

  // Real-time: subscribe to per-conversation channel when thread is open
  useEffect(() => {
    if (!currentThread?.conversation_id) return;
    const convId = currentThread.conversation_id;
    let client: AblyLib.Realtime | null = null;
    let cancelled = false;
    (async () => {
      try {
        const tokenRequest = await dispatch(fetchAblyToken()).unwrap();
        if (cancelled) return;
        client = new AblyLib.Realtime({
          authCallback: (_p, cb) => cb(null, tokenRequest),
        });
        const ch = client.channels.get(`conversation:${convId}`);
        ch.subscribe("new-message", () => {
          dispatch(fetchEmailMessages({ conversationId: convId }));
          dispatch(fetchEmailThreads());
        });
      } catch {
        /* graceful degradation */
      }
    })();
    return () => {
      cancelled = true;
      client?.close();
    };
  }, [currentThread?.conversation_id, dispatch]);

  // Mark related notifications as read when a thread is opened
  useEffect(() => {
    if (!currentThread) return;
    const convId = currentThread.conversation_id;
    const related = notifications.filter(
      (n) =>
        !n.is_read &&
        n.action_url?.includes(`conversation=${encodeURIComponent(convId)}`),
    );
    related.forEach((n) => dispatch(markAsRead(n.id)));
  }, [currentThread, notifications, dispatch]);

  const filteredThreads = threads.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.client_name?.toLowerCase().includes(q) ||
      t.client_email?.toLowerCase().includes(q) ||
      t.last_message_preview?.toLowerCase().includes(q)
    );
  });

  const handleSelectThread = (thread: ConversationThread) => {
    dispatch(setEmailCurrentThread(thread));
    dispatch(fetchEmailMessages({ conversationId: thread.conversation_id }));
    if (isMobile) setMobilePanel("thread");
  };

  const handleSync = async () => {
    if (!activeMailbox) return;
    const result = await dispatch(syncEmailMailbox(activeMailbox.id));
    if (syncEmailMailbox.fulfilled.match(result)) {
      toast({ title: "Inbox synced" });
      dispatch(fetchEmailThreads());
    } else {
      toast({ title: "Sync failed", variant: "destructive" });
    }
  };

  const handleReplySent = useCallback(() => {
    if (currentThread) {
      dispatch(
        fetchEmailMessages({ conversationId: currentThread.conversation_id }),
      );
      dispatch(fetchEmailThreads());
    }
  }, [currentThread, dispatch]);

  const totalUnread = threads.reduce(
    (acc, t) => acc + (t.unread_count || 0),
    0,
  );

  return (
    <>
      <MetaHelmet {...adminPageMeta("Email")} />

      <style>{`
        .email-body a { color: hsl(var(--primary)); text-decoration: underline; }
        .email-body blockquote { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; color: hsl(var(--muted-foreground)); }
        .email-body pre { background: hsl(var(--muted)); border-radius: 6px; padding: 0.75rem; }
        .email-body img { max-width: 100%; border-radius: 6px; }
        .email-body table { border-collapse: collapse; width: 100%; }
        .email-body td, .email-body th { border: 1px solid hsl(var(--border)); padding: 0.4rem 0.6rem; }
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .thread-panel-slide-in { animation: slideInFromRight 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
      `}</style>

      <div className="flex h-full overflow-hidden bg-background">
        {/* Folder Sidebar */}
        <div
          className={cn(
            "flex flex-col border-r border-border bg-card/50",
            isMobile ? "hidden" : "w-52 shrink-0",
          )}
        >
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Email</p>
                {activeMailbox && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {activeMailbox.mailbox_email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {activeMailbox && (
            <div className="px-3 pb-3">
              <Button
                className="w-full gap-2 justify-start"
                size="sm"
                onClick={() => setComposeOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Compose
              </Button>
            </div>
          )}

          <Separator />

          <nav className="flex flex-col gap-0.5 px-2 py-2">
            {FOLDERS.map((f) => (
              <button
                key={f.key}
                onClick={() => dispatch(setEmailFolder(f.key))}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  folder === f.key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                <f.Icon className="h-4 w-4" />
                <span>{f.label}</span>
                {f.key === "inbox" && totalUnread > 0 && (
                  <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px] rounded-full">
                    {totalUnread}
                  </Badge>
                )}
              </button>
            ))}
          </nav>

          <Separator className="my-2" />

          {activeMailbox && (
            <div className="px-3 mt-auto pb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 justify-start text-muted-foreground hover:text-foreground text-xs"
                      onClick={handleSync}
                      disabled={isSyncingMailbox}
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isSyncingMailbox && "animate-spin",
                        )}
                      />
                      {isSyncingMailbox ? "Syncing…" : "Sync now"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {activeMailbox.last_sync_at
                      ? `Last synced ${formatRelativeTime(activeMailbox.last_sync_at)}`
                      : "Never synced"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Thread List */}
        <div
          className={cn(
            "flex flex-col border-r border-border bg-background",
            isMobile
              ? mobilePanel === "list"
                ? "flex w-full"
                : "hidden"
              : "shrink-0",
          )}
          style={!isMobile ? { width: listWidth } : undefined}
        >
          {isLoadingMailboxes ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !activeMailbox ? (
            <NoMailboxScreen />
          ) : (
            <>
              {/* Mobile: branding header with sync button */}
              {isMobile && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none">Email</p>
                    {activeMailbox && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {activeMailbox.mailbox_email}
                      </p>
                    )}
                  </div>
                  {activeMailbox && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={handleSync}
                            disabled={isSyncingMailbox}
                          >
                            <RefreshCw
                              className={cn(
                                "h-4 w-4",
                                isSyncingMailbox && "animate-spin",
                              )}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {activeMailbox.last_sync_at
                            ? `Last synced ${formatRelativeTime(activeMailbox.last_sync_at)}`
                            : "Sync inbox"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}

              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search email…"
                    value={search}
                    onChange={(e) => dispatch(setEmailSearch(e.target.value))}
                    className="pl-8 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  {search && (
                    <button
                      onClick={() => dispatch(setEmailSearch(""))}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {FOLDERS.find((f) => f.key === folder)?.label ?? "Inbox"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {filteredThreads.length}
                  </span>
                  {activeMailbox && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleSync}
                            disabled={isSyncingMailbox}
                            className={cn(
                              "group flex items-center justify-center h-6 w-6 rounded-md transition-all duration-200",
                              "text-muted-foreground/40 hover:text-primary hover:bg-primary/8",
                              "disabled:cursor-not-allowed disabled:opacity-60",
                              isSyncingMailbox && "text-primary",
                            )}
                          >
                            <RefreshCw
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-300",
                                isSyncingMailbox
                                  ? "animate-spin"
                                  : "group-hover:rotate-180",
                              )}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {isSyncingMailbox
                            ? "Syncing…"
                            : activeMailbox.last_sync_at
                              ? `Last synced ${formatRelativeTime(activeMailbox.last_sync_at)}`
                              : "Sync inbox"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1">
                {isLoadingThreads ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                    <MailOpen className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {search ? "No results for that search" : "No emails yet"}
                    </p>
                    {!search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncingMailbox}
                        className="gap-1.5 text-xs"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Sync inbox
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <ThreadItem
                      key={thread.conversation_id}
                      thread={thread}
                      isSelected={
                        currentThread?.conversation_id ===
                        thread.conversation_id
                      }
                      onClick={() => handleSelectThread(thread)}
                    />
                  ))
                )}
                {/* Spacer so last thread isn't hidden behind mobile bottom nav */}
                {isMobile && <div className="h-16" aria-hidden="true" />}
              </ScrollArea>
            </>
          )}
        </div>

        {/* ─── Drag-to-resize handle ─────────────────────────────────────── */}
        {!isMobile && activeMailbox && (
          <div
            onPointerDown={handleResizerPointerDown}
            className="group relative w-1.5 shrink-0 cursor-col-resize select-none z-20"
            title="Drag to resize"
          >
            {/* invisible hit area */}
            <div className="absolute inset-y-0 -left-1 -right-1" />
            {/* visible track */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/50 group-active:bg-primary transition-colors duration-150" />
            {/* handle knob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <span className="h-[5px] w-[5px] rounded-full bg-primary/70" />
              <span className="h-[5px] w-[5px] rounded-full bg-primary/70" />
              <span className="h-[5px] w-[5px] rounded-full bg-primary/70" />
            </div>
          </div>
        )}

        {/* Thread Detail */}
        {activeMailbox && (
          <div
            className={cn(
              "flex flex-col flex-1 min-w-0 bg-background",
              isMobile && mobilePanel === "list" ? "hidden" : "flex",
              isMobile && mobilePanel === "thread" && "thread-panel-slide-in",
            )}
          >
            {!currentThread ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Mail className="h-8 w-8 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground/60">
                    Select a conversation
                  </p>
                  <p className="text-sm">Pick an email thread to read it</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {/* Thread header */}
                <div className="px-5 py-4 border-b border-border flex items-start gap-3 bg-card/50">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 mt-0.5"
                      onClick={() => setMobilePanel("list")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base truncate">
                      {currentThread.client_name ?? currentThread.client_email}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {currentThread.client_email && (
                        <span className="text-xs text-muted-foreground">
                          {currentThread.client_email}
                        </span>
                      )}
                      <Badge
                        variant={
                          currentThread.status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px] capitalize"
                      >
                        {currentThread.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(currentThread.last_message_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-5 py-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">
                      No messages in this thread yet.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                      {messages.map((msg, idx) => (
                        <MessageCard
                          key={msg.id}
                          msg={msg}
                          defaultOpen={idx === messages.length - 1}
                          clientName={currentThread.client_name}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Reply box */}
                <div className="border-t border-border/50 bg-card/30">
                  <ReplyBox
                    thread={currentThread}
                    mailboxId={activeMailbox?.id}
                    mailboxEmail={activeMailbox?.mailbox_email}
                    messages={messages}
                    onSent={handleReplySent}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: Compose FAB — floats above bottom nav */}
      {isMobile && mobilePanel === "list" && activeMailbox && (
        <button
          onClick={() => setComposeOpen(true)}
          aria-label="Compose new email"
          className="fixed bottom-20 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-all duration-150 hover:bg-primary/90"
        >
          <Pencil className="h-5 w-5" />
        </button>
      )}

      {/* Mobile: Bottom tab navigation */}
      {isMobile && mobilePanel === "list" && (
        <MobileBottomNav
          folder={folder}
          totalUnread={totalUnread}
          onFolderChange={(f) => dispatch(setEmailFolder(f))}
        />
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        mailboxEmail={activeMailbox?.mailbox_email}
        mailboxId={activeMailbox?.id}
        isMobile={isMobile}
        defaultReplyTo={
          composeOpen && currentThread
            ? (currentThread.client_email ?? undefined)
            : undefined
        }
      />
    </>
  );
};

export default Email;
