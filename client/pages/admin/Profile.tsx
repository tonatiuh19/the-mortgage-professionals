import React, { useEffect } from "react";
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
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        }),
      );

      if (updateBrokerProfile.fulfilled.match(result)) {
        toast({
          title: "Profile updated",
          description: "Your profile has been saved successfully.",
        });
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
          "Manage your broker profile and settings",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <header className="mb-6 sm:mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              My Profile
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your personal information, contact details, and
              public-facing profile.
            </p>
          </div>
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
        </header>

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
