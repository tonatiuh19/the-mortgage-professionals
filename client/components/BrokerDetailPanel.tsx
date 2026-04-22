import React, { useEffect, useState, useCallback } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Globe,
  MessageSquare,
  Edit3,
  Save,
  XCircle,
  Building2,
  ExternalLink,
  Star,
  Loader2,
  Users,
  Tag,
  Send,
  ChevronDown,
  Smartphone,
  MessageCircle,
  Lock,
  FileText,
  ArrowLeftRight,
  AlertTriangle,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Facebook,
  PhoneCall,
  CheckCircle2,
  Copy,
  Camera,
  X,
  BookmarkPlus,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokerProfileForEdit,
  updateBroker,
  updateBrokerProfileByAdmin,
  convertBrokerToClient,
  fetchMortgageBankers,
  uploadBrokerAvatarByAdmin,
} from "@/store/slices/brokersSlice";
import {
  fetchConversationMessages,
  fetchConversationTemplates,
  sendMessage,
} from "@/store/slices/conversationsSlice";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import ImageCropUploader from "@/components/ImageCropUploader";
import {
  FaLinkedin,
  FaFacebook,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

const specializationOptions = [
  "Conventional Loans",
  "FHA Loans",
  "VA Loans",
  "USDA Loans",
  "Jumbo Loans",
  "Refinancing",
  "First-Time Home Buyers",
  "Investment Properties",
  "Commercial Loans",
  "Reverse Mortgages",
];

const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: "current_client_referral", label: "Current Client Referral" },
  { value: "past_client", label: "Past Client" },
  { value: "past_client_referral", label: "Past Client Referral" },
  { value: "personal_friend", label: "Personal Friend" },
  { value: "realtor", label: "Realtor / Partner" },
  { value: "advertisement", label: "Advertisement" },
  { value: "business_partner", label: "Business Partner" },
  { value: "builder", label: "Builder" },
  { value: "other", label: "Other" },
];

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(first = "", last = "") {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(date);
}

interface BrokerDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  brokerId: number | null;
  onOpenConversation?: (conversationId: string) => void;
}

