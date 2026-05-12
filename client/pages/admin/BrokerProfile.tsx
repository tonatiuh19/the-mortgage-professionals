import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Award,
  Camera,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
  Building2,
  PhoneForwarded,
  Monitor,
  Smartphone,
  Zap,
  Globe,
  RefreshCw,
  Plus,
  Voicemail,
  Volume2,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConversationMailbox } from "@shared/api";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokerProfile,
  updateBrokerProfile,
  uploadBrokerAvatar,
  clearProfileError,
} from "@/store/slices/brokerAuthSlice";
import {
  connectOffice365Mailbox,
  disconnectConversationMailbox,
  fetchConversationMailboxes,
  syncConversationMailbox,
} from "@/store/slices/conversationsSlice";
import {
  fetchCallForwardingSettings,
  saveCallForwardingSettings,
  fetchVoicemailSettings,
  saveVoicemailSettings,
  saveTenantVoicemailSettings,
  type VoicemailSettingsResponse,
} from "@/store/slices/voiceSlice";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  {
    value: "America/New_York",
    label: "Eastern Time (ET)",
    cities: "New York, Miami, Atlanta",
  },
  {
    value: "America/Chicago",
    label: "Central Time (CT)",
    cities: "Chicago, Dallas, Houston",
  },
  {
    value: "America/Denver",
    label: "Mountain Time (MT)",
    cities: "Denver, Salt Lake City",
  },
  {
    value: "America/Phoenix",
    label: "Mountain – no DST (MT)",
    cities: "Phoenix, Tucson",
  },
  {
    value: "America/Los_Angeles",
    label: "Pacific Time (PT)",
    cities: "Los Angeles, Seattle, Las Vegas",
  },
  {
    value: "America/Anchorage",
    label: "Alaska Time (AKT)",
    cities: "Anchorage, Fairbanks",
  },
  {
    value: "Pacific/Honolulu",
    label: "Hawaii Time (HST)",
    cities: "Honolulu, Maui",
  },
];

function tzOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

const SPECIALIZATION_OPTIONS = [
  "First-Time Home Buyers",
  "Refinancing",
  "Investment Properties",
  "Jumbo Loans",
  "FHA Loans",
  "VA Loans",
  "Conventional Loans",
  "Commercial",
  "Reverse Mortgages",
];

const profileSchema = Yup.object({
  first_name: Yup.string().required("First name is required"),
  last_name: Yup.string().required("Last name is required"),
  phone: Yup.string().nullable(),
  license_number: Yup.string().nullable(),
  bio: Yup.string().nullable().max(500, "Bio must be 500 characters or less"),
  office_address: Yup.string().nullable(),
  office_city: Yup.string().nullable(),
  office_state: Yup.string().nullable(),
  office_zip: Yup.string().nullable(),
  years_experience: Yup.number()
    .nullable()
    .min(0, "Must be 0 or more")
    .max(60, "Must be 60 or less"),
});

