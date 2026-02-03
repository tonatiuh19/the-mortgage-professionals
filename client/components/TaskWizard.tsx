import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Calendar,
  FileText,
  Tag,
  AlertCircle,
  Edit,
  Trash2,
  File,
  Image,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createTask,
  updateTask,
  createTaskFormFields,
  saveTaskTemplateDraft,
  clearTaskTemplateDraft,
} from "@/store/slices/tasksSlice";
import type { TaskTemplate, TaskFormFieldType } from "@shared/api";

interface TaskWizardProps {
  open: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  editTask?: TaskTemplate | null;
}

const validationSchema = Yup.object({
  title: Yup.string().required("Task title is required"),
  description: Yup.string(),
  task_type: Yup.string().required("Task type is required"),
  priority: Yup.string().required("Priority is required"),
  default_due_days: Yup.number().nullable().min(0, "Must be 0 or positive"),
  is_active: Yup.boolean(),
  requires_documents: Yup.boolean(),
  document_instructions: Yup.string(),
  has_custom_form: Yup.boolean(),
});

interface FormField {
  id?: number;
  field_name: string;
  field_label: string;
  field_type: TaskFormFieldType;
  field_options?: string[];
  is_required: boolean;
  placeholder?: string;
  help_text?: string;
  order_index: number;
}

const taskTypes = [
  { value: "document_collection", label: "Document Collection" },
  { value: "document_verification", label: "Document Verification" },
  { value: "credit_check", label: "Credit Check" },
  { value: "income_verification", label: "Income Verification" },
  { value: "appraisal_order", label: "Appraisal Order" },
  { value: "title_search", label: "Title Search" },
  { value: "underwriting_review", label: "Underwriting Review" },
  { value: "conditional_approval", label: "Conditional Approval" },
  { value: "final_approval", label: "Final Approval" },
  { value: "closing_coordination", label: "Closing Coordination" },
  { value: "follow_up", label: "Follow Up" },
  { value: "client_communication", label: "Client Communication" },
  { value: "custom", label: "Custom Task" },
];

const fieldTypeOptions = [
  { value: "text", label: "Text Input" },
  { value: "number", label: "Number Input" },
  { value: "email", label: "Email Input" },
  { value: "phone", label: "Phone Input" },
  { value: "date", label: "Date Picker" },
  { value: "textarea", label: "Text Area" },
  { value: "file_pdf", label: "PDF Upload" },
  { value: "file_image", label: "Image Upload" },
  { value: "select", label: "Dropdown Select" },
  { value: "checkbox", label: "Checkbox" },
];

