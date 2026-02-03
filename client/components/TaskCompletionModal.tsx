import React, { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Home as HomeIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchTaskDetails,
  submitTaskForm,
  uploadTaskDocument,
  saveTaskDocumentMetadata,
  completeTask,
  saveTaskFormDraft,
  clearTaskFormDraft,
  selectTaskFormDraft,
} from "@/store/slices/clientPortalSlice";
import { toast } from "@/hooks/use-toast";

interface TaskCompletionModalProps {
  taskId: number | null;
  onClose: () => void;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  taskId,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { taskDetails, taskDetailsLoading } = useAppSelector(
    (state) => state.clientPortal,
  );
  const savedDraft = useAppSelector(selectTaskFormDraft(taskId || 0));
  const [uploadedDocuments, setUploadedDocuments] = useState<
    Array<{ fieldId?: number; file: File; fileType: "pdf" | "image" }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "form" | "documents" | "summary" | "complete"
  >("form");
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTaskDetails(taskId));
      // Check if there's a saved draft only when opening the modal
      const draft = selectTaskFormDraft(taskId)({
        clientPortal: { taskFormDrafts: {} },
      } as any);
      if (savedDraft) {
        setShowDraftPrompt(true);
      }
    }
  }, [taskId, dispatch]);

  // Only check draft when taskId changes (modal opens), not when savedDraft updates
  useEffect(() => {
    if (taskId && savedDraft && !showDraftPrompt) {
      // Only show prompt once when modal first opens
      const hasChecked = sessionStorage.getItem(`draft-checked-${taskId}`);
      if (!hasChecked) {
        setShowDraftPrompt(true);
        sessionStorage.setItem(`draft-checked-${taskId}`, "true");
      }
    }
  }, [taskId]); // Only depend on taskId, not savedDraft

  // Debug: Log task details when they load
  useEffect(() => {
    if (taskDetails) {
      console.log("Task Details Loaded:", taskDetails);
      console.log("Form Fields:", taskDetails.formFields);
      console.log("Required Documents:", taskDetails.requiredDocuments);
    }
  }, [taskDetails]);

  // Build dynamic validation schema
  const buildValidationSchema = () => {
    if (!taskDetails?.formFields || taskDetails.formFields.length === 0) {
      return Yup.object({});
    }

    const schemaFields: any = {};
    taskDetails.formFields.forEach((field) => {
      if (field.required) {
        switch (field.field_type) {
          case "email":
            schemaFields[`field_${field.id}`] = Yup.string()
              .email("Invalid email")
              .required(`${field.field_label} is required`);
            break;
          case "number":
            schemaFields[`field_${field.id}`] = Yup.number().required(
              `${field.field_label} is required`,
            );
            break;
          case "checkbox":
            schemaFields[`field_${field.id}`] = Yup.boolean().oneOf(
              [true],
              `${field.field_label} must be checked`,
            );
            break;
          default:
            schemaFields[`field_${field.id}`] = Yup.string().required(
              `${field.field_label} is required`,
            );
        }
      }
    });

    return Yup.object(schemaFields);
  };

  const formik = useFormik({
    initialValues: {},
    validationSchema: buildValidationSchema(),
    enableReinitialize: true,
    onSubmit: async (values) => {
      // This is only called from the summary step for final submission
      setIsSubmitting(true);

      try {
        // Step 1: Upload all documents first
        await uploadAllDocuments();

        // Step 2: Submit form responses
        const responses = Object.entries(values).map(([key, value]) => {
          const fieldId = parseInt(key.replace("field_", ""));
          return {
            field_id: fieldId,
            response_value: String(value),
          };
        });

        if (responses.length > 0) {
          await dispatch(
            submitTaskForm({
              taskId: taskId!,
              responses,
            }),
          ).unwrap();
        }

        toast({
          title: "Task Submitted",
          description: "Your task has been submitted successfully.",
        });

        // Step 3: Complete task
        await handleCompleteTask();
      } catch (error: any) {
        toast({
          title: "Submission Failed",
          description: error || "Failed to submit task",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Auto-save draft when form values change (debounced)
  useEffect(() => {
    if (!taskId || !formik.values || Object.keys(formik.values).length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      dispatch(
        saveTaskFormDraft({
          taskId,
          formData: formik.values,
          currentStep: currentStep as "form" | "documents" | "complete",
          timestamp: Date.now(),
        }),
      );
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [formik.values, currentStep, taskId, dispatch]);

  const handleFileUpload = (
    file: File,
    fileType: "pdf" | "image",
    fieldId?: number,
  ) => {
    // Just store the file locally, don't upload yet
    const newDoc = { fieldId, file, fileType };
    setUploadedDocuments((prev) => [...prev, newDoc]);

    toast({
      title: "Document Added",
      description: `${file.name} ready to upload.`,
    });
  };

  const removeDocument = (fileToRemove: File) => {
    setUploadedDocuments((prev) =>
      prev.filter((doc) => doc.file !== fileToRemove),
    );
    toast({
      title: "Document Removed",
      description: `${fileToRemove.name} removed.`,
    });
  };

  const uploadAllDocuments = async () => {
    if (uploadedDocuments.length === 0) {
      return { success: true };
    }

    try {
      // Group documents by type (pdf vs image)
      const pdfDocs = uploadedDocuments.filter((doc) => doc.fileType === "pdf");
      const imageDocs = uploadedDocuments.filter(
        (doc) => doc.fileType === "image",
      );

      // Upload PDFs if any
      if (pdfDocs.length > 0) {
        const pdfFormData = new FormData();
        pdfFormData.append("main_folder", "encore");
        pdfFormData.append("id", String(taskId));

        pdfDocs.forEach((doc) => {
          pdfFormData.append("pdfs[]", doc.file);
        });

        const pdfResult = await dispatch(
          uploadTaskDocument({
            taskId: taskId!,
            formData: pdfFormData,
            fileType: "pdf",
          }),
        ).unwrap();

        // Save PDF metadata to database
        if (pdfResult.uploaded && pdfResult.uploaded.length > 0) {
          await dispatch(
            saveTaskDocumentMetadata({
              taskId: taskId!,
              documentType: "pdf",
              files: pdfResult.uploaded,
            }),
          ).unwrap();
        }
      }

      // Upload images if any
      if (imageDocs.length > 0) {
        const imageFormData = new FormData();
        imageFormData.append("main_folder", "encore");
        imageFormData.append("id", String(taskId));

        imageDocs.forEach((doc) => {
          imageFormData.append("images[]", doc.file);
        });

        const imageResult = await dispatch(
          uploadTaskDocument({
            taskId: taskId!,
            formData: imageFormData,
            fileType: "image",
          }),
        ).unwrap();

        // Save image metadata to database
        const allImages = [];
        if (imageResult.main_image) {
          allImages.push(imageResult.main_image);
        }
        if (imageResult.extra_images && imageResult.extra_images.length > 0) {
          allImages.push(...imageResult.extra_images);
        }

        if (allImages.length > 0) {
          await dispatch(
            saveTaskDocumentMetadata({
              taskId: taskId!,
              documentType: "image",
              files: allImages,
            }),
          ).unwrap();
        }
      }

      return { success: true };
    } catch (error: any) {
      throw error || "Failed to upload documents";
    }
  };

  const handleNextStep = async () => {
    // Validate form before moving to next step
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(
        Object.keys(formik.values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {},
        ),
      );
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Move to next step based on current step
    if (currentStep === "form") {
      setCurrentStep("documents");
    } else if (currentStep === "documents") {
      setCurrentStep("summary");
    }
  };

  const handleCompleteTask = async () => {
    try {
      await dispatch(completeTask(taskId!)).unwrap();
      toast({
        title: "Task Completed! 🎉",
        description: "Great job! Your task has been marked as complete.",
      });
      setCurrentStep("complete");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to complete task",
        variant: "destructive",
      });
    }
  };

  const resumeDraft = () => {
    if (savedDraft) {
      formik.setValues(savedDraft.formData);
      setCurrentStep(savedDraft.currentStep);
      setShowDraftPrompt(false);
      toast({
        title: "Draft Restored",
        description: "Your previous progress has been restored.",
      });
    }
  };

  const discardDraft = () => {
    if (taskId) {
      dispatch(clearTaskFormDraft(taskId));
      setShowDraftPrompt(false);
      sessionStorage.removeItem(`draft-checked-${taskId}`);
    }
  };

  const handleClose = () => {
    // Save draft before closing if there's unsaved form data
    if (
      taskId &&
      formik.values &&
      Object.keys(formik.values).length > 0 &&
      currentStep !== "complete"
    ) {
      dispatch(
        saveTaskFormDraft({
          taskId,
          formData: formik.values,
          currentStep: currentStep as "form" | "documents" | "complete",
          timestamp: Date.now(),
        }),
      );
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved.",
      });
    }
    onClose();
  };

  const renderFormField = (field: any) => {
    const fieldName = `field_${field.id}`;
    const error = formik.touched[fieldName] && formik.errors[fieldName];

    switch (field.field_type) {
      case "text":
      case "email":
      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.field_label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.field_description && (
              <p className="text-sm text-muted-foreground">
                {field.field_description}
              </p>
            )}
            <Input
              id={fieldName}
              name={fieldName}
              type={field.field_type}
              placeholder={field.placeholder}
              value={formik.values[fieldName] || ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error as string}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.field_label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.field_description && (
              <p className="text-sm text-muted-foreground">
                {field.field_description}
              </p>
            )}
            <Textarea
              id={fieldName}
              name={fieldName}
              placeholder={field.placeholder}
              value={formik.values[fieldName] || ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={error ? "border-red-500" : ""}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error as string}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.field_label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.field_description && (
              <p className="text-sm text-muted-foreground">
                {field.field_description}
              </p>
            )}
            <Select
              value={formik.values[fieldName]}
              onValueChange={(value) => formik.setFieldValue(fieldName, value)}
            >
              <SelectTrigger className={error ? "border-red-500" : ""}>
                <SelectValue
                  placeholder={field.placeholder || "Select option"}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.split(",").map((option: string) => (
                  <SelectItem key={option.trim()} value={option.trim()}>
                    {option.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error as string}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="flex items-start space-x-3 space-y-0">
            <Checkbox
              id={fieldName}
              checked={formik.values[fieldName] || false}
              onCheckedChange={(checked) =>
                formik.setFieldValue(fieldName, checked)
              }
              className={error ? "border-red-500" : ""}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={fieldName} className="cursor-pointer">
                {field.field_label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.field_description && (
                <p className="text-sm text-muted-foreground">
                  {field.field_description}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-500">{error as string}</p>
              )}
            </div>
          </div>
        );

      case "file_upload":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.field_description && (
              <p className="text-sm text-muted-foreground">
                {field.field_description}
              </p>
            )}
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Input
                type="file"
                id={`file-${field.id}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "image", field.id);
                }}
              />
              <Label
                htmlFor={`file-${field.id}`}
                className="cursor-pointer text-sm text-primary hover:underline"
              >
                Click to upload or drag and drop
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, PNG, JPG (max 10MB)
              </p>
            </div>
          </div>
        );

      case "file_pdf":
        const uploadedPdf = uploadedDocuments.find(
          (doc) => doc.fieldId === field.id && doc.fileType === "pdf",
        );
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.field_description && (
              <p className="text-sm text-muted-foreground">
                {field.field_description}
              </p>
            )}
            {uploadedPdf ? (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {uploadedPdf.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedPdf.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(uploadedPdf.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Input
                  type="file"
                  id={`pdf-${field.id}`}
                  className="hidden"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "pdf", field.id);
                  }}
                />
                <Label
                  htmlFor={`pdf-${field.id}`}
                  className="cursor-pointer text-sm text-primary hover:underline"
                >
                  Click to upload PDF
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF only (max 5MB)
                </p>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error as string}</p>}
          </div>
        );

      case "file_image":
        const uploadedImage = uploadedDocuments.find(
          (doc) => doc.fieldId === field.id && doc.fileType === "image",
        );
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.field_description && (
              <p className="text-sm text-muted-foreground">
                {field.field_description}
              </p>
            )}
            {uploadedImage ? (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {uploadedImage.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedImage.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(uploadedImage.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Input
                  type="file"
                  id={`image-${field.id}`}
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "image", field.id);
                  }}
                />
                <Label
                  htmlFor={`image-${field.id}`}
                  className="cursor-pointer text-sm text-primary hover:underline"
                >
                  Click to upload image
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG or JPG only
                </p>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error as string}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (!taskId) return null;

  return (
    <>
      {/* Draft Prompt Dialog */}
      {showDraftPrompt && savedDraft && (
        <Dialog open={showDraftPrompt} onOpenChange={setShowDraftPrompt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Resume Draft?
              </DialogTitle>
              <DialogDescription>
                You have unsaved progress from{" "}
                {new Date(savedDraft.timestamp).toLocaleString()}. Would you
                like to continue where you left off?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={discardDraft}
                className="flex-1"
              >
                Start Fresh
              </Button>
              <Button onClick={resumeDraft} className="flex-1">
                Resume Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Main Task Completion Dialog */}
      <Dialog open={!!taskId && !showDraftPrompt} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {taskDetailsLoading ? (
            <>
              <DialogHeader>
                <DialogTitle>Loading Task Details</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </>
          ) : currentStep === "complete" ? (
            <>
              <DialogHeader>
                <DialogTitle>Task Completed</DialogTitle>
              </DialogHeader>
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Task Completed!</h2>
                <p className="text-muted-foreground">
                  Great work! Your task has been successfully completed.
                </p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {taskDetails?.title}
                </DialogTitle>
                <DialogDescription>
                  {taskDetails?.description}
                </DialogDescription>

                {/* Application/Loan Information */}
                {taskDetails?.application_number && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <HomeIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="font-mono">
                            {taskDetails.application_number}
                          </Badge>
                          {taskDetails.loan_type && (
                            <Badge variant="outline" className="capitalize">
                              {taskDetails.loan_type.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {taskDetails.property_address && (
                          <p className="text-sm text-muted-foreground">
                            {taskDetails.property_address}
                            {taskDetails.property_city && (
                              <>
                                , {taskDetails.property_city},{" "}
                                {taskDetails.property_state}{" "}
                                {taskDetails.property_zip}
                              </>
                            )}
                          </p>
                        )}
                        {taskDetails.loan_amount && (
                          <p className="text-sm font-medium text-primary">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 0,
                            }).format(taskDetails.loan_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={
                      taskDetails?.priority === "urgent"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {taskDetails?.priority}
                  </Badge>
                  {taskDetails?.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Due: {new Date(taskDetails.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div
                    className={`flex items-center gap-2 ${currentStep === "form" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "form" ? "bg-primary text-white" : "bg-muted"}`}
                    >
                      1
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      Form
                    </span>
                  </div>
                  <div className="w-8 h-0.5 bg-border" />
                  <div
                    className={`flex items-center gap-2 ${currentStep === "documents" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "documents" ? "bg-primary text-white" : "bg-muted"}`}
                    >
                      2
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      Documents
                    </span>
                  </div>
                  <div className="w-8 h-0.5 bg-border" />
                  <div
                    className={`flex items-center gap-2 ${currentStep === "summary" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "summary" ? "bg-primary text-white" : "bg-muted"}`}
                    >
                      3
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      Review
                    </span>
                  </div>
                </div>

                {currentStep === "form" && (
                  <>
                    {taskDetails?.formFields &&
                    taskDetails.formFields.length > 0 ? (
                      <div className="space-y-4">
                        {taskDetails.formFields
                          .filter(
                            (field) =>
                              field.field_type !== "file_pdf" &&
                              field.field_type !== "file_image",
                          )
                          .map((field) => renderFormField(field))}
                        <div className="flex gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleNextStep}
                            className="flex-1"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-lg p-8 bg-muted/30">
                          <div className="text-center space-y-3">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                              No form required for this task.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {taskDetails?.requiredDocuments &&
                              taskDetails.requiredDocuments.length > 0
                                ? "Continue to upload required documents."
                                : "Click below to complete this task."}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleNextStep} className="flex-1">
                            Next
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {currentStep === "documents" && (
                  <>
                    {taskDetails?.formFields &&
                    taskDetails.formFields.filter(
                      (field) =>
                        field.field_type === "file_pdf" ||
                        field.field_type === "file_image",
                    ).length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="font-medium text-lg mb-4">
                          Upload Required Documents
                        </h3>
                        {taskDetails.formFields
                          .filter(
                            (field) =>
                              field.field_type === "file_pdf" ||
                              field.field_type === "file_image",
                          )
                          .map((field) => renderFormField(field))}

                        {uploadedDocuments.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {uploadedDocuments.length} document(s) ready to
                            upload
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg p-8 bg-muted/30">
                        <div className="text-center space-y-3">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                          <p className="text-muted-foreground">
                            No documents required for this task.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("form")}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setCurrentStep("summary")}
                        className="flex-1"
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}

                {currentStep === "summary" && (
                  <>
                    <div className="space-y-6">
                      <div className="bg-muted/30 rounded-lg p-6">
                        <h3 className="font-semibold text-lg mb-4">
                          Review Your Submission
                        </h3>

                        {/* Form Responses */}
                        {taskDetails?.formFields &&
                          taskDetails.formFields.length > 0 && (
                            <div className="space-y-4 mb-6">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Form Responses
                              </h4>
                              {taskDetails.formFields
                                .filter(
                                  (field) =>
                                    field.field_type !== "file_pdf" &&
                                    field.field_type !== "file_image" &&
                                    field.field_type !== "file_upload",
                                )
                                .map((field) => {
                                  const fieldName = `field_${field.id}`;
                                  const value = formik.values[fieldName];
                                  return (
                                    <div
                                      key={field.id}
                                      className="border-b border-border/50 pb-3"
                                    >
                                      <p className="text-sm text-muted-foreground">
                                        {field.field_label}
                                      </p>
                                      <p className="font-medium">
                                        {field.field_type === "checkbox"
                                          ? value
                                            ? "Yes"
                                            : "No"
                                          : value || "—"}
                                      </p>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                        {/* Documents Status */}
                        {uploadedDocuments.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                              Documents to Upload
                            </h4>
                            {uploadedDocuments.map((doc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between border-b border-border/50 pb-2"
                              >
                                <div className="flex items-center gap-2">
                                  {doc.fileType === "pdf" ? (
                                    <FileText className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Upload className="h-4 w-4 text-blue-500" />
                                  )}
                                  <span className="text-sm">
                                    {doc.file.name}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="gap-1">
                                  {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          Please review all information carefully. Once
                          submitted, you may not be able to edit your responses.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("documents")}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => formik.handleSubmit()}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Task"
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
    </>
  );
};
