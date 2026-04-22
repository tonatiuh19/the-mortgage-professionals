import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Mail,
  MessageSquare,
  MessageCircle,
  X,
  Loader2,
  FileText,
  Hash,
  User,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClients } from "@/store/slices/clientsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Template {
  id: number;
  name: string;
  template_type: "email" | "sms" | "whatsapp";
  category: string;
  subject?: string | null;
  body: string;
  variables: string[];
}

interface NewConversationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onSendMessage: (data: {
    communication_type: "email" | "sms" | "whatsapp";
    recipient_phone?: string;
    recipient_email?: string;
    subject?: string;
    body: string;
    message_type: "text" | "template";
    template_id?: number;
    client_id?: number;
  }) => Promise<void>;
  isSending: boolean;
}

type ChannelType = "sms" | "whatsapp" | "email";

type SelectedRecipient =
  | {
      kind: "client";
      clientId: number;
      label: string;
      phone?: string;
      email?: string;
    }
  | { kind: "raw_phone"; value: string }
  | { kind: "raw_email"; value: string };

const PHONE_RE = /^[\d\s+\-()+]{7,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const channelMeta: Record<
  ChannelType,
  { label: string; icon: React.ReactNode }
> = {
  sms: { label: "SMS", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
  },
  email: { label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
};

const NewConversationWizard: React.FC<NewConversationWizardProps> = ({
  isOpen,
  onClose,
  templates,
  onSendMessage,
  isSending,
}) => {
  const dispatch = useAppDispatch();
  const { clients, isLoading: clientsLoading } = useAppSelector(
    (s) => s.clients,
  );

  // ── Recipient state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recipient, setRecipient] = useState<SelectedRecipient | null>(null);

  // ── Compose state ────────────────────────────────────────────────────────────
  const [channel, setChannel] = useState<ChannelType>("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // ── Template picker state ─────────────────────────────────────────────────────
  const [templateOpen, setTemplateOpen] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load clients ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchClients({}));
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isOpen, dispatch]);

  // ── Reset on close ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setDropdownOpen(false);
      setRecipient(null);
      setChannel("sms");
      setSubject("");
      setBody("");
      setTemplateOpen(false);
    }
  }, [isOpen]);

  // ── Auto-select best channel when recipient changes ───────────────────────────
  useEffect(() => {
    if (!recipient) return;
    const avail = getAvailableChannels(recipient);
    if (!avail.includes(channel)) {
      setChannel(avail[0] ?? "sms");
    }
    setTimeout(() => textareaRef.current?.focus(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getAvailableChannels = (r: SelectedRecipient): ChannelType[] => {
    if (r.kind === "client") {
      const ch: ChannelType[] = [];
      if (r.phone) ch.push("sms", "whatsapp");
      if (r.email) ch.push("email");
      return ch.length > 0 ? ch : ["sms"];
    }
    if (r.kind === "raw_phone") return ["sms", "whatsapp"];
    if (r.kind === "raw_email") return ["email"];
    return ["sms"];
  };

  const availableChannels: ChannelType[] = recipient
    ? getAvailableChannels(recipient)
    : (["sms", "whatsapp", "email"] as ChannelType[]);

  const filteredClients = clients
    .filter((c) => {
      const q = search.toLowerCase().trim();
      if (!q) return false;
      return (
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const isRawPhone = PHONE_RE.test(search.trim());
  const isRawEmail = EMAIL_RE.test(search.trim());
  const canSendToRaw = isRawPhone || isRawEmail;

  const canSend = Boolean(recipient) && body.trim().length > 0 && !isSending;

  const getRecipientValue = (): {
    phone?: string;
    email?: string;
    clientId?: number;
  } => {
    if (!recipient) return {};
    if (recipient.kind === "client") {
      return {
        clientId: recipient.clientId,
        phone: recipient.phone,
        email: recipient.email,
      };
    }
    if (recipient.kind === "raw_phone") return { phone: recipient.value };
    if (recipient.kind === "raw_email") return { email: recipient.value };
    return {};
  };

  const recipientLabel = (): string => {
    if (!recipient) return "";
    if (recipient.kind === "client") return recipient.label;
    return recipient.value;
  };

  const selectRecipient = (r: SelectedRecipient) => {
    setRecipient(r);
    setSearch("");
    setDropdownOpen(false);
  };

  const clearRecipient = () => {
    setRecipient(null);
    setSearch("");
    setChannel("sms");
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const applyTemplate = (t: Template) => {
    setBody(t.body);
    if (t.subject) setSubject(t.subject);
    if (availableChannels.includes(t.template_type)) {
      setChannel(t.template_type);
    }
    setTemplateOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const rv = getRecipientValue();

    const phoneForChannel =
      channel !== "email" ? (rv.phone ?? undefined) : undefined;
    const emailForChannel =
      channel === "email" ? (rv.email ?? undefined) : undefined;

    if ((channel === "sms" || channel === "whatsapp") && !phoneForChannel) {
      logger.warn("No phone number available for selected channel");
      return;
    }
    if (channel === "email" && !emailForChannel) {
      logger.warn("No email available for selected channel");
      return;
    }

    await onSendMessage({
      communication_type: channel,
      recipient_phone: phoneForChannel,
      recipient_email: emailForChannel,
      subject: channel === "email" ? subject || undefined : undefined,
      body: body.trim(),
      message_type: "text",
      client_id: rv.clientId,
    });
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSend, channel, subject, body, recipient, onSendMessage, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const relevantTemplates = recipient
    ? templates.filter((t) => t.template_type === channel)
    : templates;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-visible rounded-2xl border border-border/60 shadow-2xl bg-background"
        style={{ maxWidth: 520, width: "calc(100vw - 32px)" }}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border/60">
          <h2 className="text-[15px] font-semibold tracking-tight">
            New Message
          </h2>
        </div>

        {/* ── TO field ──────────────────────────────────────────────────────── */}
        <div className="relative px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-3 min-h-[32px]">
            <span className="text-[13px] font-medium text-muted-foreground shrink-0">
              To
            </span>

            {/* Selected recipient chip */}
            {recipient && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-[13px] font-medium">
                {recipientLabel()}
                <button
                  onClick={clearRecipient}
                  className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Search input */}
            {!recipient && (
              <input
                ref={searchInputRef}
                className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground/60 min-w-0"
                placeholder="Search name, phone, or email…"
                value={search}
                autoComplete="off"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => search.length > 0 && setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              />
            )}
          </div>

          {/* ── Dropdown ────────────────────────────────────────────────────── */}
          {dropdownOpen && !recipient && search.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-[60] bg-background border border-border rounded-b-2xl shadow-xl overflow-hidden">
              <ScrollArea className="max-h-60">
                <div className="py-1">
                  {clientsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching…
                    </div>
                  ) : (
                    <>
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                          onMouseDown={() =>
                            selectRecipient({
                              kind: "client",
                              clientId: c.id,
                              label: `${c.first_name} ${c.last_name}`,
                              phone: c.phone ?? undefined,
                              email: c.email,
                            })
                          }
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                            {c.first_name[0]}
                            {c.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium leading-tight">
                              {c.first_name} {c.last_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.phone ?? c.email}
                            </p>
                          </div>
                          {c.phone && (
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                        </button>
                      ))}

                      {/* Send to raw phone / email */}
                      {canSendToRaw && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left",
                            filteredClients.length > 0 &&
                              "border-t border-border/50",
                          )}
                          onMouseDown={() => {
                            const v = search.trim();
                            selectRecipient(
                              isRawPhone
                                ? { kind: "raw_phone", value: v }
                                : { kind: "raw_email", value: v },
                            );
                          }}
                        >
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            {isRawPhone ? (
                              <Hash className="h-4 w-4" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium leading-tight">
                              Send to "{search.trim()}"
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {isRawPhone ? "SMS / WhatsApp" : "Email"} · Not in
                              your contacts
                            </p>
                          </div>
                        </button>
                      )}

                      {filteredClients.length === 0 && !canSendToRaw && (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          <User className="h-8 w-8 mx-auto mb-2 opacity-25" />
                          No clients found.
                          <br />
                          <span className="text-xs">
                            Try a phone number or email.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* ── Channel selector ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border/60 bg-muted/20">
          {(["sms", "whatsapp", "email"] as ChannelType[])
            .filter((ch) => availableChannels.includes(ch))
            .map((ch) => {
              const meta = channelMeta[ch];
              const active = channel === ch;
              const locked = ch === "whatsapp";
              return (
                <button
                  key={ch}
                  onClick={() => !locked && setChannel(ch)}
                  disabled={locked}
                  title={locked ? "WhatsApp coming soon" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-150",
                    locked
                      ? "opacity-40 cursor-not-allowed bg-background text-muted-foreground border border-border/60"
                      : active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background text-muted-foreground hover:bg-muted border border-border/60",
                  )}
                >
                  {meta.icon}
                  {meta.label}
                  {locked && <Lock className="h-3 w-3 ml-0.5" />}
                </button>
              );
            })}

          {/* Template picker */}
          {templates.length > 0 && (
            <div className="ml-auto">
              <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-background text-muted-foreground hover:bg-muted border border-border/60 transition-all">
                    <FileText className="h-3.5 w-3.5" />
                    Templates
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-0" sideOffset={6}>
                  <Command>
                    <CommandInput placeholder="Search templates…" />
                    <CommandList className="max-h-52">
                      <CommandEmpty>No templates found.</CommandEmpty>
                      <CommandGroup>
                        {(relevantTemplates.length > 0
                          ? relevantTemplates
                          : templates
                        ).map((t) => (
                          <CommandItem
                            key={t.id}
                            value={t.name}
                            onSelect={() => applyTemplate(t)}
                            className="flex flex-col items-start gap-0.5 cursor-pointer"
                          >
                            <span className="text-[13px] font-medium">
                              {t.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate w-full">
                              {t.body.substring(0, 60)}…
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* ── Email subject ──────────────────────────────────────────────────── */}
        {channel === "email" && (
          <div className="px-5 py-2.5 border-b border-border/60">
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-0 px-0 text-[13px] h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
            />
          </div>
        )}

        {/* ── Message textarea ───────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              recipient
                ? channel === "email"
                  ? "Write your email…"
                  : "Write a message…"
                : "Select a recipient to start typing…"
            }
            disabled={!recipient}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 resize-none text-[13px] focus-visible:ring-0 p-0 min-h-[128px] bg-transparent placeholder:text-muted-foreground/50 leading-relaxed"
          />
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/60">
          <div>
            {channel === "sms" && body.length > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {body.length} chars · {Math.ceil(body.length / 160)} SMS
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[11px] text-muted-foreground/40 select-none">
              ⌘↵ to send
            </span>
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="sm"
              className="rounded-full px-4 h-9 gap-1.5 bg-primary hover:bg-primary/90 transition-all duration-150"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationWizard;
