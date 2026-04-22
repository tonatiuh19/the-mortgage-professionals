import React, { useEffect, useState, useRef } from "react";
// Ably disabled — real-time via polling only
type AblyRealtime = any;
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  MessageCircle,
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Send,
  Mail,
  MessageSquare,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Archive,
  ArchiveRestore,
  Star,
  Tag,
  ChevronLeft,
  ChevronDown,
  FileText,
  Hash,
  Calendar,
  ExternalLink,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Delete,
  PhoneCall,
  UserPlus,
  Loader2,
  Lock,
  CalendarPlus,
  Copy,
  Check,
  CheckCheck,
  Trash2,
  BookmarkPlus,
  Info,
  Eye,
  EyeOff,
  Sparkles,
  CircleCheck,
  CircleAlert,
  X,
  Download,
  Play,
  Pause,
  Paperclip,
  ImageIcon,
  Film,
  FileAudio,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { uploadMMSMedia } from "@/lib/cdn-upload";
import { MetaHelmet } from "@/components/MetaHelmet";
import ClientDetailPanel from "@/components/ClientDetailPanel";
import BrokerDetailPanel from "@/components/BrokerDetailPanel";
import SaveAsTemplateDialog from "@/components/SaveAsTemplateDialog";
import PhoneNumbersPanel from "@/components/PhoneNumbersPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import NewConversationWizard from "@/components/NewConversationWizard";
import PhoneLink from "@/components/PhoneLink";
import EmailLink from "@/components/EmailLink";
import { adminPageMeta } from "@/lib/seo-helpers";
import {
  buildVarMap,
  resolveVars,
  getVarStatus,
  getTemplateCompatibility,
  sortTemplatesSmart,
  recordTemplateUsed,
  getRecentTemplateIds,
  ALL_VARIABLES,
  CATEGORY_LABELS,
} from "@/lib/template-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchConversationThreads,
  fetchConversationMessages,
  sendMessage,
  deleteMessage,
  fetchConversationTemplates,
  fetchConversationStats,
  fetchCallHistory,
  setCurrentThread,
  setThreadsFilters,
  markConversationAsRead,
  checkWhatsAppAvailability,
  removeThread,
  saveContactFromConversation,
  updateConversation,
  deleteConversation,
  patchMessageRecording,
} from "@/store/slices/conversationsSlice";
import {
  setVoiceAvailable,
  startOutboundCall,
} from "@/store/slices/voiceSlice";
import type { DeviceStatus } from "@/store/slices/voiceSlice";
import { cn } from "@/lib/utils";
import type {
  ConversationThread,
  Communication,
  CallRecord,
} from "@shared/api";

type ChannelFilter = "all" | "sms" | "whatsapp" | "email" | "calls";

const CHANNEL_TABS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "calls", label: "Calls" },
];

