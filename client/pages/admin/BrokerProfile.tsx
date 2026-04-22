import React, { useEffect, useState } from "react";
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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokerProfile,
  updateBrokerProfile,
  uploadBrokerAvatar,
  clearProfileError,
} from "@/store/slices/brokerAuthSlice";
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
  const { user, profileLoading, profileSaving, avatarUploading, profileError } =
    useAppSelector((state) => state.brokerAuth);
  const { sessionToken } = useAppSelector((s) => s.brokerAuth);

  // ── Call forwarding state ────────────────────────────────────────────────
  const [fwdEnabled, setFwdEnabled] = useState(false);
  const [fwdPhone, setFwdPhone] = useState("");
  const [fwdLoading, setFwdLoading] = useState(false);
  const [fwdSaving, setFwdSaving] = useState(false);

  const loadFwdSettings = async () => {
    if (!sessionToken) return;
    setFwdLoading(true);
    try {
      const res = await fetch("/api/voice/call-forwarding", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setFwdEnabled(!!data.call_forwarding_enabled);
        setFwdPhone(data.call_forwarding_phone ?? "");
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

  const saveForwarding = async () => {
    if (!sessionToken) return;
    setFwdSaving(true);
    try {
      const res = await fetch("/api/voice/call-forwarding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ enabled: fwdEnabled, phone: fwdPhone }),
      });
      const data = await res.json();
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
