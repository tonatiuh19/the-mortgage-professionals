import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/store/hooks";
import {
  createEmailTemplate,
  createSmsTemplate,
  createWhatsappTemplate,
} from "@/store/slices/communicationTemplatesSlice";
import { fetchConversationTemplates } from "@/store/slices/conversationsSlice";

type ChannelType = "sms" | "email" | "whatsapp";

const CATEGORY_OPTIONS = [
  { value: "welcome", label: "Welcome" },
  { value: "reminder", label: "Reminder" },
  { value: "update", label: "Update" },
  { value: "follow_up", label: "Follow-up" },
  { value: "marketing", label: "Marketing" },
  { value: "system", label: "System" },
];

interface SaveAsTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channelType: ChannelType;
  defaultBody?: string;
  defaultSubject?: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required("Template name is required").max(255),
  body: Yup.string().required("Message body is required"),
  subject: Yup.string().when("$isEmail", {
    is: true,
    then: (s) => s.required("Subject is required for email templates"),
    otherwise: (s) => s.optional(),
  }),
});

const SaveAsTemplateDialog = ({
  isOpen,
  onClose,
  channelType,
  defaultBody = "",
  defaultSubject = "",
}: SaveAsTemplateDialogProps) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [category, setCategory] = useState("follow_up");

  const computedValidationSchema = Yup.object({
    name: Yup.string().required("Template name is required").max(255),
    body: Yup.string().required("Message body is required"),
    subject:
      channelType === "email"
        ? Yup.string().required("Subject is required for email templates")
        : Yup.string().optional(),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      subject: defaultSubject,
      body: defaultBody,
    },
    validationSchema: computedValidationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (channelType === "email") {
          await dispatch(
            createEmailTemplate({
              name: values.name,
              subject: values.subject || "",
              body_html: values.body,
              body_text: values.body,
              template_type: category,
              is_active: true,
            }),
          ).unwrap();
        } else if (channelType === "sms") {
          await dispatch(
            createSmsTemplate({
              name: values.name,
              body: values.body,
              template_type: category,
              is_active: true,
            }),
          ).unwrap();
        } else {
          await dispatch(
            createWhatsappTemplate({
              name: values.name,
              body: values.body,
              template_type: category,
              is_active: true,
            }),
          ).unwrap();
        }

        // Refresh the templates dropdown in compose boxes
        dispatch(fetchConversationTemplates(undefined));

        toast({
          title: "Template saved",
          description: `"${values.name}" is now available in the templates picker.`,
        });

        resetForm();
        setCategory("follow_up");
        onClose();
      } catch (err: any) {
        toast({
          title: "Failed to save template",
          description: err?.message || String(err),
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Sync body/subject when dialog opens with new defaults
  useEffect(() => {
    if (isOpen) {
      formik.setFieldValue("body", defaultBody);
      formik.setFieldValue("subject", defaultSubject);
      formik.setFieldValue("name", "");
      formik.setFieldValue("description", "");
      formik.setErrors({});
      setCategory("follow_up");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultBody, defaultSubject]);

  const channelLabel =
    channelType === "sms"
      ? "SMS"
      : channelType === "email"
        ? "Email"
        : "WhatsApp";

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5 text-primary" />
            Save as {channelLabel} Template
          </DialogTitle>
          <DialogDescription>
            Save this message as a reusable template. You can manage all
            templates under{" "}
            <a
              href="/admin/communication-templates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Message Templates
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tmpl-name"
              name="name"
              placeholder="e.g. 30-Day Follow-up SMS"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              autoFocus
            />
            {formik.touched.name && formik.errors.name && (
              <p className="text-[11px] text-destructive">
                {formik.errors.name}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject (email only) */}
          {channelType === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="tmpl-subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tmpl-subject"
                name="subject"
                placeholder="Email subject line"
                value={formik.values.subject}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.subject && formik.errors.subject && (
                <p className="text-[11px] text-destructive">
                  {formik.errors.subject}
                </p>
              )}
            </div>
          )}

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-body">
              Message Body <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="tmpl-body"
              name="body"
              value={formik.values.body}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="min-h-[100px] text-sm resize-none"
            />
            {formik.touched.body && formik.errors.body && (
              <p className="text-[11px] text-destructive">
                {formik.errors.body}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={formik.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAsTemplateDialog;