const Conversations = () => {
  const dispatch = useAppDispatch();
  const {
    threads,
    currentThread,
    messages,
    templates,
    stats,
    isLoadingThreads,
    isLoadingMessages,
    isSendingMessage,
    isCheckingWhatsApp,
    whatsappAvailability,
    threadsFilters,
    callHistory,
    isLoadingCallHistory,
  } = useAppSelector((state) => state.conversations);

  const currentPhone = currentThread?.client_phone ?? null;
  const whatsappStatus: boolean | null = currentPhone
    ? (whatsappAvailability[currentPhone] ?? null)
    : null;
  const whatsappAvailable =
    whatsappStatus === null ? false : whatsappStatus === true;

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"email" | "sms" | "whatsapp">(
    "sms",
  );
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");
  const [isCallActive, setIsCallActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dialpad state
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialerNumber, setDialerNumber] = useState("");
  const [isDialerCallActive, setIsDialerCallActive] = useState(false);

  // Selected call record for detail view
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [isCallDetailDialing, setIsCallDetailDialing] = useState(false);

  // Client detail panel
  const [detailClientId, setDetailClientId] = useState<number | null>(null);
  // Broker detail panel (for realtor contacts)
  const [detailBrokerId, setDetailBrokerId] = useState<number | null>(null);
  // Save-as-template dialog
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Thread-level archive / delete actions
  // confirmDeleteId: the conversation_id that is in "confirm delete?" state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // threadMenuOpenId: which thread's mobile ⋮ dropdown is open
  const [threadMenuOpenId, setThreadMenuOpenId] = useState<string | null>(null);
  // undoArchive: the thread that was just archived, waiting for undo window
  const undoArchiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [undoArchiveThread, setUndoArchiveThread] =
    useState<ConversationThread | null>(null);

  // Smart compose: live preview + variable autocomplete
  const [showPreview, setShowPreview] = useState(false);
  const [varAutocomplete, setVarAutocomplete] = useState(false);
  const [varAutocompleteFilter, setVarAutocompleteFilter] = useState("");
  const [recentTemplateIds, setRecentTemplateIds] = useState<number[]>(() =>
    getRecentTemplateIds(),
  );
  const composeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Optimistic messages: show immediately while API is in-flight
  type OptimisticMsg = {
    tempId: string;
    body: string;
    subject?: string;
    type: "email" | "sms" | "whatsapp";
    status: "sending" | "sent" | "failed";
    ts: Date;
    /** DB id returned by the send API — used to suppress the optimistic once the real message arrives */
    communicationId?: number;
  };
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMsg[]>(
    [],
  );
  const [failedText, setFailedText] = useState<string | null>(null);
  // MMS attachment state (SMS only)
  const [mmsAttachment, setMmsAttachment] = useState<{
    file: File;
    previewUrl: string;
    contentType: string;
  } | null>(null);
  const [isUploadingMMS, setIsUploadingMMS] = useState(false);
  const mmsFileInputRef = useRef<HTMLInputElement>(null);
  // Track whether this thread has had its messages loaded at least once
  // so background refreshes don't flash the full-area spinner.
  const initialLoadedThreadRef = useRef<string | null>(null);

  // Save unknown contact state
  const [isSaveContactOpen, setIsSaveContactOpen] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [copiedSchedule, setCopiedSchedule] = useState(false);

  const saveContactSchema = Yup.object({
    first_name: Yup.string().required("First name is required"),
    last_name: Yup.string().required("Last name is required"),
    email: Yup.string().email("Invalid email").optional(),
    phone: Yup.string().optional(),
    alternate_phone: Yup.string().optional(),
    date_of_birth: Yup.string().optional(),
    address_street: Yup.string().optional(),
    address_city: Yup.string().optional(),
    address_state: Yup.string().optional(),
    address_zip: Yup.string().optional(),
    employment_status: Yup.string().optional(),
    income_type: Yup.string().optional(),
    annual_income: Yup.number().typeError("Must be a number").optional(),
    credit_score: Yup.number()
      .typeError("Must be a number")
      .min(300)
      .max(850)
      .optional(),
    citizenship_status: Yup.string().optional(),
    add_to_pipeline: Yup.boolean(),
    loan_type: Yup.string().when("add_to_pipeline", {
      is: true,
      then: (s) => s.required("Loan type is required"),
      otherwise: (s) => s.optional(),
    }),
    pipeline_notes: Yup.string().optional(),
  });

  const saveContactFormik = useFormik({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      alternate_phone: "",
      date_of_birth: "",
      address_street: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      employment_status: "",
      income_type: "",
      annual_income: "",
      credit_score: "",
      citizenship_status: "",
      add_to_pipeline: false,
      loan_type: "",
      pipeline_notes: "",
    },
    validationSchema: saveContactSchema,
    onSubmit: async (values, { resetForm }) => {
      if (!currentThread?.conversation_id) return;
      setIsSavingContact(true);
      try {
        const result = await dispatch(
          saveContactFromConversation({
            conversationId: currentThread.conversation_id,
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email || undefined,
            phone: values.phone || undefined,
            alternate_phone: values.alternate_phone || undefined,
            date_of_birth: values.date_of_birth || undefined,
            address_street: values.address_street || undefined,
            address_city: values.address_city || undefined,
            address_state: values.address_state || undefined,
            address_zip: values.address_zip || undefined,
            employment_status: values.employment_status || undefined,
            income_type: (values.income_type as any) || undefined,
            annual_income: values.annual_income
              ? Number(values.annual_income)
              : undefined,
            credit_score: values.credit_score
              ? Number(values.credit_score)
              : undefined,
            citizenship_status: (values.citizenship_status as any) || undefined,
            create_pipeline_draft: values.add_to_pipeline || undefined,
            loan_type: values.add_to_pipeline
              ? (values.loan_type as "purchase" | "refinance")
              : undefined,
            notes: values.pipeline_notes || undefined,
          }),
        );
        if (saveContactFromConversation.fulfilled.match(result)) {
          const hasDraft = !!(result.payload as any).pipeline_draft;
          toast({
            title: "Contact saved",
            description: hasDraft
              ? `${values.first_name} ${values.last_name} added as a client and placed in Draft pipeline.`
              : `${values.first_name} ${values.last_name} added as a client.`,
          });
          setIsSaveContactOpen(false);
          resetForm();
        } else {
          toast({
            title: "Failed to save",
            description: (result.payload as string) || "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsSavingContact(false);
      }
    },
  });

  // Resizable left panel
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(320);

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = leftPanelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientX - startXRef.current;
      const next = Math.min(560, Math.max(240, startWidthRef.current + delta));
      setLeftPanelWidth(next);
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const { sessionToken, user: currentUser } = useAppSelector(
    (s) => s.brokerAuth,
  );
  const varMap = buildVarMap(currentThread, currentUser);
  const isAvailable = useAppSelector((s) => s.voice.isAvailable);
  const deviceStatus = useAppSelector((s) => s.voice.deviceStatus);

  // Phone numbers management
  const [isPhoneNumbersOpen, setIsPhoneNumbersOpen] = useState(false);

  // Client-side channel filtering
  const filteredThreads =
    channelFilter === "all"
      ? threads
      : threads.filter((t) => t.last_message_type === channelFilter);

  // Show all messages regardless of channel — channel tabs only filter the thread list
  const filteredMessages = messages;

  // Auto-scroll to bottom when messages or optimistic messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages, optimisticMessages]);

  // Auto-populate message when template is selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== "none" && templates?.length) {
      const template = templates.find(
        (t) => t.id.toString() === selectedTemplate,
      );
      if (template) {
        setMessageText(template.body || "");
        if (template.subject && messageType === "email") {
          setMessageSubject(template.subject);
        }
      }
    }
  }, [selectedTemplate, templates, messageType]);

  // Clear template when channel changes
  useEffect(() => {
    setSelectedTemplate("");
    setMessageText("");
    setMessageSubject("");
  }, [messageType]);

  // Load initial data
  useEffect(() => {
    dispatch(fetchConversationThreads(threadsFilters));
    dispatch(fetchConversationTemplates(undefined));
    dispatch(fetchConversationStats());
  }, [dispatch]);

  // Load call history when "calls" tab is selected
  useEffect(() => {
    if (channelFilter === "calls") {
      dispatch(fetchCallHistory({}));
    }
  }, [channelFilter, dispatch]);

  // Real-time updates via Ably
  useEffect(() => {
    let realtimeClient: AblyRealtime | null = null;

    const connect = async () => {
      try {
        const token = localStorage.getItem("broker_session");
        const res = await fetch("/api/conversations/ably-token", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const tokenRequest = await res.json();

        const AblyRealtime = (window as any)?.Ably?.Realtime;
        if (!AblyRealtime) return;
        realtimeClient = new AblyRealtime({
          authCallback: (_tokenParams: any, callback: any) =>
            callback(null, tokenRequest),
        });

        // Subscribe to thread-list changes so the sidebar stays fresh
        const allChannel = realtimeClient.channels.get("conversations:all");
        allChannel.subscribe("thread-updated", () => {
          dispatch(fetchConversationThreads(threadsFilters));
        });
        // Another broker claimed an unassigned thread — remove it from our list.
        // If WE claimed it, refresh our threads so the "Unassigned" badge disappears
        // and our name appears instead.
        allChannel.subscribe("thread-claimed", (msg) => {
          const { conversationId, claimedByBrokerId } = (msg.data ?? {}) as {
            conversationId?: string;
            claimedByBrokerId?: number;
          };
          if (conversationId) {
            if (claimedByBrokerId === currentUser?.id) {
              // We claimed it — keep thread but refresh to drop "Unassigned" badge
              dispatch(fetchConversationThreads(threadsFilters));
            } else {
              dispatch(removeThread(conversationId));
            }
          }
        });
      } catch {
        // Real-time unavailable — graceful degradation
      }
    };

    connect();

    return () => {
      realtimeClient?.close();
    };
  }, [dispatch]);

  // Re-subscribe to per-conversation channel when the active thread changes
  useEffect(() => {
    if (!currentThread?.conversation_id) return;

    let realtimeClient: AblyRealtime | null = null;
    const convId = currentThread.conversation_id;

    const subscribe = async () => {
      try {
        const token = localStorage.getItem("broker_session");
        const res = await fetch("/api/conversations/ably-token", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const tokenRequest = await res.json();

        const AblyRt2 = (window as any)?.Ably?.Realtime;
        if (!AblyRt2) return;
        realtimeClient = new AblyRt2({
          authCallback: (_tokenParams: any, callback: any) =>
            callback(null, tokenRequest),
        });
        if (!realtimeClient) return;

        const channel = realtimeClient.channels.get(`conversation:${convId}`);
        channel.subscribe("new-message", () => {
          dispatch(fetchConversationMessages({ conversationId: convId }));
        });
      } catch {
        // Graceful degradation
      }
    };

    subscribe();

    return () => {
      realtimeClient?.close();
    };
  }, [currentThread?.conversation_id, dispatch]);

  // Poll for recording URLs on call messages that are still processing.
  // Twilio takes ~30s–2min after a call ends to transcode and deliver the recording.
  // We poll every 10s for up to 3 minutes, then give up gracefully.
  useEffect(() => {
    const POLL_INTERVAL_MS = 10_000;
    const MAX_POLLS = 18; // 18 × 10s = 3 minutes

    // Find call messages that have a CallSid but no recording URL yet
    const pending = messages.filter(
      (m) =>
        m.communication_type === "call" &&
        m.external_id &&
        !(m as any).recording_url,
    );

    if (pending.length === 0) return;

    const pollCounts: Record<string, number> = {};
    pending.forEach((m) => {
      pollCounts[m.external_id!] = 0;
    });

    const timer = setInterval(async () => {
      const sidsToCheck = Object.keys(pollCounts).filter(
        (sid) => pollCounts[sid] < MAX_POLLS,
      );
      if (sidsToCheck.length === 0) {
        clearInterval(timer);
        return;
      }

      await Promise.all(
        sidsToCheck.map(async (sid) => {
          pollCounts[sid]++;
          try {
            const res = await fetch(`/api/voice/recording-check/${sid}`, {
              headers: { Authorization: `Bearer ${sessionToken}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.ready && data.recording_url) {
              dispatch(
                patchMessageRecording({
                  external_id: sid,
                  recording_url: data.recording_url,
                  recording_duration: data.recording_duration ?? null,
                }),
              );
              // Remove from polling once resolved
              delete pollCounts[sid];
            }
          } catch {
            // Silently ignore network errors — will retry on next tick
          }
        }),
      );
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [messages, sessionToken, dispatch]);

  const handleSelectThread = (thread: ConversationThread) => {
    // Reset initial-load tracker so the new thread shows its spinner
    initialLoadedThreadRef.current = null;
    dispatch(setCurrentThread(thread));
    dispatch(
      fetchConversationMessages({ conversationId: thread.conversation_id }),
    ).finally(() => {
      initialLoadedThreadRef.current = thread.conversation_id;
    });
    setMobilePanel("chat");
    setIsCallActive(false);
    setOptimisticMessages([]);
    setFailedText(null);
    // Close any open contact detail panel so a stale profile isn't shown
    setDetailClientId(null);
    setDetailBrokerId(null);

    if (thread.unread_count > 0) {
      dispatch(markConversationAsRead(thread.conversation_id));
    }

    if (
      thread.client_phone &&
      whatsappAvailability[thread.client_phone] === undefined
    ) {
      dispatch(checkWhatsAppAvailability(thread.client_phone));
    }

    if (messageType === "whatsapp") {
      setMessageType("sms");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    dispatch(setThreadsFilters({ search: query }));
    dispatch(fetchConversationThreads({ ...threadsFilters, search: query }));
  };

  const handleArchiveThread = (
    thread: ConversationThread,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    // Optimistically remove from active list
    dispatch(removeThread(thread.conversation_id));
    if (currentThread?.conversation_id === thread.conversation_id) {
      setMobilePanel("list");
    }
    // Persist archive in background
    dispatch(
      updateConversation({
        conversationId: thread.conversation_id,
        updates: {
          conversation_id: thread.conversation_id,
          status: "archived",
        },
      }),
    );
    // Set up undo
    setUndoArchiveThread(thread);
    if (undoArchiveTimerRef.current) clearTimeout(undoArchiveTimerRef.current);
    undoArchiveTimerRef.current = setTimeout(() => {
      setUndoArchiveThread(null);
    }, 6000);
  };

  const handleUnarchiveThread = (
    thread: ConversationThread,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    dispatch(removeThread(thread.conversation_id));
    dispatch(
      updateConversation({
        conversationId: thread.conversation_id,
        updates: { conversation_id: thread.conversation_id, status: "active" },
      }),
    ).then(() => {
      // Refresh active list so it shows up when user switches back
      dispatch(
        fetchConversationThreads({ ...threadsFilters, status: undefined }),
      );
    });
  };

  const handleUndoArchive = () => {
    if (!undoArchiveThread) return;
    if (undoArchiveTimerRef.current) clearTimeout(undoArchiveTimerRef.current);
    setUndoArchiveThread(null);
    dispatch(
      updateConversation({
        conversationId: undoArchiveThread.conversation_id,
        updates: {
          conversation_id: undoArchiveThread.conversation_id,
          status: "active",
        },
      }),
    ).then(() => dispatch(fetchConversationThreads(threadsFilters)));
  };

  const handleDeleteThread = async (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    dispatch(removeThread(conversationId)); // optimistic
    try {
      await dispatch(deleteConversation(conversationId)).unwrap();
    } catch {
      // On failure, refresh list to restore the thread
      dispatch(fetchConversationThreads(threadsFilters));
      toast({
        title: "Error",
        description: "Could not delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    const filters = status === "all" ? {} : { status };
    dispatch(setThreadsFilters(filters));
    // Explicitly omit any previous status so "all" truly clears it
    const { status: _removed, ...restFilters } = threadsFilters as Record<
      string,
      unknown
    >;
    dispatch(fetchConversationThreads({ ...restFilters, ...filters }));
  };

  const handlePriorityFilter = (priority: string) => {
    setSelectedPriority(priority);
    const filters = priority === "" ? {} : { priority };
    dispatch(setThreadsFilters(filters));
    dispatch(fetchConversationThreads({ ...threadsFilters, ...filters }));
  };

  const handleDeleteMessage = async (messageId: number | string) => {
    if (!currentThread) return;
    try {
      await dispatch(
        deleteMessage({
          conversationId: currentThread.conversation_id,
          messageId,
        }),
      ).unwrap();
    } catch {
      toast({
        title: "Error",
        description: "Could not delete message",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text && !mmsAttachment) return;

    const sentTemplateId =
      selectedTemplate && selectedTemplate !== "none"
        ? parseInt(selectedTemplate)
        : null;

    // 1. Upload MMS attachment first if present (so we have the public URL)
    let uploadedMediaUrl: string | undefined;
    if (mmsAttachment && messageType === "sms") {
      setIsUploadingMMS(true);
      try {
        const result = await uploadMMSMedia(
          mmsAttachment.file,
          sessionToken ?? "",
        );
        uploadedMediaUrl = result.url;
      } catch (err) {
        setIsUploadingMMS(false);
        setFailedText(text || null);
        return;
      }
      setIsUploadingMMS(false);
    }

    // 2. Optimistically add message to the UI immediately
    const tempId = `opt-${Date.now()}`;
    const optimistic: OptimisticMsg = {
      tempId,
      body: text,
      subject: messageType === "email" ? messageSubject : undefined,
      type: messageType,
      status: "sending",
      ts: new Date(),
    };
    setOptimisticMessages((prev) => [...prev, optimistic]);
    setFailedText(null);

    // 3. Clear compose immediately — feels instant
    setMessageText("");
    setMessageSubject("");
    setSelectedTemplate("");
    setShowPreview(false);
    setMmsAttachment(null);

    if (sentTemplateId) {
      recordTemplateUsed(sentTemplateId);
      setRecentTemplateIds(getRecentTemplateIds());
    }

    try {
      const result = await dispatch(
        sendMessage({
          conversation_id: currentThread?.conversation_id,
          application_id: currentThread?.application_id || undefined,
          client_id: currentThread?.client_id || undefined,
          communication_type: messageType,
          recipient_phone: currentThread?.client_phone || undefined,
          recipient_email: currentThread?.client_email || undefined,
          subject: messageType === "email" ? optimistic.subject : undefined,
          body: text,
          message_type: sentTemplateId ? "template" : "text",
          template_id: sentTemplateId ?? undefined,
          media_url: uploadedMediaUrl,
        }),
      ).unwrap();

      // 3. Mark as sent and store the real DB id so we can suppress the
      //    optimistic bubble the moment the real message arrives in Redux state.
      setOptimisticMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId
            ? { ...m, status: "sent", communicationId: result.communication_id }
            : m,
        ),
      );

      if (currentThread) {
        dispatch(
          fetchConversationMessages({
            conversationId: currentThread.conversation_id,
          }),
        ).finally(() => {
          // Remove only after the real message is in Redux state.
          // The render-time deduplication below (communicationId check) prevents
          // the double-flash; this is just a cleanup step.
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.tempId !== tempId),
          );
        });
      } else {
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.tempId !== tempId),
        );
      }
      dispatch(fetchConversationThreads(threadsFilters));
    } catch (error: any) {
      // 5. Mark as failed and restore the text so the user can retry
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...m, status: "failed" } : m)),
      );
      setFailedText(text);
      toast({
        title: "Message failed",
        description: error || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleNewConversation = async (data: {
    communication_type: "email" | "sms" | "whatsapp";
    recipient_phone?: string;
    recipient_email?: string;
    subject?: string;
    body: string;
    message_type: "text" | "template";
    template_id?: number;
    client_id?: number;
  }) => {
    try {
      const result = await dispatch(sendMessage(data)).unwrap();
      const conversationId = result.conversation_id;

      // Refresh thread list in background
      dispatch(fetchConversationThreads(threadsFilters));

      // Immediately load the new conversation so the user sees it without
      // having to manually find and click on it in the sidebar.
      if (conversationId) {
        await dispatch(fetchConversationMessages({ conversationId })).unwrap();
        setMobilePanel("chat");
      }

      toast({ title: "Success", description: "New conversation started" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "normal":
        return "bg-primary/10 text-primary border-primary/20";
      case "low":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getChannelIcon = (type: string, className = "h-4 w-4") => {
    switch (type) {
      case "email":
        return <Mail className={className} />;
      case "sms":
        return <MessageSquare className={className} />;
      case "whatsapp":
        return <FaWhatsapp className={className} />;
      case "call":
        return <Phone className={className} />;
      default:
        return <MessageCircle className={className} />;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case "email":
        return "text-blue-500";
      case "sms":
        return "text-primary";
      case "whatsapp":
        return "text-[#25D366]";
      default:
        return "text-muted-foreground";
    }
  };

  const formatTime = (date: string) => {
    // MySQL returns UTC timestamps without timezone indicator — force UTC parsing
    const normalized =
      /[Zz+\-]\d{2}:?\d{2}$/.test(date) || date.endsWith("Z")
        ? date
        : date.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    const now = new Date();
    const tz = currentUser?.timezone || undefined;
    const isToday =
      d.toLocaleDateString("en-US", { timeZone: tz }) ===
      now.toLocaleDateString("en-US", { timeZone: tz });
    if (isToday) {
      return d.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz,
      });
    }
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  };

  const getInitials = (name?: string | null) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const parseCallDuration = (body: string): string => {
    const match = body.match(/(\d+)s/);
    if (!match) return "";
    const secs = parseInt(match[1], 10);
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const parseCallStatus = (body: string): string => {
    const match = body.match(/\(([^)]+)\)/);
    return match ? match[1] : "completed";
  };

  const getDateLabel = (date: string) => {
    const normalized =
      /[Zz+\-]\d{2}:?\d{2}$/.test(date) || date.endsWith("Z")
        ? date
        : date.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <MetaHelmet
        {...adminPageMeta(
          "Conversations",
          "Manage client communications via SMS, WhatsApp, and Email",
        )}
      />

      {/* Header */}
      <PageHeader
        variant="toolbar"
        icon={
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
        }
        title="Conversations"
        description="Manage client communications via SMS, WhatsApp & Email"
        mobileBack={
          mobilePanel === "chat" ? () => setMobilePanel("list") : undefined
        }
        actions={
          <>
            {/* Availability toggle */}
            <button
              onClick={() => dispatch(setVoiceAvailable(!isAvailable))}
              className={cn(
                "flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200",
                isAvailable && deviceStatus === "registered"
                  ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                  : isAvailable && deviceStatus === "connecting"
                    ? "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    : isAvailable && deviceStatus === "error"
                      ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80",
              )}
              title={
                !isAvailable
                  ? "Click to go available"
                  : deviceStatus === "registered"
                    ? "Reachable — click to go offline"
                    : deviceStatus === "connecting"
                      ? "Connecting VoIP…"
                      : deviceStatus === "error"
                        ? "VoIP connection failed — click to retry"
                        : "Click to go offline"
              }
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full flex-shrink-0",
                  isAvailable && deviceStatus === "registered"
                    ? "bg-green-500 animate-pulse"
                    : isAvailable && deviceStatus === "connecting"
                      ? "bg-yellow-400 animate-pulse"
                      : isAvailable && deviceStatus === "error"
                        ? "bg-red-500"
                        : "bg-muted-foreground",
                )}
              />
              <span className="hidden sm:inline">
                {!isAvailable
                  ? "Unavailable"
                  : deviceStatus === "registered"
                    ? "Available"
                    : deviceStatus === "connecting"
                      ? "Connecting…"
                      : deviceStatus === "error"
                        ? "VoIP Error"
                        : "Available"}
              </span>
            </button>

            {/* Phone numbers settings — icon only on mobile */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs px-2 md:px-3"
              onClick={() => setIsPhoneNumbersOpen(true)}
              title="Manage phone numbers"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Phone Numbers</span>
            </Button>

            {/* Dialpad toggle */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs px-2 md:px-3",
                isDialerOpen
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "",
              )}
              onClick={() => {
                setIsDialerOpen((v) => !v);
                setIsDialerCallActive(false);
                setDialerNumber("");
              }}
              title="Open dialpad"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dial</span>
            </Button>

            {/* New conversation — icon only on mobile */}
            <Button
              onClick={() => setIsNewConversationOpen(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 h-8 px-2 md:px-3 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </>
        }
      />

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Thread list / Call history */}
        <div
          className={cn(
            "flex-shrink-0 border-r border-border flex flex-col bg-card relative",
            mobilePanel === "chat" ? "hidden md:flex" : "flex w-full",
          )}
          style={isMobile ? undefined : { width: leftPanelWidth }}
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Search + filter */}
            <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
                {channelFilter !== "calls" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {["all", "active", "closed"].map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleStatusFilter(s)}
                          className={cn(
                            selectedStatus === s &&
                              "bg-primary/10 text-primary",
                          )}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {["", "low", "normal", "high", "urgent"].map((p) => (
                        <DropdownMenuItem
                          key={p}
                          onClick={() => handlePriorityFilter(p)}
                          className={cn(
                            selectedPriority === p &&
                              "bg-primary/10 text-primary",
                          )}
                        >
                          {p
                            ? p.charAt(0).toUpperCase() + p.slice(1)
                            : "All Priorities"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => dispatch(fetchCallHistory({}))}
                    title="Refresh call history"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        isLoadingCallHistory && "animate-spin",
                      )}
                    />
                  </Button>
                )}
              </div>

              {/* Channel tabs — scrollable on mobile */}
              <div className="flex rounded-lg bg-muted p-0.5 gap-0.5 overflow-x-auto scrollbar-hide">
                {CHANNEL_TABS.map(({ key, label }) => {
                  const locked = key === "whatsapp";
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (locked) return;
                        setChannelFilter(key);
                        if (key !== "calls") setSelectedCall(null);
                      }}
                      disabled={locked}
                      title={locked ? "WhatsApp coming soon" : undefined}
                      className={cn(
                        "flex-1 min-w-[2.5rem] inline-flex items-center justify-center gap-1 text-xs font-medium py-1 px-2 rounded-md transition-all whitespace-nowrap",
                        locked
                          ? "opacity-40 cursor-not-allowed text-muted-foreground"
                          : channelFilter === key
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="sm:hidden">
                        {key === "whatsapp" ? "WA" : label}
                      </span>
                      <span className="hidden sm:inline">{label}</span>
                      {locked && <Lock className="h-2.5 w-2.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thread list / Call history */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {channelFilter === "calls" ? (
                  /* ── Call History ── */
                  isLoadingCallHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : callHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Phone className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No call history yet</p>
                    </div>
                  ) : (
                    callHistory.map((call) => {
                      const isInbound = call.direction === "inbound";
                      const callStatus = parseCallStatus(call.body);
                      const duration = parseCallDuration(call.body);
                      const isMissed =
                        callStatus === "no-answer" || callStatus === "failed";
                      const isSelected = selectedCall?.id === call.id;
                      return (
                        <div
                          key={call.id}
                          onClick={() => {
                            setSelectedCall(isSelected ? null : call);
                            setIsCallDetailDialing(false);
                            setMobilePanel("chat");
                          }}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all duration-150",
                            isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "border-transparent hover:bg-muted hover:border-border",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                "p-2 rounded-full flex-shrink-0 mt-0.5",
                                isMissed
                                  ? "bg-red-100"
                                  : isInbound
                                    ? "bg-green-100"
                                    : "bg-primary/10",
                              )}
                            >
                              {isMissed ? (
                                <PhoneMissed className="h-3.5 w-3.5 text-red-500" />
                              ) : isInbound ? (
                                <PhoneIncoming className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <PhoneOutgoing className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {call.client_name ||
                                    call.client_phone ||
                                    "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground flex-shrink-0">
                                  {formatTime(call.created_at)}
                                </p>
                              </div>
                              {call.client_phone && call.client_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {call.client_phone}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    isMissed
                                      ? "text-red-600"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {isInbound ? "Inbound" : "Outbound"}
                                </span>
                                {duration && (
                                  <>
                                    <span className="text-xs text-muted-foreground">
                                      ·
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {duration}
                                    </span>
                                  </>
                                )}
                                {isMissed && (
                                  <span className="text-xs text-red-500 font-medium">
                                    Missed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : /* ── Thread list ── */
                isLoadingThreads ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {selectedStatus === "archived"
                        ? "No archived conversations"
                        : `No ${
                            channelFilter !== "all"
                              ? channelFilter.toUpperCase() + " "
                              : ""
                          }conversations`}
                    </p>
                    {selectedStatus === "archived" && (
                      <button
                        type="button"
                        onClick={() => handleStatusFilter("all")}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <Archive className="h-3.5 w-3.5" />← Back to
                        conversations
                      </button>
                    )}
                  </div>
                ) : (
                  <TooltipProvider delayDuration={400}>
                    {/* Archived-mode banner */}
                    {selectedStatus === "archived" && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                        <Archive className="h-3.5 w-3.5 shrink-0" />
                        <p className="text-xs flex-1 font-medium">
                          Archived conversations
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStatusFilter("all")}
                          className="text-xs font-semibold hover:underline shrink-0"
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                    {filteredThreads.map((thread) => {
                      const isConfirmingDelete =
                        confirmDeleteId === thread.conversation_id;
                      const isActive =
                        currentThread?.conversation_id ===
                        thread.conversation_id;

                      // ── Confirm-delete mode ────────────────────────────────
                      if (isConfirmingDelete) {
                        return (
                          <div
                            key={thread.id}
                            className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 animate-in fade-in-0 slide-in-from-left-1"
                          >
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                              <p className="text-xs text-foreground flex-1 min-w-0 truncate">
                                Delete{" "}
                                <span className="font-semibold">
                                  {thread.client_name || "this conversation"}
                                </span>{" "}
                                forever?
                              </p>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs flex-1"
                                onClick={(e) =>
                                  handleDeleteThread(thread.conversation_id, e)
                                }
                              >
                                Delete forever
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      // ── Normal thread row ──────────────────────────────────
                      return (
                        <div
                          key={thread.id}
                          onClick={() => handleSelectThread(thread)}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all duration-150 group relative",
                            isActive
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted border border-transparent hover:border-border",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-semibold",
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground",
                                )}
                              >
                                {getInitials(thread.client_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              {/* Row 1: name + badges / actions */}
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {thread.client_name || "Unknown Client"}
                                </p>

                                {/* ── Desktop: badges hidden on hover, action icons shown on hover ── */}
                                <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                                  {/* Badges — hidden on group-hover */}
                                  <div className="flex items-center gap-1 group-hover:hidden">
                                    {!thread.broker_id && (
                                      <span className="bg-amber-100 text-amber-700 text-[10px] rounded px-1.5 py-0.5 font-semibold leading-none border border-amber-300">
                                        Unassigned
                                      </span>
                                    )}
                                    {thread.unread_count > 0 && (
                                      <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">
                                        {thread.unread_count}
                                      </span>
                                    )}
                                    {(thread.priority === "urgent" ||
                                      thread.priority === "high") && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] py-0 px-1 leading-none",
                                          getPriorityColor(thread.priority),
                                        )}
                                      >
                                        {thread.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Action icons — shown on group-hover */}
                                  <div className="hidden group-hover:flex items-center gap-0.5">
                                    {selectedStatus === "archived" ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              handleUnarchiveThread(thread, e)
                                            }
                                            className="p-1 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                          >
                                            <ArchiveRestore className="h-3.5 w-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          Unarchive
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              handleArchiveThread(thread, e)
                                            }
                                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                                          >
                                            <Archive className="h-3.5 w-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[180px] text-center"
                                        >
                                          Archive — auto-deleted after 7 days
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteId(
                                              thread.conversation_id,
                                            );
                                          }}
                                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        Delete forever
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>

                                {/* ── Mobile: badges + permanent ⋮ dropdown ── */}
                                <div className="flex md:hidden items-center gap-1 flex-shrink-0">
                                  {!thread.broker_id && (
                                    <span className="bg-amber-100 text-amber-700 text-[10px] rounded px-1.5 py-0.5 font-semibold leading-none border border-amber-300">
                                      Unassigned
                                    </span>
                                  )}
                                  {thread.unread_count > 0 && (
                                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">
                                      {thread.unread_count}
                                    </span>
                                  )}
                                  {(thread.priority === "urgent" ||
                                    thread.priority === "high") && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] py-0 px-1 leading-none",
                                        getPriorityColor(thread.priority),
                                      )}
                                    >
                                      {thread.priority}
                                    </Badge>
                                  )}
                                  <DropdownMenu
                                    open={
                                      threadMenuOpenId ===
                                      thread.conversation_id
                                    }
                                    onOpenChange={(open) =>
                                      setThreadMenuOpenId(
                                        open ? thread.conversation_id : null,
                                      )
                                    }
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-44"
                                    >
                                      {selectedStatus === "archived" ? (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setThreadMenuOpenId(null);
                                            handleUnarchiveThread(thread, e);
                                          }}
                                          className="gap-2 text-sm text-emerald-700 focus:text-emerald-700"
                                        >
                                          <ArchiveRestore className="h-4 w-4" />
                                          Unarchive
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setThreadMenuOpenId(null);
                                            handleArchiveThread(thread, e);
                                          }}
                                          className="gap-2 text-sm"
                                        >
                                          <Archive className="h-4 w-4 text-muted-foreground" />
                                          Archive
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setThreadMenuOpenId(null);
                                          setConfirmDeleteId(
                                            thread.conversation_id,
                                          );
                                        }}
                                        className="gap-2 text-sm text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete forever
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              {/* Row 2: channel icon + preview */}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={cn(
                                    "flex-shrink-0",
                                    getChannelColor(thread.last_message_type),
                                  )}
                                >
                                  {getChannelIcon(
                                    thread.last_message_type,
                                    "h-3 w-3",
                                  )}
                                </span>
                                <p className="text-xs text-muted-foreground line-clamp-1 flex-1 leading-snug">
                                  {thread.last_message_preview ||
                                    "No messages yet"}
                                </p>
                              </div>
                              {/* Row 3: timestamp */}
                              {thread.last_message_at && (
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                  {formatTime(thread.last_message_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </TooltipProvider>
                )}
              </div>
            </ScrollArea>

            {/* Archive toggle footer */}
            {selectedStatus !== "archived" && (
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => handleStatusFilter("archived")}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>View archived conversations</span>
                </button>
              </div>
            )}

            {/* Undo archive toast (floating, bottom of sidebar) */}
            {undoArchiveThread && (
              <div className="absolute bottom-3 left-3 right-3 z-20 animate-in slide-in-from-bottom-2 fade-in-0">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card shadow-lg px-3 py-2.5">
                  <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-foreground flex-1 truncate">
                    <span className="font-medium">
                      {undoArchiveThread.client_name || "Conversation"}
                    </span>{" "}
                    archived
                  </p>
                  <button
                    type="button"
                    onClick={handleUndoArchive}
                    className="text-xs font-semibold text-primary hover:underline shrink-0"
                  >
                    Undo
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* end flex flex-col h-full */}

          {/* Drag-to-resize handle — desktop only */}
          <div
            onMouseDown={handleResizeStart}
            className="hidden md:flex absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize items-center justify-center group z-10 hover:bg-primary/20 transition-colors"
            title="Drag to resize"
          >
            <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
          </div>
        </div>

        {/* Center: Messages */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background overflow-hidden",
            mobilePanel === "list" ? "hidden md:flex" : "flex",
          )}
        >
          {currentThread ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border bg-card flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-7 w-7"
                      onClick={() => setMobilePanel("list")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getInitials(currentThread.client_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {currentThread.client_name || "Unknown Client"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {currentThread.client_phone && (
                          <PhoneLink
                            phone={currentThread.client_phone}
                            clientName={currentThread.client_name}
                            clientId={currentThread.client_id}
                            className="text-xs text-muted-foreground"
                          />
                        )}
                        {currentThread.client_email && (
                          <EmailLink
                            email={currentThread.client_email}
                            className="text-xs text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {currentThread.client_phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 gap-1.5 text-xs",
                          isCallActive
                            ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                            : "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                        )}
                        onClick={() => setIsCallActive((v) => !v)}
                        title={isCallActive ? "Hide call panel" : "Call client"}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {isCallActive ? "In call" : "Call"}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!currentThread.client_id && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                saveContactFormik.resetForm();
                                setIsSaveContactOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add as Contact
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem>
                          <Star className="h-4 w-4 mr-2" />
                          Mark as Important
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Tag className="h-4 w-4 mr-2" />
                          Add Tags
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Active call panel */}
              {isCallActive &&
                currentThread.client_phone &&
                (() => {
                  // Delegate to GlobalVoiceManager's persistent panel and dismiss local flag
                  dispatch(
                    startOutboundCall({
                      phone: currentThread.client_phone,
                      clientName: currentThread.client_name,
                      clientId: currentThread.client_id ?? undefined,
                      applicationId: currentThread.application_id ?? undefined,
                    }),
                  );
                  setIsCallActive(false);
                  return null;
                })()}

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-4">
                {isLoadingMessages &&
                initialLoadedThreadRef.current !==
                  currentThread.conversation_id ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredMessages.length === 0 &&
                  optimisticMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      No{" "}
                      {channelFilter !== "all"
                        ? channelFilter.toUpperCase()
                        : ""}{" "}
                      messages yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {[...filteredMessages]
                      .reverse()
                      .map((message, index, arr) => {
                        const msgDate = message.sent_at || message.created_at;
                        const prevMsg = arr[index - 1];
                        const prevDate = prevMsg
                          ? prevMsg.sent_at || prevMsg.created_at
                          : null;
                        const showDateSep =
                          msgDate &&
                          (!prevDate ||
                            new Date(msgDate).toDateString() !==
                              new Date(prevDate).toDateString());
                        const isOutbound = message.direction === "outbound";

                        // Delivery tick helper
                        const DeliveryTick = () => {
                          if (!isOutbound) return null;
                          const ds = message.delivery_status;
                          if (ds === "read") {
                            return (
                              <CheckCheck className="h-3 w-3 text-sky-400" />
                            );
                          }
                          if (ds === "delivered") {
                            return (
                              <CheckCheck className="h-3 w-3 text-white/60" />
                            );
                          }
                          if (ds === "failed" || ds === "rejected") {
                            return <X className="h-3 w-3 text-red-400" />;
                          }
                          // sent / pending
                          return <Check className="h-3 w-3 text-white/50" />;
                        };

                        return (
                          <React.Fragment key={message.id}>
                            {showDateSep && msgDate && (
                              <div className="flex items-center gap-3 py-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground font-medium px-2 bg-background">
                                  {getDateLabel(msgDate)}
                                </span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex mb-2 group",
                                isOutbound ? "justify-end" : "justify-start",
                              )}
                            >
                              {isOutbound && (
                                <button
                                  onClick={() =>
                                    handleDeleteMessage(message.id)
                                  }
                                  className="opacity-0 group-hover:opacity-100 transition-opacity mr-1.5 self-center p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <div
                                className={cn(
                                  "max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm",
                                  isOutbound
                                    ? "bg-slate-800 text-white rounded-br-sm"
                                    : "bg-muted text-foreground rounded-bl-sm border border-border",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-1.5 mb-1",
                                    isOutbound
                                      ? "text-white/60"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      isOutbound
                                        ? "text-white/70"
                                        : getChannelColor(
                                            message.communication_type,
                                          ),
                                    )}
                                  >
                                    {getChannelIcon(
                                      message.communication_type,
                                      "h-3 w-3",
                                    )}
                                  </span>
                                  <span className="text-xs">
                                    {msgDate ? formatTime(msgDate) : ""}
                                  </span>
                                </div>
                                {message.subject && (
                                  <p className="font-semibold text-xs mb-1 opacity-90">
                                    {message.subject}
                                  </p>
                                )}
                                {/* Call recordings get an inline audio player + download */}
                                {message.communication_type === "call" &&
                                message.recording_url &&
                                message.external_id ? (
                                  /* ✅ Recording is ready */
                                  <div className="flex flex-col gap-2 min-w-[220px]">
                                    <p className="leading-relaxed text-sm">
                                      {message.body}
                                    </p>
                                    {/* token query param required — <audio> can't send Authorization header */}
                                    <audio
                                      controls
                                      preload="metadata"
                                      className="w-full h-8 rounded"
                                      style={{
                                        colorScheme: isOutbound
                                          ? "dark"
                                          : "light",
                                      }}
                                      src={`/api/voice/recording/${message.external_id}?token=${encodeURIComponent(sessionToken ?? "")}`}
                                    />
                                    <a
                                      href={`/api/voice/recording/${message.external_id}?download=1&token=${encodeURIComponent(sessionToken ?? "")}`}
                                      download={`call-${message.external_id}.mp3`}
                                      className={cn(
                                        "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium transition-colors",
                                        isOutbound
                                          ? "bg-white/10 text-white/80 hover:bg-white/20"
                                          : "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20",
                                      )}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Download recording
                                    </a>
                                  </div>
                                ) : message.communication_type === "call" &&
                                  message.external_id &&
                                  !(message as any).recording_url ? (
                                  /* ⏳ Call ended but recording still processing */
                                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                                    <p className="leading-relaxed text-sm">
                                      {message.body}
                                    </p>
                                    <div
                                      className={cn(
                                        "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5",
                                        isOutbound
                                          ? "bg-white/10 text-white/50"
                                          : "bg-muted-foreground/10 text-muted-foreground",
                                      )}
                                    >
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Recording processing…
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {/* MMS media attachment */}
                                    {(message as any).media_url &&
                                      (() => {
                                        const rawUrl: string = (message as any)
                                          .media_url;
                                        const contentType: string =
                                          (message as any).media_content_type ??
                                          "";
                                        // Support JSON array (multiple attachments) or single URL
                                        let urls: string[];
                                        try {
                                          urls = JSON.parse(rawUrl);
                                        } catch {
                                          urls = [rawUrl];
                                        }
                                        const proxyUrl = (u: string) =>
                                          // CDN URLs are already public — serve directly
                                          // Twilio media URLs need our auth proxy
                                          u.startsWith(
                                            "https://disruptinglabs.com/",
                                          )
                                            ? u
                                            : `/api/sms/media?url=${encodeURIComponent(u)}&token=${encodeURIComponent(sessionToken ?? "")}`;
                                        return urls.map((u, i) => {
                                          const ct = i === 0 ? contentType : "";
                                          if (
                                            ct.startsWith("image/") ||
                                            (!ct &&
                                              /\.(jpe?g|png|gif|webp|heic)$/i.test(
                                                u,
                                              ))
                                          ) {
                                            return (
                                              <a
                                                key={i}
                                                href={proxyUrl(u)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                <img
                                                  src={proxyUrl(u)}
                                                  alt="MMS attachment"
                                                  className="rounded-xl max-w-[260px] max-h-[320px] object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                                  loading="lazy"
                                                />
                                              </a>
                                            );
                                          }
                                          if (ct.startsWith("video/")) {
                                            return (
                                              <video
                                                key={i}
                                                controls
                                                className="rounded-xl max-w-[260px]"
                                                preload="metadata"
                                              >
                                                <source
                                                  src={proxyUrl(u)}
                                                  type={ct}
                                                />
                                              </video>
                                            );
                                          }
                                          if (ct.startsWith("audio/")) {
                                            return (
                                              <audio
                                                key={i}
                                                controls
                                                preload="metadata"
                                                className="w-full h-8 rounded"
                                              >
                                                <source
                                                  src={proxyUrl(u)}
                                                  type={ct}
                                                />
                                              </audio>
                                            );
                                          }
                                          return (
                                            <a
                                              key={i}
                                              href={proxyUrl(u)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={cn(
                                                "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium transition-colors",
                                                isOutbound
                                                  ? "bg-white/10 text-white/80 hover:bg-white/20"
                                                  : "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20",
                                              )}
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              Download attachment
                                            </a>
                                          );
                                        });
                                      })()}
                                    {/* Text body (may be empty for image-only MMS) */}
                                    {message.body ? (
                                      <p className="leading-relaxed">
                                        {message.body}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                                {isOutbound && (
                                  <div className="flex justify-end mt-1">
                                    <DeliveryTick />
                                  </div>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}

                    {/* Optimistic (in-flight / just-sent) bubbles.
                         Skip any whose real message has already arrived in Redux
                         state — identified by communicationId — to avoid a
                         double-flash while the .finally() cleanup runs. */}
                    {optimisticMessages
                      .filter(
                        (opt) =>
                          !opt.communicationId ||
                          !messages.some((m) => m.id === opt.communicationId),
                      )
                      .map((opt) => (
                        <div key={opt.tempId} className="flex mb-2 justify-end">
                          <div
                            className={cn(
                              "max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm rounded-br-sm transition-opacity",
                              opt.status === "failed"
                                ? "bg-red-900/80 text-white/80"
                                : "bg-slate-800 text-white",
                              opt.status === "sending" && "opacity-70",
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-white/60">
                              <span className="text-white/70">
                                {getChannelIcon(opt.type, "h-3 w-3")}
                              </span>
                              <span className="text-xs">
                                {opt.ts.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            {opt.subject && (
                              <p className="font-semibold text-xs mb-1 opacity-90">
                                {opt.subject}
                              </p>
                            )}
                            <p className="leading-relaxed">{opt.body}</p>
                            <div className="flex justify-end mt-1">
                              {opt.status === "sending" && (
                                <Check className="h-3 w-3 text-white/30" />
                              )}
                              {opt.status === "sent" && (
                                <CheckCheck className="h-3 w-3 text-white/60 animate-in fade-in-0 zoom-in-75 duration-300" />
                              )}
                              {opt.status === "failed" && (
                                <X className="h-3 w-3 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Composer */}
              <div className="p-3 border-t border-border bg-card flex-shrink-0">
                {/* Row 1: Channel + Smart Template picker */}
                <div className="flex items-center gap-2 mb-2">
                  <Select
                    value={messageType}
                    onValueChange={(v: any) => setMessageType(v)}
                  >
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          SMS
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="whatsapp"
                        disabled={!whatsappAvailable}
                      >
                        <div className="flex items-center gap-2">
                          <FaWhatsapp
                            className={cn(
                              "h-3.5 w-3.5",
                              whatsappAvailable
                                ? "text-[#25D366]"
                                : "opacity-40",
                            )}
                          />
                          <span
                            className={cn(!whatsappAvailable && "opacity-40")}
                          >
                            WhatsApp
                          </span>
                          {isCheckingWhatsApp && currentPhone && (
                            <span className="text-xs text-muted-foreground ml-1">
                              checking…
                            </span>
                          )}
                          {!isCheckingWhatsApp && whatsappStatus === false && (
                            <span className="text-xs text-muted-foreground ml-1">
                              unavailable
                            </span>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          Email
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Smart template picker */}
                  <Popover
                    open={templatePickerOpen}
                    onOpenChange={setTemplatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-sm flex-1 justify-between font-normal"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">
                            {selectedTemplate && selectedTemplate !== "none"
                              ? (templates?.find(
                                  (t) => t.id.toString() === selectedTemplate,
                                )?.name ?? "Use template…")
                              : "Use template…"}
                          </span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-80 p-0"
                      sideOffset={4}
                    >
                      <Command>
                        <CommandInput
                          placeholder="Search templates…"
                          className="h-8"
                        />
                        <CommandList className="max-h-72">
                          <CommandEmpty>No templates found.</CommandEmpty>

                          {/* Clear current selection */}
                          {selectedTemplate && selectedTemplate !== "none" && (
                            <CommandGroup>
                              <CommandItem
                                value="__clear__"
                                onSelect={() => {
                                  setSelectedTemplate("");
                                  setMessageText("");
                                  setMessageSubject("");
                                  setTemplatePickerOpen(false);
                                }}
                                className="text-muted-foreground italic text-xs"
                              >
                                ✕ Clear template
                              </CommandItem>
                            </CommandGroup>
                          )}

                          {/* Smart-sorted, category-grouped templates */}
                          {(() => {
                            const channelTemplates = (templates ?? []).filter(
                              (t) => t.template_type === messageType,
                            );
                            const sorted = sortTemplatesSmart(
                              channelTemplates,
                              varMap,
                              recentTemplateIds,
                            );
                            const recentSet = new Set(recentTemplateIds);
                            const recent = sorted.filter((t) =>
                              recentSet.has(t.id),
                            );
                            const rest = sorted.filter(
                              (t) => !recentSet.has(t.id),
                            );

                            // Group remaining by category
                            const byCategory: Record<string, typeof rest> = {};
                            for (const t of rest) {
                              if (!byCategory[t.category])
                                byCategory[t.category] = [];
                              byCategory[t.category].push(t);
                            }

                            const renderItem = (t: (typeof sorted)[0]) => {
                              const { resolved, total, score } =
                                getTemplateCompatibility(t, varMap);
                              const hasVars = total > 0;
                              return (
                                <CommandItem
                                  key={t.id}
                                  value={`${t.name} ${t.body.slice(0, 40)}`}
                                  onSelect={() => {
                                    setSelectedTemplate(t.id.toString());
                                    setMessageText(t.body || "");
                                    if (t.subject && messageType === "email")
                                      setMessageSubject(t.subject);
                                    setTemplatePickerOpen(false);
                                  }}
                                  className="flex items-start gap-2 cursor-pointer py-2"
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {hasVars ? (
                                      score >= 1 ? (
                                        <CircleCheck className="h-3.5 w-3.5 text-green-500" />
                                      ) : (
                                        <CircleAlert className="h-3.5 w-3.5 text-amber-500" />
                                      )
                                    ) : (
                                      <CircleCheck className="h-3.5 w-3.5 text-muted-foreground/30" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[13px] font-medium truncate">
                                        {t.name}
                                      </span>
                                      {(t.usage_count ?? 0) > 0 && (
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                          ×{t.usage_count}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                                      {t.body.substring(0, 60)}
                                      {t.body.length > 60 ? "…" : ""}
                                    </span>
                                    {hasVars && score < 1 && (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                        {resolved}/{total} vars resolve
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            };

                            return (
                              <>
                                {recent.length > 0 && (
                                  <CommandGroup heading="Recently Used">
                                    {recent.map(renderItem)}
                                  </CommandGroup>
                                )}
                                {Object.entries(byCategory).map(
                                  ([cat, catTemplates]) => (
                                    <CommandGroup
                                      key={cat}
                                      heading={CATEGORY_LABELS[cat] ?? cat}
                                    >
                                      {catTemplates.map(renderItem)}
                                    </CommandGroup>
                                  ),
                                )}
                              </>
                            );
                          })()}

                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              value="__save_as_template__"
                              disabled={!messageText.trim()}
                              onSelect={() => {
                                if (!messageText.trim()) return;
                                setTemplatePickerOpen(false);
                                setSaveTemplateOpen(true);
                              }}
                              className="gap-2 text-primary data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
                            >
                              <BookmarkPlus className="h-4 w-4" />
                              Save current message as template
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Email subject */}
                {messageType === "email" && (
                  <Input
                    placeholder="Subject"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="mb-2 h-8 text-sm"
                  />
                )}

                {/* Smart variable preview banner */}
                {(() => {
                  const varStatuses = getVarStatus(messageText, varMap);
                  if (varStatuses.length === 0) return null;
                  return (
                    <div className="rounded-md border border-border bg-card px-3 py-2 mb-1.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[11px] font-medium text-foreground">
                          Variable preview
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {varStatuses.map(({ name, value, resolved }) => (
                          <span
                            key={name}
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-mono border",
                              resolved
                                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                                : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
                            )}
                          >
                            {resolved ? (
                              <CircleCheck className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <CircleAlert className="h-2.5 w-2.5 shrink-0" />
                            )}
                            {`{{${name}}}`}
                            {resolved && (
                              <>
                                <span className="opacity-40 mx-0.5">→</span>
                                <span className="font-sans font-medium">
                                  {value}
                                </span>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Variable autocomplete dropdown */}
                {varAutocomplete && (
                  <div className="mb-1.5 rounded-md border border-border bg-popover shadow-md p-1 animate-in fade-in-0 slide-in-from-bottom-1">
                    <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium uppercase tracking-wide">
                      Insert variable
                    </p>
                    <div className="flex flex-wrap gap-1 px-1 pb-1">
                      {ALL_VARIABLES.filter((v) =>
                        v.name
                          .toLowerCase()
                          .startsWith(varAutocompleteFilter.toLowerCase()),
                      ).map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => {
                            const el = composeTextareaRef.current;
                            if (!el) return;
                            const cur = el.selectionStart ?? messageText.length;
                            const before = messageText.slice(0, cur);
                            const braceIdx = before.lastIndexOf("{{");
                            const newText =
                              messageText.slice(0, braceIdx) +
                              `{{${v.name}}}` +
                              messageText.slice(cur);
                            setMessageText(newText);
                            setVarAutocomplete(false);
                            requestAnimationFrame(() => {
                              el.focus();
                              const pos = braceIdx + v.name.length + 4;
                              el.setSelectionRange(pos, pos);
                            });
                          }}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-colors"
                          title={v.label}
                        >
                          {`{{${v.name}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Textarea + send button */}
                <div className="flex flex-col gap-2">
                  {/* MMS attachment preview (SMS only) */}
                  {messageType === "sms" && mmsAttachment && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                      {mmsAttachment.contentType.startsWith("image/") ? (
                        <img
                          src={mmsAttachment.previewUrl}
                          alt="attachment"
                          className="h-12 w-12 rounded object-cover border border-border"
                        />
                      ) : mmsAttachment.contentType.startsWith("video/") ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted">
                          <Film className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ) : mmsAttachment.contentType.startsWith("audio/") ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted">
                          <FileAudio className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {mmsAttachment.file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(mmsAttachment.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(mmsAttachment.previewUrl);
                          setMmsAttachment(null);
                        }}
                        className="shrink-0 rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    {/* Hidden file input */}
                    {messageType === "sms" && (
                      <input
                        ref={mmsFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/3gpp,video/quicktime,audio/mpeg,audio/ogg,audio/wav,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const previewUrl = f.type.startsWith("image/")
                            ? URL.createObjectURL(f)
                            : "";
                          setMmsAttachment({
                            file: f,
                            previewUrl,
                            contentType: f.type,
                          });
                          e.target.value = "";
                        }}
                      />
                    )}
                    {/* Paperclip button — SMS only */}
                    {messageType === "sms" && (
                      <button
                        type="button"
                        onClick={() => mmsFileInputRef.current?.click()}
                        disabled={isUploadingMMS}
                        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                        title="Attach image, video, audio, or PDF (MMS)"
                        aria-label="Attach media"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    )}
                    <Textarea
                      ref={composeTextareaRef}
                      placeholder="Type your message… (type {{ to insert a variable)"
                      value={messageText}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setMessageText(newText);

                        // Decouple from template if the body was edited
                        if (
                          selectedTemplate &&
                          selectedTemplate !== "none" &&
                          newText !==
                            (templates?.find(
                              (t) => t.id.toString() === selectedTemplate,
                            )?.body ?? "")
                        ) {
                          setSelectedTemplate("");
                        }

                        // Variable autocomplete: trigger when "{{" appears before cursor
                        const cur = e.target.selectionStart ?? newText.length;
                        const before = newText.slice(0, cur);
                        const lastBrace = before.lastIndexOf("{{");
                        if (
                          lastBrace !== -1 &&
                          !before.slice(lastBrace).includes("}}")
                        ) {
                          setVarAutocompleteFilter(before.slice(lastBrace + 2));
                          setVarAutocomplete(true);
                        } else {
                          setVarAutocomplete(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setVarAutocomplete(false);
                          return;
                        }
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !varAutocomplete
                        ) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 min-h-[72px] resize-none text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        (!messageText.trim() && !mmsAttachment) ||
                        isUploadingMMS
                      }
                      className="bg-primary hover:bg-primary/90 h-10 w-10 p-0 transition-transform active:scale-90"
                    >
                      {isUploadingMMS ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Live resolved preview toggle */}
                {/* Failed message restore banner */}
                {failedText && (
                  <div className="mt-1.5 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    <p className="text-[11px] text-destructive flex-1 truncate">
                      Failed to send — message restored
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageText(failedText);
                        setFailedText(null);
                        setOptimisticMessages([]);
                        requestAnimationFrame(() =>
                          composeTextareaRef.current?.focus(),
                        );
                      }}
                      className="text-[11px] font-medium text-destructive underline shrink-0"
                    >
                      Restore
                    </button>
                  </div>
                )}

                {messageText.trim() && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPreview((p) => !p)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPreview ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {showPreview ? "Hide preview" : "Show resolved preview"}
                    </button>
                    {showPreview && (
                      <div className="mt-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                        {resolveVars(messageText, varMap)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : channelFilter === "calls" && selectedCall ? (
            /* ── Call Detail View ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-7 w-7"
                    onClick={() => setMobilePanel("list")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      {selectedCall.client_name ||
                        selectedCall.client_phone ||
                        "Unknown"}
                    </p>
                    {selectedCall.client_name && selectedCall.client_phone && (
                      <p className="text-xs text-muted-foreground">
                        {selectedCall.client_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Call detail card */}
              <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
                <div className="w-full max-w-md space-y-4">
                  {/* Direction badge */}
                  <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const isInbound = selectedCall.direction === "inbound";
                        const callStatus = parseCallStatus(selectedCall.body);
                        const isMissed =
                          callStatus === "no-answer" || callStatus === "failed";
                        return (
                          <div
                            className={cn(
                              "p-3 rounded-full",
                              isMissed
                                ? "bg-red-100"
                                : isInbound
                                  ? "bg-green-100"
                                  : "bg-primary/10",
                            )}
                          >
                            {isMissed ? (
                              <PhoneMissed
                                className={cn("h-5 w-5 text-red-500")}
                              />
                            ) : isInbound ? (
                              <PhoneIncoming className="h-5 w-5 text-green-600" />
                            ) : (
                              <PhoneOutgoing className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        );
                      })()}
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedCall.direction === "inbound"
                            ? "Incoming Call"
                            : "Outgoing Call"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(selectedCall.created_at)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact</span>
                        <span className="font-medium text-foreground">
                          {selectedCall.client_name || "Unknown"}
                        </span>
                      </div>
                      {selectedCall.client_phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-medium text-foreground">
                            {selectedCall.client_phone}
                          </span>
                        </div>
                      )}
                      {(() => {
                        const duration = parseCallDuration(selectedCall.body);
                        const callStatus = parseCallStatus(selectedCall.body);
                        return (
                          <>
                            {duration && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Duration
                                </span>
                                <span className="font-medium text-foreground flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {duration}
                                </span>
                              </div>
                            )}
                            {callStatus && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Status
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs capitalize",
                                    callStatus === "no-answer" ||
                                      callStatus === "failed"
                                      ? "text-red-600 border-red-300"
                                      : "text-green-600 border-green-300",
                                  )}
                                >
                                  {callStatus === "no-answer"
                                    ? "Missed"
                                    : callStatus}
                                </Badge>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Call back button */}
                  {selectedCall.client_phone &&
                    (isCallDetailDialing ? (
                      (() => {
                        dispatch(
                          startOutboundCall({
                            phone: selectedCall.client_phone!,
                            clientName: selectedCall.client_name || undefined,
                            clientId: selectedCall.client_id ?? undefined,
                          }),
                        );
                        setIsCallDetailDialing(false);
                        return null;
                      })()
                    ) : (
                      <Button
                        className="w-full gap-2"
                        onClick={() => setIsCallDetailDialing(true)}
                      >
                        <PhoneCall className="h-4 w-4" />
                        Call Back
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          ) : channelFilter === "calls" ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Phone className="h-14 w-14 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a call</p>
                <p className="text-sm mt-1">
                  Choose from the list to view details
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-14 w-14 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">
                  Choose from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Contact info panel */}
        {currentThread && (
          <div className="hidden lg:flex w-72 flex-shrink-0 border-l border-border bg-card flex-col">
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center gap-2">
                  <Avatar
                    className={cn(
                      "h-16 w-16",
                      (currentThread.client_id ||
                        currentThread.contact_broker_id) &&
                        "cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all",
                    )}
                    onClick={() => {
                      if (currentThread.contact_broker_id) {
                        setDetailBrokerId(currentThread.contact_broker_id);
                      } else if (currentThread.client_id) {
                        setDetailClientId(currentThread.client_id);
                      }
                    }}
                    title={
                      currentThread.contact_broker_id
                        ? "View realtor profile"
                        : currentThread.client_id
                          ? "View client profile"
                          : undefined
                    }
                  >
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                      {getInitials(currentThread.client_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p
                      className={cn(
                        "font-semibold text-foreground",
                        (currentThread.client_id ||
                          currentThread.contact_broker_id) &&
                          "cursor-pointer hover:text-primary hover:underline transition-colors",
                      )}
                      onClick={() => {
                        if (currentThread.contact_broker_id) {
                          setDetailBrokerId(currentThread.contact_broker_id);
                        } else if (currentThread.client_id) {
                          setDetailClientId(currentThread.client_id);
                        }
                      }}
                    >
                      {currentThread.client_name || "Unknown"}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {currentThread.contact_broker_id && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-violet-50 text-violet-700 border-violet-200"
                        >
                          Realtor
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          getPriorityColor(currentThread.priority),
                        )}
                      >
                        {currentThread.priority}
                      </Badge>
                    </div>
                  </div>
                  {/* Add as Contact — shown only for unknown senders without any link */}
                  {!currentThread.client_id &&
                    !currentThread.contact_broker_id && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary"
                          onClick={() => {
                            saveContactFormik.resetForm();
                            setIsSaveContactOpen(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Add as Contact
                        </Button>
                        <p className="text-xs text-muted-foreground text-center leading-snug px-1">
                          Save this sender as a client to track them in the
                          pipeline.
                        </p>
                      </>
                    )}
                </div>

                <Separator />

                {/* Contact details */}
                <div className="space-y-3">
                  {currentThread.client_phone && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          Phone
                        </p>
                        <PhoneLink
                          phone={currentThread.client_phone}
                          clientName={currentThread.client_name}
                          clientId={currentThread.client_id}
                          noIcon
                          className="text-sm text-foreground"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "mt-1.5 h-7 text-xs w-full gap-1.5",
                            isCallActive
                              ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                              : "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                          )}
                          onClick={() => setIsCallActive((v) => !v)}
                        >
                          <Phone className="h-3 w-3" />
                          {isCallActive ? "In call" : "Start Call"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1.5 h-7 text-xs w-full gap-1.5 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300"
                          onClick={() => setScheduleDialogOpen(true)}
                        >
                          <CalendarPlus className="h-3 w-3" />
                          Schedule Meeting
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentThread.client_email && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-50 rounded-md flex-shrink-0">
                        <Mail className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          Email
                        </p>
                        <EmailLink
                          email={currentThread.client_email}
                          noIcon
                          className="text-sm text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  {currentThread.application_id && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-muted rounded-md flex-shrink-0">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Application
                        </p>
                        <p className="text-sm text-foreground font-mono">
                          {currentThread.application_id}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Conversation stats */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Conversation
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground">
                        {currentThread.message_count}
                      </p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground">
                        {currentThread.unread_count}
                      </p>
                      <p className="text-xs text-muted-foreground">Unread</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-muted rounded-md flex-shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Last message
                    </p>
                    <p className="text-sm text-foreground">
                      {currentThread.last_message_at
                        ? formatTime(currentThread.last_message_at)
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "p-1.5 rounded-md flex-shrink-0",
                      currentThread.last_message_type === "whatsapp"
                        ? "bg-[#25D366]/10"
                        : currentThread.last_message_type === "email"
                          ? "bg-blue-50"
                          : "bg-primary/10",
                    )}
                  >
                    <span
                      className={getChannelColor(
                        currentThread.last_message_type,
                      )}
                    >
                      {getChannelIcon(
                        currentThread.last_message_type,
                        "h-3.5 w-3.5",
                      )}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Channel
                    </p>
                    <p className="text-sm text-foreground capitalize">
                      {currentThread.last_message_type}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm",
                      currentThread.status === "active"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : currentThread.status === "archived"
                          ? "bg-muted text-muted-foreground"
                          : "bg-red-50 text-red-700 border-red-200",
                    )}
                  >
                    {currentThread.status}
                  </Badge>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <NewConversationWizard
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        templates={templates}
        onSendMessage={handleNewConversation}
        isSending={isSendingMessage}
      />

      {/* ── Schedule Meeting dialog ── */}
      {(() => {
        const schedulerUrl = currentUser?.public_token
          ? `${window.location.origin}/scheduler/${currentUser.public_token}`
          : null;
        return (
          <Dialog
            open={scheduleDialogOpen}
            onOpenChange={(v) => {
              setScheduleDialogOpen(v);
              if (!v) setCopiedSchedule(false);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-violet-600" />
                  Schedule a Meeting
                </DialogTitle>
                <DialogDescription>
                  Share your booking link with{" "}
                  <strong>
                    {currentThread?.client_name || "this contact"}
                  </strong>{" "}
                  so they can pick a time that works.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                {schedulerUrl ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-muted border rounded-lg px-3 py-2.5 min-w-0">
                        <CalendarPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          readOnly
                          value={schedulerUrl}
                          className="bg-transparent text-sm text-foreground w-full outline-none truncate"
                          onClick={(e) =>
                            (e.target as HTMLInputElement).select()
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "shrink-0 gap-1.5 transition-all",
                          copiedSchedule
                            ? "border-green-500 text-green-600 bg-green-50"
                            : "",
                        )}
                        onClick={() => {
                          navigator.clipboard.writeText(schedulerUrl);
                          setCopiedSchedule(true);
                          toast({
                            title: "Copied!",
                            description: "Booking link copied to clipboard.",
                          });
                          setTimeout(() => setCopiedSchedule(false), 2500);
                        }}
                      >
                        {copiedSchedule ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() =>
                        window.open(
                          schedulerUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                      Preview Booking Page
                    </Button>
                    <div className="flex items-start gap-2 p-3 bg-violet-50 rounded-lg border border-violet-100 text-xs text-violet-700">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Copy this link and send it to the client via SMS or
                        email so they can pick an available time slot directly
                        on your calendar.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-600 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No scheduler link found. Configure your availability in
                    Calendar → Settings.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Save Unknown Sender as Contact ── */}
      <Dialog
        open={isSaveContactOpen}
        onOpenChange={(open) => {
          setIsSaveContactOpen(open);
          if (!open) saveContactFormik.resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Add as Contact
            </DialogTitle>
            <DialogDescription>
              Save this number
              {currentThread?.client_phone
                ? ` (${currentThread.client_phone})`
                : ""}{" "}
              as a new client.
            </DialogDescription>
          </DialogHeader>

          {/* Legend */}
          <div className="mx-6 flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 shrink-0">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">
                The contact must be saved as a client first.
              </span>{" "}
              Once saved, you can optionally create a Draft entry in the
              pipeline as an action item for the realtor.
            </p>
          </div>

          <form
            onSubmit={saveContactFormik.handleSubmit}
            className="flex flex-col flex-1 min-h-0 mt-4"
          >
            <ScrollArea className="flex-1">
              <div className="space-y-5 px-6 pb-2">
                {/* ── Basic Info ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Basic Info
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_first_name">First Name *</Label>
                      <Input
                        id="sc_first_name"
                        name="first_name"
                        value={saveContactFormik.values.first_name}
                        onChange={saveContactFormik.handleChange}
                        onBlur={saveContactFormik.handleBlur}
                        placeholder="John"
                        className={cn(
                          saveContactFormik.touched.first_name &&
                            saveContactFormik.errors.first_name
                            ? "border-destructive"
                            : "",
                        )}
                      />
                      {saveContactFormik.touched.first_name &&
                        saveContactFormik.errors.first_name && (
                          <p className="text-xs text-destructive">
                            {saveContactFormik.errors.first_name}
                          </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_last_name">Last Name *</Label>
                      <Input
                        id="sc_last_name"
                        name="last_name"
                        value={saveContactFormik.values.last_name}
                        onChange={saveContactFormik.handleChange}
                        onBlur={saveContactFormik.handleBlur}
                        placeholder="Doe"
                        className={cn(
                          saveContactFormik.touched.last_name &&
                            saveContactFormik.errors.last_name
                            ? "border-destructive"
                            : "",
                        )}
                      />
                      {saveContactFormik.touched.last_name &&
                        saveContactFormik.errors.last_name && (
                          <p className="text-xs text-destructive">
                            {saveContactFormik.errors.last_name}
                          </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_email">
                        Email{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="sc_email"
                        name="email"
                        type="email"
                        value={saveContactFormik.values.email}
                        onChange={saveContactFormik.handleChange}
                        onBlur={saveContactFormik.handleBlur}
                        placeholder="john@example.com"
                        className={cn(
                          saveContactFormik.touched.email &&
                            saveContactFormik.errors.email
                            ? "border-destructive"
                            : "",
                        )}
                      />
                      {saveContactFormik.touched.email &&
                        saveContactFormik.errors.email && (
                          <p className="text-xs text-destructive">
                            {saveContactFormik.errors.email}
                          </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_phone">
                        Phone{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="sc_phone"
                        name="phone"
                        type="tel"
                        value={saveContactFormik.values.phone}
                        onChange={saveContactFormik.handleChange}
                        placeholder={
                          currentThread?.client_phone ?? "+1 555 0000"
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_alt_phone">
                        Alternate Phone{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="sc_alt_phone"
                        name="alternate_phone"
                        type="tel"
                        value={saveContactFormik.values.alternate_phone}
                        onChange={saveContactFormik.handleChange}
                        placeholder="+1 555 0001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_dob">
                        Date of Birth{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="sc_dob"
                        name="date_of_birth"
                        type="date"
                        value={saveContactFormik.values.date_of_birth}
                        onChange={saveContactFormik.handleChange}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_citizenship">
                        Citizenship Status{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Select
                        value={
                          saveContactFormik.values.citizenship_status ||
                          "__none__"
                        }
                        onValueChange={(v) =>
                          saveContactFormik.setFieldValue(
                            "citizenship_status",
                            v === "__none__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger id="sc_citizenship">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          <SelectItem value="us_citizen">US Citizen</SelectItem>
                          <SelectItem value="permanent_resident">
                            Permanent Resident
                          </SelectItem>
                          <SelectItem value="non_resident">
                            Non-Resident
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* ── Address ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Address
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="sc_street">Street</Label>
                      <Input
                        id="sc_street"
                        name="address_street"
                        value={saveContactFormik.values.address_street}
                        onChange={saveContactFormik.handleChange}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_city">City</Label>
                      <Input
                        id="sc_city"
                        name="address_city"
                        value={saveContactFormik.values.address_city}
                        onChange={saveContactFormik.handleChange}
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="sc_state">State</Label>
                        <Input
                          id="sc_state"
                          name="address_state"
                          value={saveContactFormik.values.address_state}
                          onChange={(e) =>
                            saveContactFormik.setFieldValue(
                              "address_state",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="CA"
                          maxLength={2}
                          className="uppercase"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sc_zip">ZIP</Label>
                        <Input
                          id="sc_zip"
                          name="address_zip"
                          value={saveContactFormik.values.address_zip}
                          onChange={saveContactFormik.handleChange}
                          placeholder="90210"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Financial / Employment ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Financial &amp; Employment
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_employment">Employment Status</Label>
                      <Select
                        value={
                          saveContactFormik.values.employment_status ||
                          "__none__"
                        }
                        onValueChange={(v) =>
                          saveContactFormik.setFieldValue(
                            "employment_status",
                            v === "__none__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger id="sc_employment">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          <SelectItem value="employed">Employed</SelectItem>
                          <SelectItem value="self_employed">
                            Self-Employed
                          </SelectItem>
                          <SelectItem value="unemployed">Unemployed</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                          <SelectItem value="retired_with_pension">
                            Retired w/ Pension
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_income_type">Income Type</Label>
                      <Select
                        value={
                          saveContactFormik.values.income_type || "__none__"
                        }
                        onValueChange={(v) =>
                          saveContactFormik.setFieldValue(
                            "income_type",
                            v === "__none__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger id="sc_income_type">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          <SelectItem value="W-2">W-2</SelectItem>
                          <SelectItem value="1099">1099</SelectItem>
                          <SelectItem value="Self-Employed">
                            Self-Employed
                          </SelectItem>
                          <SelectItem value="Investor">Investor</SelectItem>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_income">
                        Annual Income{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                          $
                        </span>
                        <Input
                          id="sc_income"
                          name="annual_income"
                          type="number"
                          min="0"
                          step="1000"
                          value={saveContactFormik.values.annual_income}
                          onChange={saveContactFormik.handleChange}
                          placeholder="0"
                          className={cn(
                            "pl-6",
                            saveContactFormik.touched.annual_income &&
                              saveContactFormik.errors.annual_income
                              ? "border-destructive"
                              : "",
                          )}
                        />
                      </div>
                      {saveContactFormik.touched.annual_income &&
                        saveContactFormik.errors.annual_income && (
                          <p className="text-xs text-destructive">
                            {saveContactFormik.errors.annual_income as string}
                          </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc_credit">
                        Credit Score{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          300–850
                        </span>
                      </Label>
                      <Input
                        id="sc_credit"
                        name="credit_score"
                        type="number"
                        min="300"
                        max="850"
                        value={saveContactFormik.values.credit_score}
                        onChange={saveContactFormik.handleChange}
                        placeholder="720"
                        className={cn(
                          saveContactFormik.touched.credit_score &&
                            saveContactFormik.errors.credit_score
                            ? "border-destructive"
                            : "",
                        )}
                      />
                      {saveContactFormik.touched.credit_score &&
                        saveContactFormik.errors.credit_score && (
                          <p className="text-xs text-destructive">
                            {saveContactFormik.errors.credit_score as string}
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                {/* ── Add to Pipeline as Draft ── */}
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="add_to_pipeline"
                      checked={saveContactFormik.values.add_to_pipeline}
                      onChange={saveContactFormik.handleChange}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Add to Pipeline as Draft
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Action item for realtor
                    </span>
                  </label>

                  {saveContactFormik.values.add_to_pipeline && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="sc_loan_type">Loan Type *</Label>
                        <Select
                          value={saveContactFormik.values.loan_type}
                          onValueChange={(v) =>
                            saveContactFormik.setFieldValue("loan_type", v)
                          }
                        >
                          <SelectTrigger
                            id="sc_loan_type"
                            className={cn(
                              saveContactFormik.touched.loan_type &&
                                saveContactFormik.errors.loan_type
                                ? "border-destructive"
                                : "",
                            )}
                          >
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purchase">Purchase</SelectItem>
                            <SelectItem value="refinance">Refinance</SelectItem>
                          </SelectContent>
                        </Select>
                        {saveContactFormik.touched.loan_type &&
                          saveContactFormik.errors.loan_type && (
                            <p className="text-xs text-destructive">
                              {saveContactFormik.errors.loan_type}
                            </p>
                          )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sc_pipeline_notes">
                          Notes{" "}
                          <span className="text-muted-foreground text-xs font-normal">
                            (optional)
                          </span>
                        </Label>
                        <Textarea
                          id="sc_pipeline_notes"
                          name="pipeline_notes"
                          value={saveContactFormik.values.pipeline_notes}
                          onChange={saveContactFormik.handleChange}
                          placeholder="Any context for the realtor…"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-card rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSaveContactOpen(false);
                  saveContactFormik.resetForm();
                }}
                disabled={isSavingContact}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="gap-2"
                disabled={isSavingContact}
              >
                {isSavingContact ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    {saveContactFormik.values.add_to_pipeline
                      ? "Save & Add to Pipeline"
                      : "Save Contact"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialpad overlay ── */}
      {isDialerOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 duration-300">
          {isDialerCallActive && dialerNumber ? (
            (() => {
              dispatch(
                startOutboundCall({ phone: dialerNumber, clientName: null }),
              );
              setIsDialerCallActive(false);
              setIsDialerOpen(false);
              setDialerNumber("");
              return null;
            })()
          ) : (
            <div className="bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <PhoneCall className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Dialpad
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setIsDialerOpen(false);
                    setDialerNumber("");
                  }}
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Number display */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                  <input
                    type="tel"
                    value={dialerNumber}
                    onChange={(e) => setDialerNumber(e.target.value)}
                    placeholder="Enter number…"
                    className="flex-1 bg-transparent text-lg font-mono tracking-wider text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  {dialerNumber && (
                    <button
                      onClick={() => setDialerNumber((n) => n.slice(0, -1))}
                      className="p-1 rounded hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Delete className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Keypad grid */}
              <div className="px-4 pb-2">
                {[
                  ["1", "2", "3"],
                  ["4", "5", "6"],
                  ["7", "8", "9"],
                  ["*", "0", "#"],
                ].map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-3 gap-2 mb-2">
                    {row.map((key) => (
                      <button
                        key={key}
                        onClick={() => setDialerNumber((n) => n + key)}
                        className="flex flex-col items-center justify-center h-14 rounded-xl bg-muted hover:bg-muted/70 active:scale-95 transition-all duration-100 select-none"
                      >
                        <span className="text-lg font-semibold text-foreground leading-none">
                          {key}
                        </span>
                        {key === "2" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            ABC
                          </span>
                        )}
                        {key === "3" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            DEF
                          </span>
                        )}
                        {key === "4" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            GHI
                          </span>
                        )}
                        {key === "5" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            JKL
                          </span>
                        )}
                        {key === "6" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            MNO
                          </span>
                        )}
                        {key === "7" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            PQRS
                          </span>
                        )}
                        {key === "8" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            TUV
                          </span>
                        )}
                        {key === "9" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            WXYZ
                          </span>
                        )}
                        {key === "0" && (
                          <span className="text-[9px] text-muted-foreground tracking-widest mt-0.5">
                            +
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Call button */}
              <div className="px-4 pb-4">
                <Button
                  className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2 text-base font-semibold shadow-md"
                  disabled={!dialerNumber.trim()}
                  onClick={() => {
                    if (dialerNumber.trim()) setIsDialerCallActive(true);
                  }}
                >
                  <Phone className="h-5 w-5" />
                  Call
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phone Numbers Management Panel ── */}
      <PhoneNumbersPanel
        isOpen={isPhoneNumbersOpen}
        onClose={() => setIsPhoneNumbersOpen(false)}
        sessionToken={sessionToken}
      />

      {/* Client detail panel — slides in from the right when a known client name is clicked */}
      <ClientDetailPanel
        isOpen={detailClientId !== null}
        onClose={() => setDetailClientId(null)}
        clientId={detailClientId}
        onClientUpdated={() =>
          dispatch(fetchConversationThreads(threadsFilters))
        }
      />

      {/* Broker/Realtor detail panel — slides in when the contact is a realtor */}
      <BrokerDetailPanel
        isOpen={detailBrokerId !== null}
        onClose={() => setDetailBrokerId(null)}
        brokerId={detailBrokerId}
      />

      {/* Save message as reusable template */}
      <SaveAsTemplateDialog
        isOpen={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        channelType={messageType}
        defaultBody={messageText}
        defaultSubject={messageSubject}
      />
    </div>
  );
};

export default Conversations;
