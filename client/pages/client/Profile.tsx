import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientProfile,
  updateClientProfile,
  selectClientProfile,
  selectProfileLoading,
} from "@/store/slices/clientPortalSlice";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const profile = useAppSelector(selectClientProfile);
  const loading = useAppSelector(selectProfileLoading);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchClientProfile());
  }, [dispatch]);

  const validationSchema = Yup.object({
    first_name: Yup.string().required("First name is required"),
    last_name: Yup.string().required("Last name is required"),
    phone: Yup.string(),
    alternate_phone: Yup.string(),
    address_street: Yup.string(),
    address_city: Yup.string(),
    address_state: Yup.string(),
    address_zip: Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      alternate_phone: profile?.alternate_phone || "",
      address_street: profile?.address_street || "",
      address_city: profile?.address_city || "",
      address_state: profile?.address_state || "",
      address_zip: profile?.address_zip || "",
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      const result = await dispatch(updateClientProfile(values));
      if (updateClientProfile.fulfilled.match(result)) {
        setIsEditing(false);
        toast({
          title: "Profile Updated! ✅",
          description: "Your profile has been updated successfully.",
        });
      }
    },
  });

  const handleCancel = () => {
    formik.resetForm();
    setIsEditing(false);
  };

  const getInitials = () => {
    if (!profile) return "CL";
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-white/30 shadow-2xl">
            <AvatarFallback className="bg-gradient-to-br from-white/20 to-white/10 text-white text-3xl font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="opacity-90 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {profile.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {profile.email_verified ? (
                <Badge className="bg-green-500/20 text-white border-white/30">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-orange-500/20 text-white border-white/30">
                  <Shield className="h-3 w-3 mr-1" />
                  Unverified
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30">
                {profile.status}
              </Badge>
            </div>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <form onSubmit={formik.handleSubmit}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="gap-2"
                    disabled={formik.isSubmitting}
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      {...formik.getFieldProps("first_name")}
                      className={
                        formik.touched.first_name && formik.errors.first_name
                          ? "border-destructive"
                          : ""
                      }
                    />
                  ) : (
                    <p className="text-lg font-medium">{profile.first_name}</p>
                  )}
                  {formik.touched.first_name && formik.errors.first_name && (
                    <p className="text-sm text-destructive">
                      {formik.errors.first_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      {...formik.getFieldProps("last_name")}
                      className={
                        formik.touched.last_name && formik.errors.last_name
                          ? "border-destructive"
                          : ""
                      }
                    />
                  ) : (
                    <p className="text-lg font-medium">{profile.last_name}</p>
                  )}
                  {formik.touched.last_name && formik.errors.last_name && (
                    <p className="text-sm text-destructive">
                      {formik.errors.last_name}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact Information
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Primary Phone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        type="tel"
                        {...formik.getFieldProps("phone")}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {profile.phone || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternate_phone">Alternate Phone</Label>
                    {isEditing ? (
                      <Input
                        id="alternate_phone"
                        type="tel"
                        {...formik.getFieldProps("alternate_phone")}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {profile.alternate_phone || "Not provided"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <p className="text-lg font-medium">{profile.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Address
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_street">Street Address</Label>
                    {isEditing ? (
                      <Input
                        id="address_street"
                        {...formik.getFieldProps("address_street")}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {profile.address_street || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="address_city">City</Label>
                      {isEditing ? (
                        <Input
                          id="address_city"
                          {...formik.getFieldProps("address_city")}
                        />
                      ) : (
                        <p className="text-lg font-medium">
                          {profile.address_city || "Not provided"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_state">State</Label>
                      {isEditing ? (
                        <Input
                          id="address_state"
                          {...formik.getFieldProps("address_state")}
                        />
                      ) : (
                        <p className="text-lg font-medium">
                          {profile.address_state || "Not provided"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_zip">ZIP Code</Label>
                      {isEditing ? (
                        <Input
                          id="address_zip"
                          {...formik.getFieldProps("address_zip")}
                        />
                      ) : (
                        <p className="text-lg font-medium">
                          {profile.address_zip || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Additional Information
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <p className="text-lg font-medium">
                      {new Date(profile.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  {profile.employment_status && (
                    <div className="space-y-2">
                      <Label>Employment Status</Label>
                      <p className="text-lg font-medium">
                        {profile.employment_status}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Income Type</Label>
                    <p className="text-lg font-medium">{profile.income_type}</p>
                  </div>

                  {profile.annual_income && (
                    <div className="space-y-2">
                      <Label>Annual Income</Label>
                      <p className="text-lg font-medium">
                        ${profile.annual_income.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </div>
  );
};

export default Profile;
