import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  User,
  MapPin,
  Briefcase,
  Loader2,
  Camera,
  Globe,
  Share2,
} from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { Broker } from "@shared/api";
import { logger } from "@/lib/logger";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokerProfileForEdit,
  uploadBrokerAvatarByAdmin,
  clearSelectedBrokerProfile,
} from "@/store/slices/brokersSlice";
import { useToast } from "@/hooks/use-toast";
import ImageCropUploader from "@/components/ImageCropUploader";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BrokerWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: BrokerFormValues) => Promise<void>;
  broker?: Broker | null;
  mode: "create" | "edit";
}

export interface BrokerFormValues {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "broker" | "admin";
  license_number: string;
  specializations: string[];
  // Profile fields
  bio: string;
  office_address: string;
  office_city: string;
  office_state: string;
  office_zip: string;
  years_experience: string;
  // Social networks
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  twitter_url: string;
  youtube_url: string;
  website_url: string;
}

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email address").required("Required"),
  first_name: Yup.string()
    .min(2, "Must be at least 2 characters")
    .required("Required"),
  last_name: Yup.string()
    .min(2, "Must be at least 2 characters")
    .required("Required"),
  phone: Yup.string()
    .matches(/^[\d\s\-\+\(\)]+$/, "Invalid phone number")
    .optional(),
  role: Yup.string().oneOf(["broker", "admin"]).required("Required"),
  license_number: Yup.string().optional(),
  specializations: Yup.array().of(Yup.string()).optional(),
  bio: Yup.string().max(500, "Max 500 characters").optional(),
  office_address: Yup.string().optional(),
  office_city: Yup.string().optional(),
  office_state: Yup.string().optional(),
  office_zip: Yup.string().optional(),
  years_experience: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or more")
    .max(60, "Must be 60 or less")
    .optional()
    .nullable(),
  facebook_url: Yup.string().url("Must be a valid URL").optional().nullable(),
  instagram_url: Yup.string().url("Must be a valid URL").optional().nullable(),
  linkedin_url: Yup.string().url("Must be a valid URL").optional().nullable(),
  twitter_url: Yup.string().url("Must be a valid URL").optional().nullable(),
  youtube_url: Yup.string().url("Must be a valid URL").optional().nullable(),
  website_url: Yup.string().url("Must be a valid URL").optional().nullable(),
});

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

type WizardTab = "info" | "profile";