const BrokerProfile = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle Office365 OAuth callback redirect
  useEffect(() => {
    const result = searchParams.get("office365");
    if (!result) return;
    if (result === "connected") {
      toast({
        title: "Email Inbox connected",
        description: "Your Office 365 mailbox is now active.",
      });
      dispatch(fetchConversationMailboxes());
    } else if (result === "error") {
      const reason = searchParams.get("reason") || "unknown_error";
      const expected = searchParams.get("expected");
      const got = searchParams.get("got");
      const description =
        reason === "account_mismatch" && expected && got
          ? `Wrong Microsoft account signed in. Expected ${expected} but got ${got}. Please sign in with the correct account.`
          : `Could not connect the Office 365 mailbox: ${reason.replace(/_/g, " ")}.`;
      toast({
        title: "Connection failed",
        description,
        variant: "destructive",
      });
    }
    navigate("/admin/profile", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { user, profileLoading, profileSaving, avatarUploading, profileError } =
    useAppSelector((state) => state.brokerAuth);
  const { sessionToken } = useAppSelector((s) => s.brokerAuth);

  // ── Call forwarding state ────────────────────────────────────────────────
  const [fwdEnabled, setFwdEnabled] = useState(false);
  const [fwdPhone, setFwdPhone] = useState("");
  const [fwdLoading, setFwdLoading] = useState(false);
  const [fwdSaving, setFwdSaving] = useState(false);

  // ── Voicemail settings ─────────────────────────────────────────────
  const [vmLoading, setVmLoading] = useState(false);
  const [vmSaving, setVmSaving] = useState(false);
  const [vmData, setVmData] = useState<VoicemailSettingsResponse | null>(null);
  // null = "inherit tenant default"
  const [vmEnabled, setVmEnabled] = useState<boolean | null>(null);
  const [vmGreetingText, setVmGreetingText] = useState("");
  const [vmGreetingUrl, setVmGreetingUrl] = useState("");
  // tenant-level (admin only)
  const [tenantVmEnabled, setTenantVmEnabled] = useState(true);
  const [tenantVmGreetingText, setTenantVmGreetingText] = useState("");
  const [tenantVmGreetingUrl, setTenantVmGreetingUrl] = useState("");
  const [tenantVmMaxSeconds, setTenantVmMaxSeconds] = useState(120);
  const [tenantVmTranscribe, setTenantVmTranscribe] = useState(true);

  // ── Email mailbox state ──────────────────────────────────────────────────
  const myMailbox = useAppSelector((s) =>
    (s.conversations.mailboxes as ConversationMailbox[]).find(
      (m) =>
        m.assigned_broker_id === user?.id ||
        (m.is_shared && m.status === "active"),
    ),
  );
  const myOwnMailbox = useAppSelector((s) =>
    (s.conversations.mailboxes as ConversationMailbox[]).find(
      (m) => m.assigned_broker_id === user?.id,
    ),
  );
  const isLoadingMailboxes = useAppSelector(
    (s) => s.conversations.isLoadingMailboxes,
  );
  const isConnectingMailbox = useAppSelector(
    (s) => s.conversations.isConnectingMailbox,
  );
  const [mailboxEmailInput, setMailboxEmailInput] = useState("");
  const [isSyncingMyMailbox, setIsSyncingMyMailbox] = useState(false);

  useEffect(() => {
    dispatch(fetchConversationMailboxes());
  }, [dispatch]);

  const handleConnectMyMailbox = async (emailOverride?: string) => {
    const email = (emailOverride ?? mailboxEmailInput).trim();
    if (!email.includes("@")) return;

    try {
      const result = await dispatch(
        connectOffice365Mailbox({
          mailbox_email: email,
          is_shared: false,
          return_path: "/admin/profile",
        }),
      ).unwrap();
      if (result.auth_url) window.location.href = result.auth_url;
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err || "Could not start Office365 authentication",
        variant: "destructive",
      });
    }
  };

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnectMyMailbox = async (mailboxId: number) => {
    setIsDisconnecting(true);
    try {
      await dispatch(disconnectConversationMailbox(mailboxId)).unwrap();
      toast({
        title: "Mailbox disconnected",
        description: "You can connect a new account at any time.",
      });
    } catch (err: any) {
      toast({
        title: "Disconnect failed",
        description: err || "Could not disconnect the mailbox",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSyncMyMailbox = async (mailboxId: number) => {
    setIsSyncingMyMailbox(true);
    try {
      const result = await dispatch(
        syncConversationMailbox(mailboxId),
      ).unwrap();
      toast({
        title: "Sync complete",
        description: `Processed ${result.processed} new message(s).`,
      });
    } catch (err: any) {
      toast({
        title: "Sync failed",
        description: err || "Could not sync mailbox",
        variant: "destructive",
      });
    } finally {
      setIsSyncingMyMailbox(false);
    }
  };

  const loadFwdSettings = async () => {
    setFwdLoading(true);
    try {
      const data = await dispatch(fetchCallForwardingSettings()).unwrap();
      if (data.success) {
        setFwdEnabled(!!data.call_forwarding_enabled);
        setFwdPhone(data.call_forwarding_number ?? "");
      }
    } catch {
      // graceful degradation
    } finally {
      setFwdLoading(false);
    }
  };

  useEffect(() => {
    loadFwdSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // ── Voicemail loaders / savers ────────────────────────────────────────
  const loadVmSettings = async () => {
    setVmLoading(true);
    try {
      const data = await dispatch(fetchVoicemailSettings()).unwrap();
      if (data?.success) {
        setVmData(data);
        setVmEnabled(data.broker.voicemail_enabled);
        setVmGreetingText(data.broker.voicemail_greeting_text ?? "");
        setVmGreetingUrl(data.broker.voicemail_greeting_url ?? "");
        setTenantVmEnabled(!!data.tenant.voicemail_enabled);
        setTenantVmGreetingText(data.tenant.voicemail_greeting_text ?? "");
        setTenantVmGreetingUrl(data.tenant.voicemail_greeting_url ?? "");
        setTenantVmMaxSeconds(data.tenant.voicemail_max_seconds || 120);
        setTenantVmTranscribe(!!data.tenant.voicemail_transcribe);
      }
    } catch {
      // graceful degradation
    } finally {
      setVmLoading(false);
    }
  };

  useEffect(() => {
    loadVmSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const saveVoicemail = async () => {
    setVmSaving(true);
    try {
      // Save broker-level overrides
      await dispatch(
        saveVoicemailSettings({
          enabled: vmEnabled,
          greeting_text: vmGreetingText.trim() ? vmGreetingText.trim() : null,
          greeting_url: vmGreetingUrl.trim() ? vmGreetingUrl.trim() : null,
        }),
      ).unwrap();

      // Save tenant-level defaults if user is admin
      if (user?.role === "admin") {
        await dispatch(
          saveTenantVoicemailSettings({
            enabled: tenantVmEnabled,
            greeting_text: tenantVmGreetingText.trim()
              ? tenantVmGreetingText.trim()
              : null,
            greeting_url: tenantVmGreetingUrl.trim()
              ? tenantVmGreetingUrl.trim()
              : null,
            max_seconds: tenantVmMaxSeconds,
            transcribe: tenantVmTranscribe,
          }),
        ).unwrap();
      }

      toast({
        title: "Voicemail saved",
        description: "Your voicemail settings have been updated.",
      });
      // Refresh to show resolved state
      loadVmSettings();
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVmSaving(false);
    }
  };

  const saveForwarding = async () => {
    setFwdSaving(true);
    try {
      const data = await dispatch(
        saveCallForwardingSettings({ enabled: fwdEnabled, phone: fwdPhone }),
      ).unwrap();
      if (data.success) {
        setFwdPhone(data.call_forwarding_phone ?? fwdPhone);
        toast({
          title: "Call forwarding saved",
          description: fwdEnabled
            ? `Calls will also ring ${data.call_forwarding_phone ?? fwdPhone}`
            : "Forwarding disabled.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFwdSaving(false);
    }
  };

  useEffect(() => {
    dispatch(fetchBrokerProfile());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearProfileError());
    };
  }, [dispatch]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      license_number: user?.license_number || "",
      bio: user?.bio || "",
      office_address: user?.office_address || "",
      office_city: user?.office_city || "",
      office_state: user?.office_state || "",
      office_zip: user?.office_zip || "",
      years_experience: user?.years_experience ?? "",
      specializations: user?.specializations || [],
      timezone: user?.timezone || "America/Los_Angeles",
    },
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      const result = await dispatch(
        updateBrokerProfile({
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone || undefined,
          license_number: values.license_number || undefined,
          bio: values.bio || undefined,
          office_address: values.office_address || undefined,
          office_city: values.office_city || undefined,
          office_state: values.office_state || undefined,
          office_zip: values.office_zip || undefined,
          years_experience:
            values.years_experience !== ""
              ? Number(values.years_experience)
              : null,
          specializations: values.specializations,
          timezone: values.timezone || "America/Los_Angeles",
        }),
      );

      if (updateBrokerProfile.fulfilled.match(result)) {
        toast({
          title: "Profile updated",
          description: "Your profile has been saved successfully.",
        });
        // Re-sync forwarding phone in case profile phone changed
        loadFwdSettings();
      } else {
        toast({
          title: "Update failed",
          description: (result.payload as string) || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleAvatarUpload = async (file: File) => {
    const result = await dispatch(uploadBrokerAvatar(file));
    if (uploadBrokerAvatar.fulfilled.match(result)) {
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated.",
      });
    } else {
      toast({
        title: "Upload failed",
        description: (result.payload as string) || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleSpecialization = (spec: string) => {
    const current = formik.values.specializations;
    if (current.includes(spec)) {
      formik.setFieldValue(
        "specializations",
        current.filter((s) => s !== spec),
      );
    } else {
      formik.setFieldValue("specializations", [...current, spec]);
    }
  };

  const initials = user
    ? `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`
    : "?";

  if (profileLoading && !user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "My Profile",
          "Manage your realtor profile and settings",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <PageHeader
          title="My Profile"
          description="Manage your personal information, contact details, and public-facing profile."
          className="mb-6 sm:mb-8"
          actions={
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => formik.resetForm()}
                disabled={profileSaving || !formik.dirty}
              >
                Discard
              </Button>
              <Button
                type="button"
                disabled={profileSaving || !formik.dirty}
                className="gap-2"
                onClick={() => formik.submitForm()}
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          }
        />

        {profileError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Identity Hero Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Avatar with upload overlay */}
                  <ImageCropUploader
                    onUpload={handleAvatarUpload}
                    uploading={avatarUploading}
                    circularCrop
                    className="shrink-0"
                  >
                    <div className="relative group cursor-pointer">
                      <Avatar className="h-20 w-20 ring-4 ring-primary/15">
                        <AvatarImage
                          src={user?.avatar_url ?? undefined}
                          alt="Profile photo"
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {avatarUploading ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </div>
                    </div>
                  </ImageCropUploader>

                  {/* Identity summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-gray-900">
                        {user ? `${user.first_name} ${user.last_name}` : "—"}
                      </h2>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary border-0"
                      >
                        {user?.role === "admin" ? "Mortgage Banker" : "Partner"}
                      </Badge>
                    </div>
                    {user?.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {user.email}
                      </p>
                    )}
                    <ImageCropUploader
                      onUpload={handleAvatarUpload}
                      uploading={avatarUploading}
                      circularCrop
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs h-8"
                        disabled={avatarUploading}
                      >
                        {avatarUploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Camera className="h-3.5 w-3.5" />
                        )}
                        {avatarUploading ? "Uploading…" : "Change photo"}
                      </Button>
                    </ImageCropUploader>
                  </div>

                  {/* Quick stats */}
                  {(user?.years_experience != null ||
                    (user?.total_loans_closed ?? 0) > 0) && (
                    <div className="flex sm:flex-col gap-4 sm:gap-3 sm:text-right shrink-0">
                      {user?.years_experience != null && (
                        <div>
                          <p className="text-lg font-bold text-gray-900 leading-none">
                            {user.years_experience}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            yrs experience
                          </p>
                        </div>
                      )}
                      {(user?.total_loans_closed ?? 0) > 0 && (
                        <div>
                          <p className="text-lg font-bold text-gray-900 leading-none">
                            {user?.total_loans_closed}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            loans closed
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-primary" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Your name and contact details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formik.values.first_name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="First name"
                        className={cn(
                          formik.touched.first_name && formik.errors.first_name
                            ? "border-destructive"
                            : "",
                        )}
                      />
                      {formik.touched.first_name &&
                        formik.errors.first_name && (
                          <p className="text-xs text-destructive">
                            {formik.errors.first_name}
                          </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={formik.values.last_name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="Last name"
                        className={cn(
                          formik.touched.last_name && formik.errors.last_name
                            ? "border-destructive"
                            : "",
                        )}
                      />
                      {formik.touched.last_name && formik.errors.last_name && (
                        <p className="text-xs text-destructive">
                          {formik.errors.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={user?.email || ""}
                        disabled
                        className="pl-9 bg-muted/50 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed here.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        value={formik.values.phone}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="(555) 000-0000"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Professional Details
                  </CardTitle>
                  <CardDescription>
                    License, experience, and client-facing bio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="license_number">License Number</Label>
                      <div className="relative">
                        <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="license_number"
                          name="license_number"
                          value={formik.values.license_number}
                          onChange={formik.handleChange}
                          placeholder="NMLS #"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="years_experience">Years Experience</Label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="years_experience"
                          name="years_experience"
                          type="number"
                          min="0"
                          max="60"
                          value={formik.values.years_experience}
                          onChange={formik.handleChange}
                          placeholder="e.g. 8"
                          className="pl-9"
                        />
                      </div>
                      {formik.touched.years_experience &&
                        formik.errors.years_experience && (
                          <p className="text-xs text-destructive">
                            {formik.errors.years_experience}
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Your Timezone
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          const detected =
                            Intl.DateTimeFormat().resolvedOptions().timeZone;
                          const match = TIMEZONES.find(
                            (tz) => tz.value === detected,
                          );
                          if (match) formik.setFieldValue("timezone", detected);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Detect automatically
                      </button>
                    </div>
                    <Select
                      value={formik.values.timezone}
                      onValueChange={(v) => formik.setFieldValue("timezone", v)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(() => {
                            const tz = TIMEZONES.find(
                              (t) => t.value === formik.values.timezone,
                            );
                            return tz ? (
                              <span>
                                {tz.label}{" "}
                                <span className="text-muted-foreground text-xs">
                                  ({tzOffset(tz.value)})
                                </span>
                              </span>
                            ) : (
                              formik.values.timezone
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            <div className="flex flex-col py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{tz.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tzOffset(tz.value)}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {tz.cities}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used for scheduler time slots and conversation timestamps.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bio">
                      Bio{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        ({formik.values.bio?.length || 0}/500)
                      </span>
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      rows={5}
                      value={formik.values.bio}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="A short bio that clients will see on your public profile…"
                      className={cn(
                        "resize-none",
                        formik.touched.bio && formik.errors.bio
                          ? "border-destructive"
                          : "",
                      )}
                    />
                    {formik.touched.bio && formik.errors.bio && (
                      <p className="text-xs text-destructive">
                        {formik.errors.bio}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Specializations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Specializations
                </CardTitle>
                <CardDescription>
                  Select the loan types you specialize in — displayed on your
                  public profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATION_OPTIONS.map((spec) => {
                    const selected =
                      formik.values.specializations.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialization(spec)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          selected
                            ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                            : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {selected && (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        )}
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Call & Voicemail Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PhoneForwarded className="h-4 w-4 text-primary" />
                  Call &amp; Voicemail Settings
                </CardTitle>
                <CardDescription>
                  Choose where incoming CRM calls ring. Multiple destinations
                  ring simultaneously — first to answer wins.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {fwdLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings…
                  </div>
                ) : (
                  <>
                    {/* Forward Calls to — checkboxes */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Forward Calls to
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Browser — always on */}
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Monitor className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              Browser (Web App)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Always rings in the CRM
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-green-100 text-green-700 border-0 shrink-0"
                          >
                            Always on
                          </Badge>
                        </div>

                        {/* My Phone Number — toggle */}
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                            fwdEnabled
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                              fwdEnabled ? "bg-primary/15" : "bg-muted",
                            )}
                          >
                            <Smartphone
                              className={cn(
                                "h-4 w-4",
                                fwdEnabled
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              My Phone Number
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ring my personal cell
                            </p>
                          </div>
                          <Switch
                            checked={fwdEnabled}
                            onCheckedChange={setFwdEnabled}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Forwarding number input — shown when enabled */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        fwdEnabled
                          ? "max-h-40 opacity-100"
                          : "max-h-0 opacity-0 pointer-events-none",
                      )}
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="fwd_phone">Forwarding Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fwd_phone"
                            value={fwdPhone}
                            onChange={(e) => setFwdPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter your personal cell. Defaults to your profile
                          phone if left blank.
                        </p>
                      </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-3">
                      <Zap className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700">
                        When enabled, incoming calls ring your browser{" "}
                        <strong>and</strong> your personal phone simultaneously.
                        Answering on either one lets you handle the call.
                      </p>
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={saveForwarding}
                        disabled={fwdSaving}
                      >
                        {fwdSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Voicemail Greeting — only visible when banker has a personal Twilio number */}
            {vmLoading ? null : vmData?.broker.has_personal_line ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Voicemail className="h-4 w-4 text-primary" />
                    Voicemail
                  </CardTitle>
                  <CardDescription>
                    When no one picks up, callers hear a greeting and can leave
                    a message. Recordings (and transcriptions) appear in your
                    conversations inbox.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Personal Line Voicemail
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Callers who dial your dedicated number hear this
                          greeting if you don't pick up.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {vmEnabled === false ? "Disabled" : "Enabled"}
                        </span>
                        <Switch
                          checked={vmEnabled !== false}
                          onCheckedChange={(v) =>
                            setVmEnabled(v ? true : false)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">
                        Greeting (text-to-speech)
                      </Label>
                      <Textarea
                        rows={3}
                        placeholder={
                          vmData?.tenant.voicemail_greeting_text ||
                          "Hi, you've reached [your name]. Please leave a message after the tone…"
                        }
                        value={vmGreetingText}
                        onChange={(e) => setVmGreetingText(e.target.value)}
                        maxLength={1000}
                        className="text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Leave blank to inherit the team default. Max 1000
                        characters. Spoken in a natural female voice
                        (Polly.Joanna).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5" />
                        Pre-recorded Greeting (optional)
                      </Label>
                      <Input
                        type="url"
                        placeholder="https://… .mp3 or .wav"
                        value={vmGreetingUrl}
                        onChange={(e) => setVmGreetingUrl(e.target.value)}
                        className="text-sm"
                      />
                      {vmGreetingUrl ? (
                        <audio
                          controls
                          preload="none"
                          src={vmGreetingUrl}
                          className="w-full h-8 mt-1"
                        />
                      ) : null}
                      <p className="text-[11px] text-muted-foreground">
                        If set, this audio plays instead of the text-to-speech
                        greeting.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setVmEnabled(null);
                        setVmGreetingText("");
                        setVmGreetingUrl("");
                      }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Reset to team default
                    </button>
                  </div>

                  {/* Tenant-level (admin only) */}
                  {user?.role === "admin" ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Team Voicemail (Default)
                          </p>
                          <p className="text-xs text-amber-700/80">
                            Fallback greeting for any banker who hasn't
                            customized their own. Admin-only.
                          </p>
                        </div>
                        <Switch
                          checked={tenantVmEnabled}
                          onCheckedChange={setTenantVmEnabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">
                          Default greeting (text-to-speech)
                        </Label>
                        <Textarea
                          rows={3}
                          value={tenantVmGreetingText}
                          onChange={(e) =>
                            setTenantVmGreetingText(e.target.value)
                          }
                          maxLength={1000}
                          placeholder="Hello, you've reached [Company Name]. We can't take your call right now — please leave your name, number, and a brief message after the tone."
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5" />
                          Default pre-recorded greeting URL
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://… .mp3"
                          value={tenantVmGreetingUrl}
                          onChange={(e) =>
                            setTenantVmGreetingUrl(e.target.value)
                          }
                          className="text-sm"
                        />
                        {tenantVmGreetingUrl ? (
                          <audio
                            controls
                            preload="none"
                            src={tenantVmGreetingUrl}
                            className="w-full h-8 mt-1"
                          />
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Max length (seconds)
                          </Label>
                          <Input
                            type="number"
                            min={10}
                            max={600}
                            value={tenantVmMaxSeconds}
                            onChange={(e) =>
                              setTenantVmMaxSeconds(
                                parseInt(e.target.value, 10) || 120,
                              )
                            }
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Auto-transcribe</Label>
                          <div className="flex items-center gap-2 h-9">
                            <Switch
                              checked={tenantVmTranscribe}
                              onCheckedChange={setTenantVmTranscribe}
                            />
                            <span className="text-xs text-muted-foreground">
                              {tenantVmTranscribe ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={saveVoicemail}
                      disabled={vmSaving}
                    >
                      {vmSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save Voicemail Settings
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Email Mailbox */}
            <Card className={!user?.office365_enabled ? "opacity-60" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Inbox
                  {!user?.office365_enabled && (
                    <span className="ml-auto text-[10px] font-normal bg-muted text-muted-foreground rounded px-2 py-0.5 tracking-wide uppercase">
                      Not configured
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {user?.office365_enabled
                    ? "Connect your Office 365 mailbox so emails you send and receive in Conversations route through your personal address."
                    : "Office 365 integration is not yet configured for this platform. Contact your administrator to set up the Azure app credentials."}
                </CardDescription>
              </CardHeader>
              {user?.office365_enabled && (
                <CardContent className="space-y-4">
                  {isLoadingMailboxes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : myOwnMailbox ? (
                    /* Connected — show status + sync */
                    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          myOwnMailbox.status === "active"
                            ? "bg-green-500"
                            : myOwnMailbox.status === "error"
                              ? "bg-red-500"
                              : "bg-yellow-400",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {myOwnMailbox.mailbox_email}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {myOwnMailbox.status === "active"
                            ? myOwnMailbox.last_sync_at
                              ? `Last synced ${new Date(myOwnMailbox.last_sync_at).toLocaleString()}`
                              : "Connected — not yet synced"
                            : myOwnMailbox.status === "error"
                              ? myOwnMailbox.last_sync_error || "Sync error"
                              : myOwnMailbox.status === "disabled"
                                ? "Disconnected — click Connect to re-link"
                                : "Pending authorization"}
                        </p>
                      </div>
                      {myOwnMailbox.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs shrink-0"
                          onClick={() => handleSyncMyMailbox(myOwnMailbox.id)}
                          disabled={isSyncingMyMailbox}
                        >
                          <RefreshCw
                            className={cn(
                              "h-3.5 w-3.5",
                              isSyncingMyMailbox && "animate-spin",
                            )}
                          />
                          Sync now
                        </Button>
                      )}
                      {(myOwnMailbox.status === "pending" ||
                        myOwnMailbox.status === "disabled" ||
                        myOwnMailbox.status === "error") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs shrink-0"
                          onClick={() =>
                            handleConnectMyMailbox(myOwnMailbox.mailbox_email)
                          }
                          disabled={isConnectingMailbox}
                        >
                          {myOwnMailbox.status === "disabled"
                            ? "Connect"
                            : "Re-authorize"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          handleDisconnectMyMailbox(myOwnMailbox.id)
                        }
                        disabled={isDisconnecting}
                      >
                        {isDisconnecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </div>
                  ) : (
                    /* Not connected — show connect form */
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="yourname@themortgageprofessionals.net"
                            value={mailboxEmailInput}
                            onChange={(e) =>
                              setMailboxEmailInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConnectMyMailbox();
                            }}
                            className="pl-9 h-9 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 shrink-0"
                          onClick={() => handleConnectMyMailbox()}
                          disabled={
                            isConnectingMailbox ||
                            !mailboxEmailInput.trim().includes("@")
                          }
                        >
                          {isConnectingMailbox ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        You'll be redirected to Microsoft to authorize access.
                        Make sure the address is a valid Office 365 account.
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Office Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Office Address
                </CardTitle>
                <CardDescription>
                  Your office location displayed to clients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="office_address">Street Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="office_address"
                        name="office_address"
                        value={formik.values.office_address}
                        onChange={formik.handleChange}
                        placeholder="123 Main St, Suite 100"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="office_city">City</Label>
                    <Input
                      id="office_city"
                      name="office_city"
                      value={formik.values.office_city}
                      onChange={formik.handleChange}
                      placeholder="City"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="office_state">State</Label>
                      <Input
                        id="office_state"
                        name="office_state"
                        value={formik.values.office_state}
                        onChange={formik.handleChange}
                        placeholder="TX"
                        maxLength={2}
                        className="uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="office_zip">ZIP Code</Label>
                      <Input
                        id="office_zip"
                        name="office_zip"
                        value={formik.values.office_zip}
                        onChange={formik.handleChange}
                        placeholder="78701"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </>
  );
};

export default BrokerProfile;
