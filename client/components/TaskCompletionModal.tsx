import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Upload,
  CheckCircle2,
  X,
  Loader2,
  Home as HomeIcon,
  ClipboardList,
  AlertCircle,
  PenTool,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchTaskDetails,
  submitTaskForm,
  uploadTaskDocument,
  saveTaskDocumentMetadata,
  completeTask,
  submitTaskSignatures,
} from "@/store/slices/clientPortalSlice";
import PDFSigningViewer from "@/components/PDFSigningViewer";
import { toast } from "@/hooks/use-toast";

interface TaskCompletionModalProps {
  taskId: number | null;
  onClose: () => void;
}

interface UploadedFile {
  fieldId: number;
  file: File;
  fileType: "pdf" | "image";
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  taskId,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { taskDetails, taskDetailsLoading } = useAppSelector(
    (state) => state.clientPortal,
  );
  const [uploadedFiles, setUploadedFiles] = useState<Map<number, UploadedFile>>(
    new Map(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTaskDetails(taskId));
      setUploadedFiles(new Map());
      setIsDone(false);
    }
  }, [taskId, dispatch]);

  // ─── Separate input fields from file fields ────────────────────────────────
  const allFields = taskDetails?.formFields ?? [];
  const inputFields = allFields.filter(
    (f) => !["file_pdf", "file_image", "file_upload"].includes(f.field_type),
  );
  const fileFields = allFields.filter((f) =>
    ["file_pdf", "file_image", "file_upload"].includes(f.field_type),
  );
  const hasInputs = inputFields.length > 0;
  const hasFiles = fileFields.length > 0;

  // ─── Yup validation schema (only input fields) ─────────────────────────────
  const buildValidationSchema = () => {
    if (inputFields.length === 0) return Yup.object({});
    const shape: Record<string, any> = {};
    inputFields.forEach((field) => {
      if (!field.is_required) return;
      const name = `field_${field.id}`;
      switch (field.field_type) {
        case "email":
          shape[name] = Yup.string()
            .email("Invalid email address")
            .required(`${field.field_label} is required`);
          break;
        case "number":
          shape[name] = Yup.number()
            .typeError("Must be a number")
            .required(`${field.field_label} is required`);
          break;
        case "checkbox":
          shape[name] = Yup.boolean().oneOf(
            [true],
            `${field.field_label} must be checked`,
          );
          break;
        default:
          shape[name] = Yup.string().required(
            `${field.field_label} is required`,
          );
      }
    });
    return Yup.object(shape);
  };

  const buildInitialValues = () => {
    const vals: Record<string, any> = {};
    inputFields.forEach((field) => {
      vals[`field_${field.id}`] = field.field_type === "checkbox" ? false : "";
    });
    return vals;
  };

  const formik = useFormik({
    initialValues: buildInitialValues(),
    validationSchema: buildValidationSchema(),
    enableReinitialize: true,
    onSubmit: () => {}, // handled manually via handleSubmit
  });

  // ─── File helpers ───────────────────────────────────────────────────────────
  const handleFileSelect = (field: any, file: File) => {
    const fileType = field.field_type === "file_pdf" ? "pdf" : "image";
    setUploadedFiles((prev) => {
      const next = new Map(prev);
      next.set(field.id, { fieldId: field.id, file, fileType });
      return next;
    });
  };

  const removeFile = (fieldId: number) => {
    setUploadedFiles((prev) => {
      const next = new Map(prev);
      next.delete(fieldId);
      return next;
    });
  };

  // ─── Is the form ready to submit? ─────────────────────────────────────────
  const isFormReady = React.useMemo(() => {
    // All required input fields must have a non-empty value
    const inputsOk = inputFields
      .filter((f) => f.is_required)
      .every((f) => {
        const val = formik.values[`field_${f.id}`];
        if (f.field_type === "checkbox") return val === true;
        return val !== undefined && val !== null && String(val).trim() !== "";
      });

    // All required file fields must have an uploaded file
    const filesOk = fileFields
      .filter((f) => f.is_required)
      .every((f) => uploadedFiles.has(f.id));

    return inputsOk && filesOk;
  }, [formik.values, uploadedFiles, inputFields, fileFields]);

  // ─── Parse select options (stored as JSON array or comma-separated string) ─
  const parseOptions = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.map(String)
          : raw.split(",").map((s) => s.trim());
      } catch {
        return raw.split(",").map((s) => s.trim());
      }
    }
    if (typeof raw === "object" && raw.options) return raw.options.map(String);
    return [];
  };

  // ─── Main submit handler ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate text inputs
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(
        Object.keys(formik.values).reduce(
          (acc, k) => ({ ...acc, [k]: true }),
          {},
        ),
      );
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate required file fields
    const missingFiles = fileFields.filter(
      (f) => f.is_required && !uploadedFiles.has(f.id),
    );
    if (missingFiles.length > 0) {
      toast({
        title: "Missing documents",
        description: `Please upload: ${missingFiles.map((f) => f.field_label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Submit form responses for input fields
      if (hasInputs) {
        const responses = inputFields.map((field) => ({
          field_id: field.id,
          response_value: String(formik.values[`field_${field.id}`] ?? ""),
        }));
        await dispatch(submitTaskForm({ taskId: taskId!, responses })).unwrap();
      }

      // 2. Upload each file individually, tied to its field_id
      for (const [, uploaded] of uploadedFiles.entries()) {
        const formData = new FormData();
        formData.append("main_folder", "themortgageprofessionals");
        formData.append("id", String(taskId));

        if (uploaded.fileType === "pdf") {
          formData.append("pdfs[]", uploaded.file);
          const result = await dispatch(
            uploadTaskDocument({
              taskId: taskId!,
              formData,
              fileType: "pdf",
            }),
          ).unwrap();
          if (result.uploaded?.length > 0) {
            await dispatch(
              saveTaskDocumentMetadata({
                taskId: taskId!,
                documentType: "pdf",
                files: result.uploaded.map((f: any) => ({
                  ...f,
                  fieldId: uploaded.fieldId,
                })),
              }),
            ).unwrap();
          }
        } else {
          formData.append("images[]", uploaded.file);
          const result = await dispatch(
            uploadTaskDocument({
              taskId: taskId!,
              formData,
              fileType: "image",
            }),
          ).unwrap();
          const allImages: any[] = [];
          if (result.main_image) allImages.push(result.main_image);
          if (result.extra_images?.length)
            allImages.push(...result.extra_images);
          if (allImages.length > 0) {
            await dispatch(
              saveTaskDocumentMetadata({
                taskId: taskId!,
                documentType: "image",
                files: allImages.map((f: any) => ({
                  ...f,
                  fieldId: uploaded.fieldId,
                })),
              }),
            ).unwrap();
          }
        }
      }

      // 3. Mark task as complete
      await dispatch(completeTask(taskId!)).unwrap();
      setIsDone(true);
      setTimeout(() => onClose(), 2200);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render input field ─────────────────────────────────────────────────────
  const renderInputField = (field: any) => {
    const name = `field_${field.id}`;
    const error = formik.touched[name] && formik.errors[name];
    const isRequired = !!field.is_required;
    const helpText = field.help_text;

    const RequiredMark = isRequired ? (
      <span className="text-destructive ml-1">*</span>
    ) : null;
    const HelpText = helpText ? (
      <p className="text-xs text-muted-foreground">{helpText}</p>
    ) : null;
    const ErrorMsg = error ? (
      <p className="text-xs text-destructive">{error as string}</p>
    ) : null;

    switch (field.field_type) {
      case "text":
      case "email":
      case "number":
      case "phone":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={name}>
              {field.field_label}
              {RequiredMark}
            </Label>
            {HelpText}
            <Input
              id={name}
              name={name}
              type={
                field.field_type === "phone"
                  ? "tel"
                  : field.field_type === "number"
                    ? "number"
                    : field.field_type
              }
              placeholder={field.placeholder ?? ""}
              value={formik.values[name] ?? ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={
                error ? "border-destructive focus-visible:ring-destructive" : ""
              }
            />
            {ErrorMsg}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={name}>
              {field.field_label}
              {RequiredMark}
            </Label>
            {HelpText}
            <Input
              id={name}
              name={name}
              type="date"
              value={formik.values[name] ?? ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={
                error ? "border-destructive focus-visible:ring-destructive" : ""
              }
            />
            {ErrorMsg}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={name}>
              {field.field_label}
              {RequiredMark}
            </Label>
            {HelpText}
            <Textarea
              id={name}
              name={name}
              placeholder={field.placeholder ?? ""}
              value={formik.values[name] ?? ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={3}
              className={
                error ? "border-destructive focus-visible:ring-destructive" : ""
              }
            />
            {ErrorMsg}
          </div>
        );

      case "select": {
        const options = parseOptions(field.field_options);
        return (
          <div key={field.id} className="space-y-1.5">
            <Label>
              {field.field_label}
              {RequiredMark}
            </Label>
            {HelpText}
            <Select
              value={formik.values[name] ?? ""}
              onValueChange={(v) => formik.setFieldValue(name, v)}
            >
              <SelectTrigger
                className={
                  error
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              >
                <SelectValue
                  placeholder={field.placeholder ?? "Select an option"}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ErrorMsg}
          </div>
        );
      }

      case "checkbox":
        return (
          <div key={field.id} className="flex items-start gap-3 py-1">
            <Checkbox
              id={name}
              checked={!!formik.values[name]}
              onCheckedChange={(v) => formik.setFieldValue(name, v)}
              className={error ? "border-destructive" : ""}
            />
            <div className="space-y-0.5">
              <Label htmlFor={name} className="cursor-pointer leading-snug">
                {field.field_label}
                {RequiredMark}
              </Label>
              {HelpText}
              {ErrorMsg}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Render file upload field ───────────────────────────────────────────────
  const renderFileField = (field: any) => {
    const uploaded = uploadedFiles.get(field.id);
    const isPdf = field.field_type === "file_pdf";
    const accept = isPdf
      ? ".pdf,application/pdf"
      : "image/png,image/jpeg,image/jpg";
    const isRequired = !!field.is_required;
    const inputId = `file-${field.id}`;

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {field.field_label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {isPdf ? "PDF" : "Image"}
          </Badge>
        </div>

        {field.help_text && (
          <p className="text-xs text-muted-foreground">{field.help_text}</p>
        )}

        {uploaded ? (
          // File selected — show preview row
          <div className="flex items-center justify-between gap-2 p-3 bg-muted/40 border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              {isPdf ? (
                <FileText className="h-5 w-5 text-red-500 shrink-0" />
              ) : (
                <Upload className="h-5 w-5 text-blue-500 shrink-0" />
              )}
              <span className="text-sm font-medium truncate min-w-0">
                {uploaded.file.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                {(uploaded.file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeFile(field.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // No file yet — drop zone
          <label
            htmlFor={inputId}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group"
          >
            {isPdf ? (
              <FileText className="h-9 w-9 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
            ) : (
              <Upload className="h-9 w-9 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-primary">
                Click to upload {isPdf ? "PDF" : "image"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPdf ? "PDF only — max 10 MB" : "PNG or JPG — max 10 MB"}
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              className="hidden"
              accept={accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(field, file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    );
  };

  if (!taskId) return null;

  return (
    <Dialog
      open={!!taskId}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
        {/* ── Loading ────────────────────────────────────────── */}
        {taskDetailsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isDone ? (
          /* ── Success ────────────────────────────────────────── */
          <div className="text-center py-14 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">Submitted for Review!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your submission has been received and is awaiting broker
                approval.
              </p>
            </div>
          </div>
        ) : (
          /* ── Main form ────────────────────────────────────────── */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                {taskDetails?.title ?? "Complete Task"}
              </DialogTitle>
              {taskDetails?.description && (
                <DialogDescription className="text-sm leading-relaxed">
                  {taskDetails.description}
                </DialogDescription>
              )}

              {/* Loan / Application context */}
              {taskDetails?.application_number && (
                <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <HomeIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {taskDetails.application_number}
                        </Badge>
                        {taskDetails.loan_type && (
                          <Badge
                            variant="outline"
                            className="capitalize text-xs"
                          >
                            {taskDetails.loan_type.replace(/_/g, " ")}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            taskDetails.priority === "urgent"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {taskDetails.priority}
                        </Badge>
                      </div>
                      {taskDetails.property_address && (
                        <p className="text-xs text-muted-foreground">
                          {taskDetails.property_address}
                          {taskDetails.property_city &&
                            `, ${taskDetails.property_city} ${taskDetails.property_state}`}
                        </p>
                      )}
                      {taskDetails.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due:{" "}
                          {new Date(taskDetails.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogHeader>

            <div className="space-y-6 mt-2">
              {/* ── SIGNING: Document Signing Type ── */}
              {taskDetails?.task_type === "document_signing" ? (
                taskDetails.sign_document ? (
                  <PDFSigningViewer
                    pdfUrl={taskDetails.sign_document.file_path}
                    zones={taskDetails.sign_document.signature_zones ?? []}
                    existingSignatures={taskDetails.existing_signatures}
                    isSubmitting={isSubmitting}
                    onSubmit={async (signatures) => {
                      if (!taskId) return;
                      setIsSubmitting(true);
                      try {
                        const result = await dispatch(
                          submitTaskSignatures({ taskId, signatures }),
                        );
                        if (submitTaskSignatures.fulfilled.match(result)) {
                          setIsDone(true);
                        } else {
                          toast({
                            title: "Submission failed",
                            description:
                              "Could not submit signatures. Please try again.",
                            variant: "destructive",
                          });
                        }
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      The signing document is not yet ready. Please contact your
                      broker.
                    </p>
                  </div>
                )
              ) : (
                <>
                  {/* ── SECTION 1: Input Fields ── */}
                  {hasInputs && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-sm">
                          Fill in the Information
                        </h3>
                      </div>
                      <Separator />
                      {inputFields.map((field) => renderInputField(field))}
                    </div>
                  )}

                  {/* ── SECTION 2: File Uploads ── */}
                  {hasFiles && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-sm">
                          Upload Required Documents
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          ({uploadedFiles.size}/{fileFields.length} uploaded)
                        </span>
                      </div>
                      <Separator />
                      <div className="space-y-5">
                        {fileFields.map((field) => renderFileField(field))}
                      </div>
                    </div>
                  )}

                  {/* ── No content — direct completion ── */}
                  {!hasInputs && !hasFiles && !taskDetailsLoading && (
                    <div className="flex items-center gap-3 p-4 bg-muted/40 border rounded-lg">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        No additional information is required. Click below to
                        mark this task as complete.
                      </p>
                    </div>
                  )}

                  {/* ── Actions ── */}
                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isFormReady}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        "Complete Task"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