export default function BrokerDetailPanel({
  isOpen,
  onClose,
  brokerId,
  onOpenConversation,
}: BrokerDetailPanelProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { selectedBrokerProfile, profileLoading, mortgageBankers } =
    useAppSelector((s) => s.brokers);
  const { templates } = useAppSelector((s) => s.conversations);
  const { user: currentBroker } = useAppSelector((s) => s.brokerAuth);
  const isAdmin = currentBroker?.role === "admin";

  // ── edit state ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLicense, setEditLicense] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editOfficeAddress, setEditOfficeAddress] = useState("");
  const [editOfficeCity, setEditOfficeCity] = useState("");
  const [editOfficeState, setEditOfficeState] = useState("");
  const [editOfficeZip, setEditOfficeZip] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [editYoutube, setEditYoutube] = useState("");
  const [editRole, setEditRole] = useState<"broker" | "admin">("broker");
  const [editCreatedByBrokerId, setEditCreatedByBrokerId] = useState<
    number | null
  >(null);
  const [editSpecializations, setEditSpecializations] = useState<string[]>([]);
  const [editYearsExp, setEditYearsExp] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ── compose ─────────────────────────────────────────────────────────────────
  const [composing, setComposing] = useState(false);
  const [composeType, setComposeType] = useState<"sms" | "email" | "whatsapp">(
    "sms",
  );
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // ── convert to client dialog ────────────────────────────────────────────────
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertSource, setConvertSource] = useState("");
  const [converting, setConverting] = useState(false);

  // ── load profile & templates ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && brokerId) {
      dispatch(fetchBrokerProfileForEdit(brokerId));
      dispatch(fetchConversationTemplates(undefined));
      if (isAdmin) dispatch(fetchMortgageBankers());
    }
  }, [isOpen, brokerId, dispatch, isAdmin]);

  // populate edit fields when profile loads
  useEffect(() => {
    if (!selectedBrokerProfile) return;
    const p = selectedBrokerProfile;
    setEditFirst(p.first_name);
    setEditLast(p.last_name);
    setEditPhone(p.phone ?? "");
    setEditLicense(p.license_number ?? "");
    setEditBio(p.bio ?? "");
    setEditOfficeAddress(p.office_address ?? "");
    setEditOfficeCity(p.office_city ?? "");
    setEditOfficeState(p.office_state ?? "");
    setEditOfficeZip(p.office_zip ?? "");
    setEditWebsite(p.website_url ?? "");
    setEditLinkedin(p.linkedin_url ?? "");
    setEditInstagram(p.instagram_url ?? "");
    setEditFacebook(p.facebook_url ?? "");
    setEditTwitter((p as any).twitter_url ?? "");
    setEditYoutube((p as any).youtube_url ?? "");
    setEditRole((p as any).role ?? "broker");
    setEditCreatedByBrokerId((p as any).created_by_broker_id ?? null);
    setEditSpecializations(
      Array.isArray(p.specializations) ? p.specializations : [],
    );
    setEditYearsExp(
      p.years_experience != null ? String(p.years_experience) : "",
    );
  }, [selectedBrokerProfile]);

  const handleAvatarUpload = async (file: File) => {
    if (!brokerId) return;
    setAvatarUploading(true);
    try {
      await dispatch(
        uploadBrokerAvatarByAdmin({ id: brokerId, file }),
      ).unwrap();
      toast({ title: "Avatar updated", description: "Profile photo saved." });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err || "Could not save avatar.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    if (selectedBrokerProfile) {
      const p = selectedBrokerProfile;
      setEditFirst(p.first_name);
      setEditLast(p.last_name);
      setEditPhone(p.phone ?? "");
      setEditLicense(p.license_number ?? "");
      setEditTwitter((p as any).twitter_url ?? "");
      setEditYoutube((p as any).youtube_url ?? "");
      setEditRole((p as any).role ?? "broker");
      setEditCreatedByBrokerId((p as any).created_by_broker_id ?? null);
      setEditSpecializations(
        Array.isArray(p.specializations) ? p.specializations : [],
      );
      setEditYearsExp(
        p.years_experience != null ? String(p.years_experience) : "",
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!brokerId) return;
    setSaving(true);
    try {
      await dispatch(
        updateBroker({
          id: brokerId,
          first_name: editFirst,
          last_name: editLast,
          phone: editPhone || undefined,
          license_number: editLicense || undefined,
          role: editRole,
          specializations:
            editSpecializations.length > 0 ? editSpecializations : undefined,
          created_by_broker_id:
            editRole === "broker" ? (editCreatedByBrokerId ?? null) : undefined,
        }),
      ).unwrap();
      await dispatch(
        updateBrokerProfileByAdmin({
          id: brokerId,
          bio: editBio || undefined,
          office_address: editOfficeAddress || undefined,
          office_city: editOfficeCity || undefined,
          office_state: editOfficeState || undefined,
          office_zip: editOfficeZip || undefined,
          years_experience: editYearsExp ? Number(editYearsExp) : undefined,
          website_url: editWebsite || undefined,
          linkedin_url: editLinkedin || undefined,
          instagram_url: editInstagram || undefined,
          facebook_url: editFacebook || undefined,
          twitter_url: editTwitter || undefined,
          youtube_url: editYoutube || undefined,
        }),
      ).unwrap();
      setEditing(false);
      toast({ title: "Saved", description: "Realtor profile updated" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedBrokerProfile || !composeBody.trim()) return;
    const phone = selectedBrokerProfile.phone;
    const email = selectedBrokerProfile.email;
    const conversationId = `conv_broker_${brokerId}`;

    setSendingMsg(true);
    try {
      await dispatch(
        sendMessage({
          conversation_id: conversationId,
          communication_type: composeType === "email" ? "email" : "sms",
          body: composeBody,
          subject: composeType === "email" ? composeSubject : undefined,
          recipient_email: composeType === "email" ? (email ?? "") : undefined,
          recipient_phone: composeType !== "email" ? (phone ?? "") : undefined,
        }),
      ).unwrap();
      setComposing(false);
      setComposeBody("");
      setComposeSubject("");
      toast({ title: "Sent", description: "Message sent to realtor" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err || "Failed to send",
        variant: "destructive",
      });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleConvertToClient = async () => {
    if (!brokerId || !convertSource) return;
    setConverting(true);
    try {
      await dispatch(
        convertBrokerToClient({
          brokerId,
          payload: { source: convertSource },
        }),
      ).unwrap();
      toast({
        title: "Converted",
        description: `${selectedBrokerProfile?.first_name} ${selectedBrokerProfile?.last_name} is now a client`,
      });
      setConvertDialogOpen(false);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err || "Conversion failed",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const profile = selectedBrokerProfile;
  const isPartner = profile?.role === "broker";

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden"
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="relative flex items-start gap-4 px-6 pt-6 pb-5 border-b bg-gradient-to-br from-card to-muted/30 flex-shrink-0">
            {profileLoading ? (
              <div className="flex items-center gap-4 w-full">
                <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ) : profile ? (
              <div className="flex items-start gap-4 w-full">
                {/* avatar */}
                <div className="relative shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.first_name}
                      className="w-16 h-16 rounded-2xl object-cover shadow-inner"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-inner">
                      <span className="text-xl font-bold text-primary">
                        {getInitials(profile.first_name, profile.last_name)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                      (profile as any).status === "active"
                        ? "bg-green-500"
                        : (profile as any).status === "suspended"
                          ? "bg-red-500"
                          : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* info + actions */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {/* name row */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h2 className="text-xl font-bold text-foreground truncate">
                      {profile.first_name} {profile.last_name}
                    </h2>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {isPartner ? "Partner Realtor" : "Mortgage Banker"}
                    </Badge>
                  </div>

                  <EmailLink
                    email={profile.email}
                    className="text-sm text-muted-foreground"
                  />
                  {profile.phone && (
                    <PhoneLink
                      phone={profile.phone}
                      clientName={`${profile.first_name} ${profile.last_name}`}
                      className="text-sm text-muted-foreground"
                    />
                  )}

                  {/* action buttons row: SMS · Email · Convert · Edit */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {profile.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          setComposing(true);
                          setComposeType("sms");
                        }}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        SMS
                      </Button>
                    )}
                    {profile.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          setComposing(true);
                          setComposeType("email");
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </Button>
                    )}
                    {isAdmin && isPartner && !editing && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                        onClick={() => setConvertDialogOpen(true)}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Convert to Client
                      </Button>
                    )}
                    {isAdmin && !editing && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditing(true)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit profile</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {editing && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 px-2"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1 px-2"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Compose box ────────────────────────────────────────────────── */}
          {composing && (
            <div className="border-b bg-card px-5 py-3 space-y-2 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {(["sms", "email"] as const).map((t) => {
                  const unavailable =
                    (t === "sms" && !profile?.phone) ||
                    (t === "email" && !profile?.email);
                  return (
                    <button
                      key={t}
                      disabled={unavailable}
                      onClick={() => setComposeType(t)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                        composeType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : unavailable
                            ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {t === "sms" ? (
                        <Smartphone className="w-3 h-3" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      {t.toUpperCase()}
                    </button>
                  );
                })}
                <Popover
                  open={templatePickerOpen}
                  onOpenChange={setTemplatePickerOpen}
                >
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors font-medium">
                      <FileText className="w-3 h-3" />
                      Templates
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-72 p-0"
                    sideOffset={6}
                  >
                    <Command>
                      <CommandInput placeholder="Search templates…" />
                      <CommandList className="max-h-56">
                        {templates && templates.length > 0 ? (
                          <>
                            <CommandEmpty>No templates found.</CommandEmpty>
                            <CommandGroup>
                              {templates
                                .filter((t) => t.template_type === composeType)
                                .map((tmpl) => (
                                  <CommandItem
                                    key={tmpl.id}
                                    value={tmpl.name}
                                    onSelect={() => {
                                      setComposeBody(tmpl.body || "");
                                      if (
                                        tmpl.subject &&
                                        composeType === "email"
                                      )
                                        setComposeSubject(tmpl.subject);
                                      setTemplatePickerOpen(false);
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
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            value="__save_as_template__"
                            disabled={!composeBody.trim()}
                            onSelect={() => {
                              if (!composeBody.trim()) return;
                              setTemplatePickerOpen(false);
                              setSaveTemplateOpen(true);
                            }}
                            className="gap-2 text-primary data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
                          >
                            <BookmarkPlus className="w-4 h-4" />
                            Save current message as template
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <button
                  onClick={() => setComposing(false)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              {composeType === "email" && (
                <Input
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="h-8 text-sm"
                />
              )}
              <Textarea
                placeholder={`Message to ${profile?.first_name}…`}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="text-sm resize-none min-h-[72px]"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={sendingMsg || !composeBody.trim()}
                  onClick={handleSendMessage}
                >
                  {sendingMsg ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* ── Tabs ───────────────────────────────────────────────────────── */}
          <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0">
            <TabsList className="flex-shrink-0 w-full rounded-none border-b bg-background h-10 px-4 justify-start gap-1">
              <TabsTrigger value="profile" className="text-xs h-8 px-3">
                Profile
              </TabsTrigger>
              <TabsTrigger value="office" className="text-xs h-8 px-3">
                Office
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs h-8 px-3">
                Social
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* ── Profile tab ──────────────────────────────────────────── */}
              <TabsContent value="profile" className="mt-0 p-5 space-y-5">
                {profileLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : profile ? (
                  <>
                    {/* ── Edit-mode extras ───────────────────────────────── */}
                    {editing && (
                      <>
                        {/* Avatar upload */}
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border">
                          <div className="relative shrink-0">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="w-14 h-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                <span className="text-base font-bold text-primary">
                                  {getInitials(
                                    profile.first_name,
                                    profile.last_name,
                                  )}
                                </span>
                              </div>
                            )}
                            {avatarUploading && (
                              <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">
                              Profile Photo
                            </p>
                            <ImageCropUploader
                              onUpload={handleAvatarUpload}
                              aspect={1}
                              circularCrop
                              maxSizeMB={10}
                              uploading={avatarUploading}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                disabled={avatarUploading}
                              >
                                <Camera className="h-3.5 w-3.5" />
                                {avatarUploading
                                  ? "Uploading…"
                                  : "Change Photo"}
                              </Button>
                            </ImageCropUploader>
                          </div>
                        </div>

                        {/* Name */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              First Name
                            </Label>
                            <Input
                              value={editFirst}
                              onChange={(e) => setEditFirst(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Last Name
                            </Label>
                            <Input
                              value={editLast}
                              onChange={(e) => setEditLast(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Phone + License */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Phone
                            </Label>
                            <Input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="+1 (xxx) xxx-xxxx"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              License #
                            </Label>
                            <Input
                              value={editLicense}
                              onChange={(e) => setEditLicense(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="License number"
                            />
                          </div>
                        </div>

                        {/* Role + Years exp */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Role
                            </Label>
                            <Select
                              value={editRole}
                              onValueChange={(v) =>
                                setEditRole(v as "broker" | "admin")
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="broker">Partner</SelectItem>
                                <SelectItem value="admin">
                                  Mortgage Banker
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Years Experience
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              value={editYearsExp}
                              onChange={(e) => setEditYearsExp(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="e.g. 8"
                            />
                          </div>
                        </div>

                        {/* Assigned MB — only for partner role */}
                        {editRole === "broker" && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Building2 className="h-3 w-3" /> Assigned
                              Mortgage Banker
                            </Label>
                            <Select
                              value={
                                editCreatedByBrokerId != null
                                  ? String(editCreatedByBrokerId)
                                  : ""
                              }
                              onValueChange={(v) =>
                                setEditCreatedByBrokerId(v ? Number(v) : null)
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select mortgage banker…" />
                              </SelectTrigger>
                              <SelectContent>
                                {mortgageBankers.map((mb) => (
                                  <SelectItem key={mb.id} value={String(mb.id)}>
                                    {mb.first_name} {mb.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Bio */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Bio
                          </Label>
                          <Textarea
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            className="text-sm resize-none min-h-[72px]"
                            placeholder="Bio…"
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {editBio.length}/500
                          </p>
                        </div>

                        {/* Specializations */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Tag className="h-3 w-3" /> Specializations
                          </Label>
                          <Select
                            onValueChange={(spec) => {
                              if (!editSpecializations.includes(spec))
                                setEditSpecializations([
                                  ...editSpecializations,
                                  spec,
                                ]);
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Add specialization…" />
                            </SelectTrigger>
                            <SelectContent>
                              {specializationOptions
                                .filter((o) => !editSpecializations.includes(o))
                                .map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {editSpecializations.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {editSpecializations.map((s) => (
                                <Badge
                                  key={s}
                                  variant="secondary"
                                  className="text-xs pl-2.5 pr-1.5 gap-1"
                                >
                                  {s}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditSpecializations(
                                        editSpecializations.filter(
                                          (x) => x !== s,
                                        ),
                                      )
                                    }
                                    className="hover:text-destructive transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── View mode ──────────────────────────────────────── */}
                    {!editing && (
                      <>
                        {/* Contact info */}
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-accent rounded-md flex-shrink-0">
                              <Mail className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground font-medium">
                                Email
                              </p>
                              <EmailLink
                                email={profile.email}
                                noIcon
                                className="text-sm text-foreground"
                              />
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-green-50 rounded-md flex-shrink-0">
                              <Phone className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground font-medium">
                                Phone
                              </p>
                              {profile.phone ? (
                                <PhoneLink
                                  phone={profile.phone}
                                  clientName={`${profile.first_name} ${profile.last_name}`}
                                  noIcon
                                  className="text-sm text-foreground"
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  —
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-blue-50 rounded-md flex-shrink-0">
                              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground font-medium">
                                License #
                              </p>
                              <p className="text-sm text-foreground">
                                {profile.license_number || "—"}
                              </p>
                            </div>
                          </div>

                          {profile.years_experience != null && (
                            <div className="flex items-start gap-3">
                              <div className="p-1.5 bg-amber-50 rounded-md flex-shrink-0">
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">
                                  Experience
                                </p>
                                <p className="text-sm text-foreground">
                                  {profile.years_experience} years
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Specializations */}
                        {profile.specializations &&
                          profile.specializations.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Tag className="h-3 w-3" /> Specializations
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {profile.specializations.map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Bio */}
                        {profile.bio && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Bio
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">
                              {profile.bio}
                            </p>
                          </div>
                        )}

                        {/* Role / Type */}
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              Type
                            </p>
                            <Badge
                              variant={isPartner ? "secondary" : "default"}
                            >
                              {isPartner ? "Partner" : "Mortgage Banker"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              Status
                            </p>
                            <Badge
                              variant={
                                (profile as any).status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {(profile as any).status ?? "active"}
                            </Badge>
                          </div>
                        </div>

                        {/* Assigned Mortgage Banker — view mode */}
                        {isPartner &&
                          (profile as any).created_by_broker_id &&
                          (() => {
                            const mb = mortgageBankers.find(
                              (m) =>
                                m.id === (profile as any).created_by_broker_id,
                            );
                            return mb ? (
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                                  <Building2 className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium">
                                    Assigned Mortgage Banker
                                  </p>
                                  <p className="text-sm text-foreground font-medium">
                                    {mb.first_name} {mb.last_name}
                                  </p>
                                </div>
                              </div>
                            ) : null;
                          })()}

                        {/* Source note for realtor */}
                        {isPartner && (
                          <div className="rounded-xl bg-accent border border-border p-4 space-y-1">
                            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" /> Realtor Source
                              Tag
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">
                              This person is tracked as a{" "}
                              <strong className="text-foreground">
                                Realtor / Partner
                              </strong>
                              . To convert them to a regular client with a
                              different lead source, use the "Convert to Client"
                              action above.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : null}
              </TabsContent>

              {/* ── Office tab ───────────────────────────────────────────── */}
              <TabsContent value="office" className="mt-0 p-5 space-y-4">
                {profileLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : profile ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-md flex-shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          Office Address
                        </p>
                        {editing ? (
                          <div className="space-y-2">
                            <Input
                              value={editOfficeAddress}
                              onChange={(e) =>
                                setEditOfficeAddress(e.target.value)
                              }
                              className="h-8 text-sm"
                              placeholder="Street address"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                value={editOfficeCity}
                                onChange={(e) =>
                                  setEditOfficeCity(e.target.value)
                                }
                                className="h-8 text-sm"
                                placeholder="City"
                              />
                              <Input
                                value={editOfficeState}
                                onChange={(e) =>
                                  setEditOfficeState(e.target.value)
                                }
                                className="h-8 text-sm"
                                placeholder="State"
                              />
                              <Input
                                value={editOfficeZip}
                                onChange={(e) =>
                                  setEditOfficeZip(e.target.value)
                                }
                                className="h-8 text-sm"
                                placeholder="ZIP"
                              />
                            </div>
                          </div>
                        ) : profile.office_address ? (
                          <p className="text-sm text-foreground">
                            {profile.office_address}
                            {profile.office_city && `, ${profile.office_city}`}
                            {profile.office_state &&
                              `, ${profile.office_state}`}
                            {profile.office_zip && ` ${profile.office_zip}`}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No office address
                          </p>
                        )}
                      </div>
                    </div>

                    {(profile.website_url || editing) && (
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-slate-50 rounded-md flex-shrink-0">
                          <Globe className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-medium">
                            Website
                          </p>
                          {editing ? (
                            <Input
                              value={editWebsite}
                              onChange={(e) => setEditWebsite(e.target.value)}
                              className="h-7 text-sm mt-0.5"
                              placeholder="https://…"
                            />
                          ) : (
                            <a
                              href={profile.website_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {profile.website_url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No office info available
                  </p>
                )}
              </TabsContent>

              {/* ── Social tab ───────────────────────────────────────────── */}
              <TabsContent value="social" className="mt-0 p-5 space-y-4">
                {profileLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : profile ? (
                  <div className="space-y-3">
                    {[
                      {
                        key: "linkedin_url",
                        label: "LinkedIn",
                        Icon: FaLinkedin,
                        color: "text-[#0A66C2]",
                        val: editLinkedin,
                        setter: setEditLinkedin,
                      },
                      {
                        key: "instagram_url",
                        label: "Instagram",
                        Icon: FaInstagram,
                        color: "text-[#E1306C]",
                        val: editInstagram,
                        setter: setEditInstagram,
                      },
                      {
                        key: "facebook_url",
                        label: "Facebook",
                        Icon: FaFacebook,
                        color: "text-[#1877F2]",
                        val: editFacebook,
                        setter: setEditFacebook,
                      },
                      {
                        key: "twitter_url",
                        label: "X / Twitter",
                        Icon: FaXTwitter,
                        color: "text-foreground",
                        val: editTwitter,
                        setter: setEditTwitter,
                      },
                      {
                        key: "youtube_url",
                        label: "YouTube",
                        Icon: FaYoutube,
                        color: "text-[#FF0000]",
                        val: editYoutube,
                        setter: setEditYoutube,
                      },
                    ].map(({ key, label, Icon, color, val, setter }) => {
                      const raw = (profile as any)[key] as string | null;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div
                            className={`p-1.5 bg-slate-50 rounded-md flex-shrink-0`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              {label}
                            </p>
                            {editing ? (
                              <Input
                                value={val}
                                onChange={(e) => setter(e.target.value)}
                                className="h-7 text-sm mt-0.5"
                                placeholder={`${label} URL`}
                              />
                            ) : raw ? (
                              <a
                                href={raw}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{raw}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                —
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!editing &&
                      !profile.linkedin_url &&
                      !profile.instagram_url &&
                      !profile.facebook_url &&
                      !(profile as any).twitter_url &&
                      !(profile as any).youtube_url && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No social links added yet
                        </p>
                      )}
                  </div>
                ) : null}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* ── Convert to Client Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={convertDialogOpen}
        onOpenChange={(o) => {
          setConvertDialogOpen(o);
          if (!o) setConvertSource("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Convert to Client
            </DialogTitle>
            <DialogDescription>
              <strong>
                {profile?.first_name} {profile?.last_name}
              </strong>{" "}
              will be deactivated as a partner realtor and added as a mortgage
              client. Conversations will be re-linked automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-secondary border border-border p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
              <p className="text-xs leading-snug text-foreground">
                The <strong>Lead Source</strong> tells us{" "}
                <em>how this person became a mortgage client</em>. It must not
                be "Realtor" — pick the source that best fits their new
                relationship.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                How did they come to you as a client?{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={convertSource} onValueChange={setConvertSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead source…" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.filter((s) => s.value !== "realtor").map(
                    (s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {!convertSource && (
                <p className="text-xs text-muted-foreground">
                  Required — this will appear on their client record and affect
                  lead source analytics.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
              disabled={converting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertToClient}
              disabled={converting || !convertSource}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {converting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              Convert to Client
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
    </>
  );
}
