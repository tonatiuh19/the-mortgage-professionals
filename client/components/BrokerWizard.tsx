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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { Broker } from "@shared/api";

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

export function BrokerWizard({
  open,
  onClose,
  onSubmit,
  broker,
  mode,
}: BrokerWizardProps) {
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
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
        formik.resetForm();
        onClose();
      } catch (error) {
        console.error("Error submitting broker form:", error);
      } finally {
        setSubmitting(false);
      }
    },
  });

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Broker" : "Edit Broker"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new broker account with the details below."
              : "Update broker information. Leave fields empty to keep current values."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-6 pt-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...formik.getFieldProps("first_name")}
                  className={
                    formik.touched.first_name && formik.errors.first_name
                      ? "border-red-500"
                      : ""
                  }
                />
                {formik.touched.first_name && formik.errors.first_name && (
                  <p className="text-xs text-red-500">
                    {formik.errors.first_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
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
                {formik.touched.last_name && formik.errors.last_name && (
                  <p className="text-xs text-destructive">
                    {formik.errors.last_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
                      : ""
                  }
                />
                {formik.touched.email && formik.errors.email && (
                  <p className="text-xs text-destructive">
                    {formik.errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
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
                  <p className="text-xs text-red-500">{formik.errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Professional Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formik.values.role}
                  onValueChange={(value) => formik.setFieldValue("role", value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {formik.touched.role && formik.errors.role && (
                  <p className="text-xs text-red-500">{formik.errors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  {...formik.getFieldProps("license_number")}
                />
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="space-y-4">
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
                      (opt) => !formik.values.specializations.includes(opt),
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formik.isSubmitting || !formik.isValid}
            >
              {formik.isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Broker"
                  : "Update Broker"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
