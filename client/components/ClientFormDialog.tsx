import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, MapPin } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { createClient, updateClient } from "@/store/slices/clientsSlice";
import { useToast } from "@/hooks/use-toast";
import type { GetClientsResponse } from "@shared/api";

type ClientRow = GetClientsResponse["clients"][0];

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When provided the dialog is in edit mode; otherwise create mode. */
  client?: ClientRow | null;
}

const validationSchema = Yup.object({
  first_name: Yup.string().trim().required("First name is required"),
  last_name: Yup.string().trim().required("Last name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string().trim(),
  date_of_birth: Yup.string(),
  address_street: Yup.string().trim(),
  address_city: Yup.string().trim(),
  address_state: Yup.string().trim(),
  address_zip: Yup.string().trim(),
});

const ClientFormDialog: React.FC<ClientFormDialogProps> = ({
  open,
  onClose,
  client,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const isEdit = !!client;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: client?.first_name ?? "",
      last_name: client?.last_name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      date_of_birth: client?.date_of_birth
        ? client.date_of_birth.split("T")[0]
        : "",
      address_street: "",
      address_city: "",
      address_state: "",
      address_zip: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        if (isEdit) {
          await dispatch(
            updateClient({
              clientId: client.id,
              payload: {
                first_name: values.first_name,
                last_name: values.last_name,
                phone: values.phone || undefined,
                date_of_birth: values.date_of_birth || undefined,
                address_street: values.address_street || undefined,
                address_city: values.address_city || undefined,
                address_state: values.address_state || undefined,
                address_zip: values.address_zip || undefined,
              },
            }),
          ).unwrap();
          toast({
            title: "Client updated",
            description: `${values.first_name} ${values.last_name} has been updated.`,
          });
        } else {
          await dispatch(
            createClient({
              first_name: values.first_name,
              last_name: values.last_name,
              email: values.email,
              phone: values.phone || undefined,
            }),
          ).unwrap();
          toast({
            title: "Client created",
            description: `${values.first_name} ${values.last_name} has been added.`,
          });
        }
        onClose();
      } catch (err: any) {
        toast({
          title: isEdit ? "Update failed" : "Create failed",
          description: err || "Something went wrong.",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const field = (
    name: keyof typeof formik.values,
    label: string,
    type = "text",
    placeholder = "",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        className={
          formik.touched[name] && formik.errors[name]
            ? "border-destructive focus-visible:ring-destructive"
            : ""
        }
      />
      {formik.touched[name] && formik.errors[name] && (
        <p className="text-xs text-destructive">{formik.errors[name]}</p>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          formik.resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Client" : "New Client"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-5 mt-2">
          {/* Basic info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Basic Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("first_name", "First Name", "text", "Jane")}
              {field("last_name", "Last Name", "text", "Doe")}
            </div>
            <div className="mt-3 space-y-3">
              {field("email", "Email", "email", "jane@example.com")}
              {isEdit && (
                <p className="text-xs text-muted-foreground -mt-1">
                  Email cannot be changed after creation.
                </p>
              )}
              {field("phone", "Phone", "tel", "(555) 000-0000")}
              {field("date_of_birth", "Date of Birth", "date")}
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Address{" "}
              <span className="font-normal normal-case">(optional)</span>
            </p>
            <div className="space-y-3">
              {field("address_street", "Street", "text", "123 Main St")}
              <div className="grid grid-cols-3 gap-3">
                {field("address_city", "City", "text", "Los Angeles")}
                {field("address_state", "State", "text", "CA")}
                {field("address_zip", "ZIP", "text", "90001")}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                formik.resetForm();
                onClose();
              }}
              disabled={formik.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;