export function BrokerWizard({
  open,
  onClose,
  onSubmit,
  broker,
  mode,
}: BrokerWizardProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<WizardTab>("info");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { selectedBrokerProfile, profileLoading } = useAppSelector(
    (state) => state.brokers,
  );

  // Fetch full profile when editing
  useEffect(() => {
    if (open && mode === "edit" && broker?.id) {
      dispatch(fetchBrokerProfileForEdit(broker.id));
    }
    if (!open) {
      setActiveTab("info");
      dispatch(clearSelectedBrokerProfile());
    }
  }, [open, mode, broker?.id, dispatch]);

  const formik = useFormik<BrokerFormValues>({
    initialValues: {
      email: broker?.email || "",
      first_name: broker?.first_name || "",
      last_name: broker?.last_name || "",
      phone: broker?.phone || "",
      role: broker?.role || "broker",
      license_number: broker?.license_number || "",
      specializations:
        broker?.specializations && Array.isArray(broker.specializations)
          ? broker.specializations
          : [],
      bio: "",
      office_address: "",
      office_city: "",
      office_state: "",
      office_zip: "",
      years_experience: "",
      facebook_url: "",
      instagram_url: "",
      linkedin_url: "",
      twitter_url: "",
      youtube_url: "",
      website_url: "",
    },
    validationSchema,
    enableReinitialize: true,
    validateOnMount: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
        formik.resetForm();
        onClose();
      } catch (error) {
        logger.error("Error submitting broker form:", error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Pre-fill profile fields once they load
  useEffect(() => {
    if (selectedBrokerProfile && mode === "edit") {
      formik.setValues((prev) => ({
        ...prev,
        bio: selectedBrokerProfile.bio || "",
        office_address: selectedBrokerProfile.office_address || "",
        office_city: selectedBrokerProfile.office_city || "",
        office_state: selectedBrokerProfile.office_state || "",
        office_zip: selectedBrokerProfile.office_zip || "",
        years_experience:
          selectedBrokerProfile.years_experience != null
            ? String(selectedBrokerProfile.years_experience)
            : "",
        facebook_url: (selectedBrokerProfile as any).facebook_url || "",
        instagram_url: (selectedBrokerProfile as any).instagram_url || "",
        linkedin_url: (selectedBrokerProfile as any).linkedin_url || "",
        twitter_url: (selectedBrokerProfile as any).twitter_url || "",
        youtube_url: (selectedBrokerProfile as any).youtube_url || "",
        website_url: (selectedBrokerProfile as any).website_url || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrokerProfile]);

  const handleAddSpecialization = (spec: string) => {
    if (!formik.values.specializations.includes(spec)) {
      formik.setFieldValue("specializations", [
        ...formik.values.specializations,
        spec,
      ]);
    }
  };

  const handleRemoveSpecialization = (spec: string) => {
    formik.setFieldValue(
      "specializations",
      formik.values.specializations.filter((s) => s !== spec),
    );
  };

  const handleAvatarUpload = async (file: File) => {
    if (!broker?.id) return;
    setAvatarUploading(true);
    try {
      await dispatch(
        uploadBrokerAvatarByAdmin({ id: broker.id, file }),
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

  const currentAvatar =
    selectedBrokerProfile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${broker?.first_name || ""} ${broker?.last_name || ""}`,
    )}&background=e8192c&color=fff&size=128`;

  const tabs: { id: WizardTab; label: string }[] = [
    { id: "info", label: "Basic Info" },
    { id: "profile", label: "Profile & Bio" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold">
            {mode === "create" ? "Add New Broker" : "Edit Broker"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {mode === "create"
              ? "Create a new broker account with the details below."
              : "Update broker information and profile."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-1 px-6 pt-3 pb-0 bg-gray-50 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "text-red-600 border-red-600 bg-white"
                  : "text-gray-500 border-transparent hover:text-gray-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={formik.handleSubmit}>
            <AnimatePresence mode="wait">
              {/* ── Basic Info Tab ─────────────────────────────────────── */}
              {activeTab === "info" && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 px-6 py-5"
                >
                  {/* Personal Information */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-red-500" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Personal Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="first_name">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="first_name"
                          {...formik.getFieldProps("first_name")}
                          className={
                            formik.touched.first_name &&
                            formik.errors.first_name
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {formik.touched.first_name &&
                          formik.errors.first_name && (
                            <p className="text-xs text-red-500">
                              {formik.errors.first_name}
                            </p>
                          )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="last_name">
                          Last Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="last_name"
                          {...formik.getFieldProps("last_name")}
                          className={
                            formik.touched.last_name && formik.errors.last_name
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {formik.touched.last_name &&
                          formik.errors.last_name && (
                            <p className="text-xs text-destructive">
                              {formik.errors.last_name}
                            </p>
                          )}
                      </div>
                    </div>
                  </section>

                  {/* Contact Information */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          {...formik.getFieldProps("email")}
                          disabled={mode === "edit"}
                          className={
                            formik.touched.email && formik.errors.email
                              ? "border-destructive"
                              : mode === "edit"
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                          }
                        />
                        {formik.touched.email && formik.errors.email && (
                          <p className="text-xs text-destructive">
                            {formik.errors.email}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...formik.getFieldProps("phone")}
                          className={
                            formik.touched.phone && formik.errors.phone
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {formik.touched.phone && formik.errors.phone && (
                          <p className="text-xs text-red-500">
                            {formik.errors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Professional Information */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-red-500" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Professional Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="role">
                          Role <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formik.values.role}
                          onValueChange={(value) =>
                            formik.setFieldValue("role", value)
                          }
                        >
                          <SelectTrigger id="role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="broker">Partner</SelectItem>
                            <SelectItem value="admin">
                              Mortgage Banker
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {formik.touched.role && formik.errors.role && (
                          <p className="text-xs text-red-500">
                            {formik.errors.role}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="license_number">License Number</Label>
                        <Input
                          id="license_number"
                          {...formik.getFieldProps("license_number")}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Specializations */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Specializations
                    </h3>
                    <div className="space-y-3">
                      <Select onValueChange={handleAddSpecialization}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          {specializationOptions
                            .filter(
                              (opt) =>
                                !formik.values.specializations.includes(opt),
                            )
                            .map((spec) => (
                              <SelectItem key={spec} value={spec}>
                                {spec}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {formik.values.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formik.values.specializations.map((spec) => (
                            <Badge
                              key={spec}
                              variant="secondary"
                              className="pl-3 pr-2 py-1"
                            >
                              {spec}
                              <button
                                type="button"
                                onClick={() => handleRemoveSpecialization(spec)}
                                className="ml-2 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </motion.div>
              )}

              {/* ── Profile & Bio Tab ─────────────────────────────────────── */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 px-6 py-5"
                >
                  {profileLoading && mode === "edit" ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-red-500 mr-3" />
                      <span className="text-sm text-gray-500">
                        Loading profile…
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Avatar — only available after broker is created */}
                      {mode === "edit" && (
                        <>
                          <section className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Camera className="h-4 w-4 text-red-500" />
                              <h3 className="text-sm font-semibold text-gray-900">
                                Profile Photo
                              </h3>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="relative shrink-0">
                                <img
                                  src={currentAvatar}
                                  alt="Avatar"
                                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                                />
                                {avatarUploading && (
                                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 space-y-1">
                                <p className="text-sm text-gray-500">
                                  Upload a square photo for the best result.
                                  Images are cropped and compressed
                                  automatically.
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
                                    disabled={avatarUploading}
                                    className="gap-2 mt-2"
                                  >
                                    <Camera className="h-3.5 w-3.5" />
                                    {avatarUploading
                                      ? "Uploading…"
                                      : "Change Photo"}
                                  </Button>
                                </ImageCropUploader>
                              </div>
                            </div>
                          </section>

                          <Separator />
                        </>
                      )}
                      {mode === "create" && (
                        <p className="text-xs text-gray-400 italic flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5" />
                          Profile photo can be set after the broker account is
                          created.
                        </p>
                      )}

                      {/* Bio */}
                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Bio
                        </h3>
                        <Textarea
                          id="bio"
                          placeholder="Tell clients about this broker's background and expertise…"
                          rows={4}
                          {...formik.getFieldProps("bio")}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-400 text-right">
                          {(formik.values.bio || "").length}/500
                        </p>
                        {formik.touched.bio && formik.errors.bio && (
                          <p className="text-xs text-red-500">
                            {formik.errors.bio}
                          </p>
                        )}
                      </section>

                      <Separator />

                      {/* Office Location */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Office Location
                          </h3>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="office_address">
                              Street Address
                            </Label>
                            <Input
                              id="office_address"
                              placeholder="123 Main St"
                              {...formik.getFieldProps("office_address")}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-1 space-y-1.5">
                              <Label htmlFor="office_city">City</Label>
                              <Input
                                id="office_city"
                                placeholder="Los Angeles"
                                {...formik.getFieldProps("office_city")}
                              />
                            </div>
                            <div className="col-span-1 space-y-1.5">
                              <Label htmlFor="office_state">State</Label>
                              <Input
                                id="office_state"
                                placeholder="CA"
                                maxLength={2}
                                {...formik.getFieldProps("office_state")}
                              />
                            </div>
                            <div className="col-span-1 space-y-1.5">
                              <Label htmlFor="office_zip">ZIP</Label>
                              <Input
                                id="office_zip"
                                placeholder="90001"
                                {...formik.getFieldProps("office_zip")}
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Years of Experience */}
                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Years of Experience
                        </h3>
                        <Input
                          id="years_experience"
                          type="number"
                          min={0}
                          max={60}
                          placeholder="e.g. 8"
                          {...formik.getFieldProps("years_experience")}
                          className="w-32"
                        />
                        {formik.touched.years_experience &&
                          formik.errors.years_experience && (
                            <p className="text-xs text-red-500">
                              {formik.errors.years_experience}
                            </p>
                          )}
                      </section>

                      <Separator />

                      {/* Social Networks */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-red-500" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Social Networks
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {/* Website */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="website_url"
                              className="flex items-center gap-1.5"
                            >
                              <Globe className="h-3.5 w-3.5 text-gray-400" />{" "}
                              Website
                            </Label>
                            <Input
                              id="website_url"
                              type="url"
                              placeholder="https://yourwebsite.com"
                              {...formik.getFieldProps("website_url")}
                            />
                            {formik.touched.website_url &&
                              formik.errors.website_url && (
                                <p className="text-xs text-red-500">
                                  {formik.errors.website_url}
                                </p>
                              )}
                          </div>
                          {/* LinkedIn */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="linkedin_url"
                              className="flex items-center gap-1.5"
                            >
                              <FaLinkedin className="h-3.5 w-3.5 text-[#0A66C2]" />{" "}
                              LinkedIn
                            </Label>
                            <Input
                              id="linkedin_url"
                              type="url"
                              placeholder="https://linkedin.com/in/yourprofile"
                              {...formik.getFieldProps("linkedin_url")}
                            />
                            {formik.touched.linkedin_url &&
                              formik.errors.linkedin_url && (
                                <p className="text-xs text-red-500">
                                  {formik.errors.linkedin_url}
                                </p>
                              )}
                          </div>
                          {/* Facebook */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="facebook_url"
                              className="flex items-center gap-1.5"
                            >
                              <FaFacebook className="h-3.5 w-3.5 text-[#1877F2]" />{" "}
                              Facebook
                            </Label>
                            <Input
                              id="facebook_url"
                              type="url"
                              placeholder="https://facebook.com/yourpage"
                              {...formik.getFieldProps("facebook_url")}
                            />
                            {formik.touched.facebook_url &&
                              formik.errors.facebook_url && (
                                <p className="text-xs text-red-500">
                                  {formik.errors.facebook_url}
                                </p>
                              )}
                          </div>
                          {/* Instagram */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="instagram_url"
                              className="flex items-center gap-1.5"
                            >
                              <FaInstagram className="h-3.5 w-3.5 text-[#E1306C]" />{" "}
                              Instagram
                            </Label>
                            <Input
                              id="instagram_url"
                              type="url"
                              placeholder="https://instagram.com/yourhandle"
                              {...formik.getFieldProps("instagram_url")}
                            />
                            {formik.touched.instagram_url &&
                              formik.errors.instagram_url && (
                                <p className="text-xs text-red-500">
                                  {formik.errors.instagram_url}
                                </p>
                              )}
                          </div>
                          {/* X / Twitter */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="twitter_url"
                              className="flex items-center gap-1.5"
                            >
                              <FaXTwitter className="h-3.5 w-3.5 text-gray-900" />{" "}
                              X
                            </Label>
                            <Input
                              id="twitter_url"
                              type="url"
                              placeholder="https://x.com/yourhandle"
                              {...formik.getFieldProps("twitter_url")}
                            />
                            {formik.touched.twitter_url &&
                              formik.errors.twitter_url && (
                                <p className="text-xs text-red-500">
                                  {formik.errors.twitter_url}
                                </p>
                              )}
                          </div>
                          {/* YouTube */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="youtube_url"
                              className="flex items-center gap-1.5"
                            >
                              <FaYoutube className="h-3.5 w-3.5 text-[#FF0000]" />{" "}
                              YouTube
                            </Label>
                            <Input
                              id="youtube_url"
                              type="url"
                              placeholder="https://youtube.com/@yourchannel"
                              {...formik.getFieldProps("youtube_url")}
                            />
                            {formik.touched.youtube_url &&
                              formik.errors.youtube_url && (
                                <p className="text-xs text-red-500">
                                  {formik.errors.youtube_url}
                                </p>
                              )}
                          </div>
                        </div>
                      </section>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formik.isSubmitting || !formik.isValid}
                className="min-w-[120px]"
              >
                {formik.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  "Create Broker"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