const TaskWizard: React.FC<TaskWizardProps> = ({
  open,
  onClose,
  onTaskCreated,
  editTask,
}) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(
    null,
  );
  const [completedSteps, setCompletedSteps] = useState({
    basic: false,
    documents: false,
    customForm: false,
    summary: false,
  });
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const isEditMode = !!editTask;
  const { taskTemplateDraft } = useAppSelector((state) => state.tasks);

  const formik = useFormik({
    initialValues: {
      title: "",
      description: "",
      task_type: "",
      priority: "medium",
      default_due_days: null as number | null,
      is_active: true,
      requires_documents: false,
      document_instructions: "",
      has_custom_form: false,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        console.log("📝 TaskWizard: Starting task submission...");
        console.log("📝 TaskWizard: Form values:", values);
        console.log("📝 TaskWizard: Form fields to create:", formFields);
        console.log("📝 TaskWizard: Is edit mode?", isEditMode);

        let taskId: number;

        if (isEditMode) {
          console.log("✏️ TaskWizard: Updating existing task ID:", editTask.id);
          const result = await dispatch(
            updateTask({ id: editTask.id, ...values }),
          ).unwrap();
          taskId = result.id;
          console.log("✅ TaskWizard: Task updated successfully, ID:", taskId);
        } else {
          console.log("➕ TaskWizard: Creating new task...");
          const result = await dispatch(createTask(values)).unwrap();
          taskId = result.id;
          console.log("✅ TaskWizard: Task created successfully, ID:", taskId);
        }

        // Create form fields if custom form is enabled and fields exist
        if (values.has_custom_form && formFields.length > 0) {
          console.log(
            `📋 TaskWizard: Creating ${formFields.length} form fields for task ${taskId}...`,
          );
          console.log("📋 TaskWizard: Form fields payload:", {
            taskId,
            form_fields: formFields,
          });

          const fieldsResult = await dispatch(
            createTaskFormFields({
              taskId,
              form_fields: formFields,
            }),
          ).unwrap();

          console.log(
            "✅ TaskWizard: Form fields created successfully:",
            fieldsResult,
          );
        } else {
          console.log("⚠️ TaskWizard: Skipping form fields creation:", {
            has_custom_form: values.has_custom_form,
            formFieldsCount: formFields.length,
          });
        }

        // Clear draft since task was successfully created
        console.log("🧹 TaskWizard: Clearing draft and closing wizard...");
        dispatch(clearTaskTemplateDraft());

        formik.resetForm();
        setFormFields([]);
        onTaskCreated?.();
        onClose();
        console.log(
          "✅ TaskWizard: Task creation flow completed successfully!",
        );
      } catch (error) {
        console.error(
          `❌ TaskWizard: Failed to ${isEditMode ? "update" : "create"} task:`,
          error,
        );
        console.error("❌ TaskWizard: Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (editTask && open) {
      formik.setValues({
        title: editTask.title || "",
        description: editTask.description || "",
        task_type: editTask.task_type || "",
        priority: editTask.priority || "medium",
        default_due_days: editTask.default_due_days ?? null,
        is_active: editTask.is_active ?? true,
        requires_documents: editTask.requires_documents ?? false,
        document_instructions: editTask.document_instructions || "",
        has_custom_form: editTask.has_custom_form ?? false,
      });
      if (editTask.form_fields) {
        setFormFields(
          editTask.form_fields.map((field, index) => ({
            ...field,
            order_index: index,
          })),
        );
      }
      // Mark steps as completed for edit mode
      setCompletedSteps({
        basic: true,
        documents: true,
        customForm: true,
        summary: true,
      });
    } else if (open && !editTask) {
      // Check if there's a draft when opening for new task
      if (taskTemplateDraft) {
        setShowDraftPrompt(true);
      }
    } else if (!open) {
      formik.resetForm();
      setFormFields([]);
      setActiveTab("basic");
      setCompletedSteps({
        basic: false,
        documents: false,
        customForm: false,
        summary: false,
      });
      setShowDraftPrompt(false);
    }
  }, [editTask, open, taskTemplateDraft]);

  // Validate basic info step
  const isBasicStepValid = () => {
    return !!(
      formik.values.title &&
      formik.values.task_type &&
      formik.values.priority
    );
  };

  // Validate documents step
  const isDocumentsStepValid = () => {
    if (formik.values.requires_documents) {
      const documentFields = formFields.filter(
        (f) => f.field_type === "file_pdf" || f.field_type === "file_image",
      );
      return (
        documentFields.length > 0 &&
        documentFields.every((field) => field.field_label.trim() !== "")
      );
    }
    return true; // If no documents required, step is valid
  };

  // Validate custom form step
  const isCustomFormStepValid = () => {
    if (formik.values.has_custom_form) {
      // Check if at least one non-file field is added and all fields have labels
      const customFields = formFields.filter(
        (f) => f.field_type !== "file_pdf" && f.field_type !== "file_image",
      );
      return (
        customFields.length > 0 &&
        customFields.every((field) => field.field_label.trim() !== "")
      );
    }
    return true; // If no custom form, step is valid
  };

  // Update custom form step completion when fields change
  useEffect(() => {
    if (formik.values.has_custom_form && isCustomFormStepValid()) {
      setCompletedSteps((prev) => ({ ...prev, customForm: true }));
    } else if (formik.values.has_custom_form) {
      setCompletedSteps((prev) => ({ ...prev, customForm: false }));
    } else {
      // If custom form is disabled, mark as complete
      setCompletedSteps((prev) => ({ ...prev, customForm: true }));
    }
  }, [formFields, formik.values.has_custom_form]);

  const handleNextStep = () => {
    if (activeTab === "basic" && isBasicStepValid()) {
      setCompletedSteps((prev) => ({ ...prev, basic: true }));
      setActiveTab("documents");
    } else if (activeTab === "documents" && isDocumentsStepValid()) {
      setCompletedSteps((prev) => ({ ...prev, documents: true }));
      setActiveTab("custom-form");
    } else if (activeTab === "custom-form" && isCustomFormStepValid()) {
      setCompletedSteps((prev) => ({ ...prev, customForm: true }));
      setActiveTab("summary");
    }
  };

  const handlePreviousStep = () => {
    if (activeTab === "documents") {
      setActiveTab("basic");
    } else if (activeTab === "custom-form") {
      setActiveTab("documents");
    } else if (activeTab === "summary") {
      setActiveTab("custom-form");
    }
  };

  const canProceedToNextStep = () => {
    if (activeTab === "basic") return isBasicStepValid();
    if (activeTab === "documents") return isDocumentsStepValid();
    if (activeTab === "custom-form") return isCustomFormStepValid();
    return false;
  };

  const isFormComplete = () => {
    return (
      isBasicStepValid() && isDocumentsStepValid() && isCustomFormStepValid()
    );
  };

  const handleAddFormField = () => {
    const newField: FormField = {
      field_name: "",
      field_label: "",
      field_type: "text",
      is_required: true,
      order_index: formFields.length,
    };
    console.log("➕ TaskWizard: Adding new form field:", newField);
    console.log("➕ TaskWizard: Current form fields count:", formFields.length);
    setFormFields([...formFields, newField]);
    setEditingFieldIndex(formFields.length);
    console.log("➕ TaskWizard: New form fields count:", formFields.length + 1);
  };

  const handleUpdateFormField = (
    index: number,
    updates: Partial<FormField>,
  ) => {
    const updatedFields = [...formFields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    console.log(`✏️ TaskWizard: Updating field ${index}:`, updates);
    console.log("✏️ TaskWizard: Updated field:", updatedFields[index]);
    setFormFields(updatedFields);
  };

  const handleRemoveFormField = (index: number) => {
    console.log(`🗑️ TaskWizard: Removing field ${index}`);
    setFormFields(formFields.filter((_, i) => i !== index));
    setEditingFieldIndex(null);
    console.log(
      "🗑️ TaskWizard: Remaining form fields count:",
      formFields.length - 1,
    );
  };

  const handleClose = () => {
    // Save as draft if not in edit mode and has form data
    if (!isEditMode) {
      const hasFormData =
        formik.values.title ||
        formik.values.task_type ||
        formik.values.description ||
        formFields.length > 0 ||
        formik.values.requires_documents ||
        formik.values.has_custom_form;

      if (hasFormData) {
        dispatch(
          saveTaskTemplateDraft({
            formData: formik.values,
            formFields,
            activeTab,
            savedAt: new Date().toISOString(),
          }),
        );
      }
    }

    formik.resetForm();
    setFormFields([]);
    setActiveTab("basic");
    setCompletedSteps({
      basic: false,
      documents: false,
      customForm: false,
      summary: false,
    });
    setShowDraftPrompt(false);
    onClose();
  };

  const resumeDraft = () => {
    if (taskTemplateDraft) {
      formik.setValues(taskTemplateDraft.formData);
      setFormFields(taskTemplateDraft.formFields);
      setActiveTab(taskTemplateDraft.activeTab);
      setShowDraftPrompt(false);

      // Restore completion states based on draft data
      const isBasicComplete = !!(
        taskTemplateDraft.formData.title &&
        taskTemplateDraft.formData.task_type &&
        taskTemplateDraft.formData.priority
      );
      const isDocumentsComplete =
        !taskTemplateDraft.formData.requires_documents ||
        !!taskTemplateDraft.formData.document_instructions;
      const isCustomFormComplete =
        !taskTemplateDraft.formData.has_custom_form ||
        (taskTemplateDraft.formFields.length > 0 &&
          taskTemplateDraft.formFields.every((f) => f.field_label.trim()));

      setCompletedSteps({
        basic: isBasicComplete,
        documents: isDocumentsComplete,
        customForm: isCustomFormComplete,
        summary: false,
      });
    }
  };

  const discardDraft = () => {
    dispatch(clearTaskTemplateDraft());
    setShowDraftPrompt(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/10 p-2">
              {isEditMode ? (
                <Edit className="h-5 w-5 text-emerald-500" />
              ) : (
                <Plus className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            {isEditMode ? "Edit Task Template" : "Create Task Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update task template details, add document requirements, or create custom forms"
              : "Create a task template with optional document requirements and custom form fields"}
          </DialogDescription>
        </DialogHeader>

        {/* Draft Detection Prompt */}
        {showDraftPrompt && taskTemplateDraft && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Draft Available
                  </h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You have a saved draft from{" "}
                  {new Date(taskTemplateDraft.savedAt).toLocaleDateString()}{" "}
                  {new Date(taskTemplateDraft.savedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  . Would you like to resume where you left off?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={resumeDraft}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Resume
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={discardDraft}
                  variant="outline"
                >
                  Discard
                </Button>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Prevent form submission - only allow via button click
          }}
          className="mt-4"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="relative">
                Basic Info
                {completedSteps.basic && (
                  <CheckCircle2 className="h-4 w-4 ml-2 text-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                disabled={!completedSteps.basic}
                className="relative"
              >
                <File className="h-4 w-4 mr-2" />
                Documents
                {completedSteps.documents && (
                  <CheckCircle2 className="h-4 w-4 ml-2 text-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="custom-form"
                disabled={!completedSteps.documents}
                className="relative"
              >
                <FileText className="h-4 w-4 mr-2" />
                Custom Form
                {completedSteps.customForm && (
                  <CheckCircle2 className="h-4 w-4 ml-2 text-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                disabled={!completedSteps.customForm}
                className="relative"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Review
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6 mt-4">
              {!isBasicStepValid() && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Please fill in the required fields (Task Type, Title,
                    Priority) to proceed to the next step.
                  </p>
                </div>
              )}

              {/* Task Type */}
              <div className="space-y-2">
                <Label htmlFor="task_type" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Task Type
                </Label>
                <Select
                  value={formik.values.task_type}
                  onValueChange={(value) => {
                    formik.setFieldValue("task_type", value);
                    const selectedType = taskTypes.find(
                      (t) => t.value === value,
                    );
                    if (selectedType && !formik.values.title) {
                      formik.setFieldValue("title", selectedType.label);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formik.touched.task_type && formik.errors.task_type && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formik.errors.task_type}
                  </p>
                )}
              </div>

              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Template Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Collect W-2 forms from client"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.title && formik.errors.title
                      ? "border-destructive"
                      : ""
                  }
                />
                {formik.touched.title && formik.errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formik.errors.title}
                  </p>
                )}
              </div>

              {/* Task Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Add detailed instructions or notes for this task template..."
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  rows={4}
                />
              </div>

              {/* Priority & Default Due Days */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="block">
                    Priority
                  </Label>
                  <Select
                    value={formik.values.priority}
                    onValueChange={(value) =>
                      formik.setFieldValue("priority", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <Badge className={getPriorityColor("low")}>Low</Badge>
                      </SelectItem>
                      <SelectItem value="medium">
                        <Badge className={getPriorityColor("medium")}>
                          Medium
                        </Badge>
                      </SelectItem>
                      <SelectItem value="high">
                        <Badge className={getPriorityColor("high")}>High</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="default_due_days"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Default Due Days
                  </Label>
                  <Input
                    id="default_due_days"
                    name="default_due_days"
                    type="number"
                    min="0"
                    placeholder="e.g., 7"
                    value={formik.values.default_due_days ?? ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "default_due_days",
                        e.target.value !== "" ? parseInt(e.target.value) : null,
                      )
                    }
                  />
                  {formik.touched.default_due_days &&
                    formik.errors.default_due_days && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formik.errors.default_due_days}
                      </p>
                    )}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formik.values.is_active}
                  onCheckedChange={(checked) =>
                    formik.setFieldValue("is_active", checked)
                  }
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active (will be used in new loan workflows)
                </Label>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6 mt-4">
              {formik.values.requires_documents && !isDocumentsStepValid() && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Please add at least one document upload field and ensure all
                    fields have a name.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_documents"
                    checked={formik.values.requires_documents}
                    onCheckedChange={(checked) => {
                      formik.setFieldValue("requires_documents", checked);
                      if (!checked) {
                        // Remove all file upload fields when disabled
                        setFormFields(
                          formFields.filter(
                            (f) =>
                              f.field_type !== "file_pdf" &&
                              f.field_type !== "file_image",
                          ),
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor="requires_documents"
                    className="cursor-pointer"
                  >
                    This task requires document uploads
                  </Label>
                </div>

                {formik.values.requires_documents && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="document_instructions">
                        General Instructions (Optional)
                      </Label>
                      <Textarea
                        id="document_instructions"
                        name="document_instructions"
                        placeholder="E.g., Please ensure all documents are clear and legible. Photos should show all four corners of the document."
                        value={formik.values.document_instructions}
                        onChange={formik.handleChange}
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground">
                        Provide general guidance for uploading documents
                        (optional).
                      </p>
                    </div>

                    {/* Document Upload Fields */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Required Documents</h4>
                          <p className="text-sm text-muted-foreground">
                            Add specific document upload fields (PDFs or images)
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newField: FormField = {
                              field_name: "",
                              field_label: "",
                              field_type: "file_pdf",
                              is_required: true,
                              order_index: formFields.length,
                            };
                            console.log(
                              "➕ TaskWizard: Adding document upload field:",
                              newField,
                            );
                            setFormFields([...formFields, newField]);
                            setEditingFieldIndex(formFields.length);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Document Field
                        </Button>
                      </div>

                      {formFields.filter(
                        (f) =>
                          f.field_type === "file_pdf" ||
                          f.field_type === "file_image",
                      ).length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="flex flex-col items-center justify-center py-8">
                            <File className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No document fields yet. Click "Add Document Field"
                              to create one.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {formFields.map((field, index) => {
                            // Only show file upload fields in Documents tab
                            if (
                              field.field_type !== "file_pdf" &&
                              field.field_type !== "file_image"
                            )
                              return null;

                            return (
                              <Card key={index}>
                                <CardContent className="pt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Document Name</Label>
                                      <Input
                                        placeholder="e.g., Driver's License Front"
                                        value={field.field_label}
                                        onChange={(e) =>
                                          handleUpdateFormField(index, {
                                            field_label: e.target.value,
                                            field_name: e.target.value
                                              .toLowerCase()
                                              .replace(/\s+/g, "_"),
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>File Type</Label>
                                      <Select
                                        value={field.field_type}
                                        onValueChange={(
                                          value: TaskFormFieldType,
                                        ) => {
                                          console.log(
                                            `🔄 TaskWizard: Changing document type to "${value}"`,
                                          );
                                          handleUpdateFormField(index, {
                                            field_type: value,
                                          });
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="file_pdf">
                                            📄 PDF Document
                                          </SelectItem>
                                          <SelectItem value="file_image">
                                            🖼️ Image (JPG, PNG)
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                      <Label>Help Text</Label>
                                      <Input
                                        placeholder="e.g., Upload a clear photo of the front of your license"
                                        value={field.help_text || ""}
                                        onChange={(e) =>
                                          handleUpdateFormField(index, {
                                            help_text: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={field.is_required}
                                        onCheckedChange={(checked) =>
                                          handleUpdateFormField(index, {
                                            is_required: checked,
                                          })
                                        }
                                      />
                                      <Label className="cursor-pointer text-sm">
                                        Required
                                      </Label>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveFormField(index)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Each document field = one specific upload
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              E.g., "INE Front", "INE Back", "Proof of Address"
                              - clients will upload one file per field.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </TabsContent>

            {/* Custom Form Tab */}
            <TabsContent value="custom-form" className="space-y-6 mt-4">
              {formik.values.has_custom_form && !isCustomFormStepValid() && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {formFields.filter(
                      (f) =>
                        f.field_type !== "file_pdf" &&
                        f.field_type !== "file_image",
                    ).length === 0
                      ? "Please add at least one custom form field or disable custom form."
                      : "Please ensure all custom form fields have a label."}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_custom_form"
                    checked={formik.values.has_custom_form}
                    onCheckedChange={(checked) => {
                      formik.setFieldValue("has_custom_form", checked);
                      if (!checked) {
                        // Remove only non-file fields (keep document upload fields)
                        setFormFields(
                          formFields.filter(
                            (f) =>
                              f.field_type === "file_pdf" ||
                              f.field_type === "file_image",
                          ),
                        );
                      }
                    }}
                  />
                  <Label htmlFor="has_custom_form" className="cursor-pointer">
                    Add custom form fields to this task
                  </Label>
                </div>

                {formik.values.has_custom_form && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Add input fields to collect information (text, numbers,
                        emails, etc.)
                        <br />
                        <span className="text-xs">
                          For document uploads, use the Documents tab
                        </span>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddFormField}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>

                    {formFields.filter(
                      (f) =>
                        f.field_type !== "file_pdf" &&
                        f.field_type !== "file_image",
                    ).length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No custom form fields yet. Click "Add Field" to
                            create one.
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Note: Document uploads are configured in the
                            Documents tab
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {formFields.map((field, index) => {
                          // Skip file upload fields in Custom Form tab
                          if (
                            field.field_type === "file_pdf" ||
                            field.field_type === "file_image"
                          )
                            return null;

                          return (
                            <Card key={index}>
                              <CardContent className="pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Field Label</Label>
                                    <Input
                                      placeholder="e.g., License Number"
                                      value={field.field_label}
                                      onChange={(e) =>
                                        handleUpdateFormField(index, {
                                          field_label: e.target.value,
                                          field_name: e.target.value
                                            .toLowerCase()
                                            .replace(/\s+/g, "_"),
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Field Type</Label>
                                    <Select
                                      value={field.field_type}
                                      onValueChange={(
                                        value: TaskFormFieldType,
                                      ) => {
                                        console.log(
                                          `🔄 TaskWizard: Changing field type from "${field.field_type}" to "${value}"`,
                                        );
                                        handleUpdateFormField(index, {
                                          field_type: value,
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">
                                          Text
                                        </SelectItem>
                                        <SelectItem value="number">
                                          Number
                                        </SelectItem>
                                        <SelectItem value="email">
                                          Email
                                        </SelectItem>
                                        <SelectItem value="phone">
                                          Phone
                                        </SelectItem>
                                        <SelectItem value="date">
                                          Date
                                        </SelectItem>
                                        <SelectItem value="textarea">
                                          Text Area
                                        </SelectItem>
                                        <SelectItem value="checkbox">
                                          Checkbox
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      For document uploads, use the Documents
                                      tab
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Placeholder</Label>
                                    <Input
                                      placeholder="e.g., Enter your license number"
                                      value={field.placeholder || ""}
                                      onChange={(e) =>
                                        handleUpdateFormField(index, {
                                          placeholder: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Help Text</Label>
                                    <Input
                                      placeholder="e.g., 9-digit license number"
                                      value={field.help_text || ""}
                                      onChange={(e) =>
                                        handleUpdateFormField(index, {
                                          help_text: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.is_required}
                                      onCheckedChange={(checked) =>
                                        handleUpdateFormField(index, {
                                          is_required: checked,
                                        })
                                      }
                                    />
                                    <Label className="text-sm">
                                      Required field
                                    </Label>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFormField(index)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </TabsContent>

            {/* Summary/Review Tab */}
            <TabsContent value="summary" className="space-y-6 mt-4">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">
                    Review Your Task Template
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review all the details below before creating your task
                  template.
                </p>

                {/* Basic Info Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Task Type
                        </p>
                        <p className="text-sm">
                          {taskTypes.find(
                            (t) => t.value === formik.values.task_type,
                          )?.label || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Title
                        </p>
                        <p className="text-sm font-semibold">
                          {formik.values.title || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Priority
                        </p>
                        <Badge
                          className={getPriorityColor(formik.values.priority)}
                        >
                          {formik.values.priority}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Default Due Days
                        </p>
                        <p className="text-sm">
                          {formik.values.default_due_days
                            ? `${formik.values.default_due_days} days`
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                    {formik.values.description && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Description
                        </p>
                        <p className="text-sm mt-1">
                          {formik.values.description}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        variant={
                          formik.values.is_active ? "default" : "secondary"
                        }
                      >
                        {formik.values.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Documents Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Document Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formik.values.requires_documents ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Documents required
                          </span>
                        </div>

                        {/* Show document upload fields */}
                        {formFields.filter(
                          (f) =>
                            f.field_type === "file_pdf" ||
                            f.field_type === "file_image",
                        ).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Document Upload Fields (
                              {
                                formFields.filter(
                                  (f) =>
                                    f.field_type === "file_pdf" ||
                                    f.field_type === "file_image",
                                ).length
                              }
                              ):
                            </p>
                            {formFields
                              .filter(
                                (f) =>
                                  f.field_type === "file_pdf" ||
                                  f.field_type === "file_image",
                              )
                              .map((field, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 bg-muted rounded-md"
                                >
                                  {field.field_type === "file_pdf"
                                    ? "📄"
                                    : "🖼️"}{" "}
                                  {field.field_label}
                                  {field.is_required && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs ml-auto"
                                    >
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}

                        {formik.values.document_instructions && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              General Instructions
                            </p>
                            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                              {formik.values.document_instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No documents required for this task
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Custom Form Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Custom Form Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formik.values.has_custom_form &&
                    formFields.filter(
                      (f) =>
                        f.field_type !== "file_pdf" &&
                        f.field_type !== "file_image",
                    ).length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {
                              formFields.filter(
                                (f) =>
                                  f.field_type !== "file_pdf" &&
                                  f.field_type !== "file_image",
                              ).length
                            }{" "}
                            custom{" "}
                            {formFields.filter(
                              (f) =>
                                f.field_type !== "file_pdf" &&
                                f.field_type !== "file_image",
                            ).length === 1
                              ? "field"
                              : "fields"}{" "}
                            configured
                          </span>
                        </div>
                        <div className="space-y-2">
                          {formFields
                            .filter(
                              (f) =>
                                f.field_type !== "file_pdf" &&
                                f.field_type !== "file_image",
                            )
                            .map((field, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-muted rounded-md"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {field.field_label}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {field.field_type.replace("_", " ")}
                                    </Badge>
                                    {field.is_required && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No custom form fields
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Preview */}
          <AnimatePresence>
            {formik.values.title && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 mt-6"
              >
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Template Preview:
                </p>
                <div className="space-y-2">
                  <p className="font-semibold">{formik.values.title}</p>
                  {formik.values.description && (
                    <p className="text-sm text-muted-foreground">
                      {formik.values.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getPriorityColor(formik.values.priority)}>
                      {formik.values.priority}
                    </Badge>
                    {formik.values.task_type && (
                      <Badge variant="outline">
                        {
                          taskTypes.find(
                            (t) => t.value === formik.values.task_type,
                          )?.label
                        }
                      </Badge>
                    )}
                    {formik.values.default_due_days && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        Due in {formik.values.default_due_days} days
                      </Badge>
                    )}
                    {formik.values.requires_documents && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <File className="h-3 w-3" />
                        Requires Documents
                      </Badge>
                    )}
                    {formik.values.has_custom_form && formFields.length > 0 && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        {formFields.length} Custom Fields
                      </Badge>
                    )}
                    <Badge
                      variant={
                        formik.values.is_active ? "default" : "secondary"
                      }
                    >
                      {formik.values.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t mt-6">
            <div>
              {activeTab !== "basic" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {activeTab !== "summary" ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canProceedToNextStep()}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => formik.handleSubmit()}
                  disabled={isSubmitting || !isFormComplete()}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Plus className="h-4 w-4" />
                      </motion.div>
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {isEditMode ? "Update Template" : "Create Template"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskWizard;
