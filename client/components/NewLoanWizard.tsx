import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import {
  Home,
  DollarSign,
  FileText,
  CheckCircle,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createLoan,
  saveLoanDraft,
  clearLoanDraft,
} from "@/store/slices/pipelineSlice";
import { fetchClients } from "@/store/slices/clientsSlice";
import { fetchTasks } from "@/store/slices/tasksSlice";
import { fetchBrokers } from "@/store/slices/brokersSlice";
import type { GetClientsResponse, TaskTemplate } from "@shared/api";

interface NewLoanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Task {
  template_id?: number;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  due_days: number;
}

interface SelectedTemplate extends TaskTemplate {
  due_days: number;
}

const loanTypes = [
  { value: "purchase", label: "Purchase" },
  { value: "refinance", label: "Refinance" },
  { value: "home_equity", label: "Home Equity" },
  { value: "commercial", label: "Commercial" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

const propertyTypes = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "multi_family", label: "Multi Family" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "other", label: "Other" },
];

const taskTypes = [
  { value: "document_collection", label: "Document Collection" },
  { value: "follow_up", label: "Follow Up" },
  { value: "review", label: "Review" },
  { value: "approval", label: "Approval" },
  { value: "closing", label: "Closing" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const step1Schema = Yup.object({
  client_email: Yup.string().email("Invalid email").required("Required"),
  client_first_name: Yup.string().required("Required"),
  client_last_name: Yup.string().required("Required"),
  client_phone: Yup.string().required("Required"),
});

const step2Schema = Yup.object({
  loan_type: Yup.string().required("Required"),
  loan_amount: Yup.number()
    .min(1, "Must be greater than 0")
    .required("Required"),
  property_value: Yup.number()
    .min(1, "Must be greater than 0")
    .required("Required"),
  down_payment: Yup.number().min(0).required("Required"),
  loan_purpose: Yup.string(),
});

const step3Schema = Yup.object({
  property_address: Yup.string().required("Required"),
  property_city: Yup.string().required("Required"),
  property_state: Yup.string().required("Required"),
  property_zip: Yup.string().required("Required"),
  property_type: Yup.string().required("Required"),
});

const NewLoanWizard: React.FC<NewLoanWizardProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sessionToken, user } = useAppSelector((state) => state.brokerAuth);
  const { clients, isLoading: clientsLoading } = useAppSelector(
    (state) => state.clients,
  );
  const { tasks: taskTemplates, isLoading: templatesLoading } = useAppSelector(
    (state) => state.tasks,
  );
  const { brokers, isLoading: brokersLoading } = useAppSelector(
    (state) => state.brokers,
  );

  const [matchedClient, setMatchedClient] = useState<
    GetClientsResponse["clients"][number] | null
  >(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState<number | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [wasSuccessfullySubmitted, setWasSuccessfullySubmitted] =
    useState(false);

  const { loanDraft } = useAppSelector((state) => state.pipeline);

  const formik = useFormik({
    initialValues: {
      // Step 1: Client Info
      client_email: "",
      client_first_name: "",
      client_last_name: "",
      client_phone: "",
      // Step 2: Loan Details
      loan_type: "purchase",
      loan_amount: "",
      property_value: "",
      down_payment: "",
      loan_purpose: "",
      // Step 3: Property Details
      property_address: "",
      property_city: "",
      property_state: "",
      property_zip: "",
      property_type: "single_family",
      // Additional
      estimated_close_date: "",
      notes: "",
    },
    validationSchema:
      currentStep === 1
        ? step1Schema
        : currentStep === 2
          ? step2Schema
          : step3Schema,
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async (values) => {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleFinalSubmit(values);
      }
    },
  });

  // Load clients and task templates when the wizard opens
  useEffect(() => {
    if (open) {
      dispatch(fetchClients());
      dispatch(fetchTasks());
      // Fetch brokers if admin
      if (user && (user.role === "admin" || user.role === "superadmin")) {
        dispatch(fetchBrokers());
      }
      // Set default broker assignment to current user
      if (user) {
        setSelectedBrokerId(user.id);
      }
      // Check if there's a draft
      if (loanDraft) {
        setShowDraftPrompt(true);
      }
    }
  }, [open, dispatch, user, loanDraft]);

  const handleFinalSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      await dispatch(
        createLoan({
          ...values,
          tasks,
        }),
      ).unwrap();

      // Clear draft since loan was successfully created
      dispatch(clearLoanDraft());
      setWasSuccessfullySubmitted(true);

      toast({
        title: "Success! 🎉",
        description: "Loan application created and client notified via email.",
      });

      onSuccess?.();

      // Reset form and states without showing draft message
      formik.resetForm();
      setCurrentStep(1);
      setTasks([]);
      setMatchedClient(null);
      setSelectedBrokerId(user?.id || null);
      setShowDraftPrompt(false);

      // Close the dialog
      onOpenChange(false);

      // Reset success flag after a brief delay to ensure clean state
      setTimeout(() => setWasSuccessfullySubmitted(false), 100);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          (typeof error === "string" && error) || "Failed to create loan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Only save as draft if not successfully submitted and has form data
    if (!wasSuccessfullySubmitted) {
      const hasFormData = Object.values(formik.values).some(
        (value) =>
          value !== "" && value !== "purchase" && value !== "single_family",
      );
      if ((currentStep < 5 && hasFormData) || tasks.length > 0) {
        dispatch(
          saveLoanDraft({
            formData: formik.values,
            tasks,
            currentStep,
            savedAt: new Date().toISOString(),
          }),
        );
        toast({
          title: "Draft saved",
          description: "Your loan application has been saved as a draft.",
        });
      }
    }

    // Reset form and states
    formik.resetForm();
    setCurrentStep(1);
    setTasks([]);
    setMatchedClient(null);
    setSelectedBrokerId(user?.id || null);
    setShowDraftPrompt(false);
    setWasSuccessfullySubmitted(false);
    onOpenChange(false);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClientEmailBlur = () => {
    const email = formik.values.client_email?.trim().toLowerCase();
    if (!email || clients.length === 0) {
      setMatchedClient(null);
      return;
    }

    const match = clients.find((c) => c.email.toLowerCase() === email) as
      | GetClientsResponse["clients"][number]
      | undefined;

    if (match) {
      setMatchedClient(match);
      // Prefill fields from existing client
      formik.setFieldValue("client_first_name", match.first_name || "");
      formik.setFieldValue("client_last_name", match.last_name || "");
      if (match.phone) {
        formik.setFieldValue("client_phone", match.phone);
      }
      toast({
        title: "Existing client found",
        description: "Client details have been pre-filled from your CRM.",
      });
    } else {
      setMatchedClient(null);
    }
  };

  const addTemplateTask = (template: TaskTemplate) => {
    const newTaskFromTemplate: Task = {
      template_id: template.id,
      title: template.title,
      description: template.description || "",
      task_type: template.task_type,
      priority: template.priority,
      due_days: template.default_due_days || 3,
    };
    setTasks([...tasks, newTaskFromTemplate]);
    toast({
      title: "Task added",
      description: `${template.title} has been added to the loan.`,
    });
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const navigateToTasks = () => {
    handleClose();
    navigate("/admin/tasks");
  };

  const resumeDraft = () => {
    if (loanDraft) {
      formik.setValues(loanDraft.formData);
      setTasks(loanDraft.tasks);
      setCurrentStep(loanDraft.currentStep);
      setShowDraftPrompt(false);
      toast({
        title: "Draft restored",
        description: "Your loan application draft has been restored.",
      });
    }
  };

  const discardDraft = () => {
    dispatch(clearLoanDraft());
    setShowDraftPrompt(false);
    toast({
      title: "Draft discarded",
      description: "Your loan application draft has been deleted.",
    });
  };

  const fillTestData = () => {
    formik.setValues({
      client_email: "test.client@example.com",
      client_first_name: "John",
      client_last_name: "Doe",
      client_phone: "(555) 123-4567",
      loan_type: "purchase",
      loan_amount: "350000",
      property_value: "450000",
      down_payment: "100000",
      loan_purpose: "Primary residence purchase",
      property_address: "123 Main Street",
      property_city: "San Francisco",
      property_state: "CA",
      property_zip: "94102",
      property_type: "single_family",
      estimated_close_date: "2026-03-15",
      notes: "Test loan application for development",
    });
    toast({
      title: "Test data filled",
      description: "All form fields have been populated with test data.",
    });
  };

  const progress = (currentStep / 5) * 100;

  const steps = [
    { number: 1, title: "Client Info", icon: Home },
    { number: 2, title: "Loan Details", icon: DollarSign },
    { number: 3, title: "Property Info", icon: FileText },
    { number: 4, title: "Tasks", icon: CheckCircle },
    { number: 5, title: "Review", icon: User },
  ];

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Available active task templates
  const activeTemplates = taskTemplates.filter((t) => t.is_active);

  const isDev = import.meta.env.DEV;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !wasSuccessfullySubmitted) {
          handleClose();
        } else if (!isOpen && wasSuccessfullySubmitted) {
          // Just reset the success flag if closing after successful submission
          setWasSuccessfullySubmitted(false);
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Create New Loan Application
          </DialogTitle>
          <DialogDescription>
            Fill in the details to create a new loan application and assign
            tasks
          </DialogDescription>
          {isDev && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fillTestData}
              className="mt-2"
            >
              🧪 Fill Test Data
            </Button>
          )}
        </DialogHeader>

        {/* Draft Detection Prompt */}
        {showDraftPrompt && loanDraft && (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-5 w-5 text-primary dark:text-primary" />
                  <h4 className="font-semibold text-primary dark:text-primary">
                    Draft Available
                  </h4>
                </div>
                <p className="text-sm text-primary/70 dark:text-primary/80">
                  You have a saved draft from{" "}
                  {new Date(loanDraft.savedAt).toLocaleDateString()}{" "}
                  {new Date(loanDraft.savedAt).toLocaleTimeString([], {
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
                  className="bg-primary hover:bg-primary/90"
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

        {/* Progress Bar */}
        <div className="space-y-4 py-4">
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      currentStep >= step.number
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground">
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          {/* Step 1: Client Information */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
              <h3 className="text-lg font-semibold">Client Information</h3>
              <div>
                <Label htmlFor="client_email">Email*</Label>
                <Input
                  id="client_email"
                  type="email"
                  placeholder="client@example.com"
                  {...formik.getFieldProps("client_email")}
                  className={
                    formik.errors.client_email ? "border-destructive" : ""
                  }
                  onBlur={(e) => {
                    formik.getFieldProps("client_email").onBlur(e);
                    handleClientEmailBlur();
                  }}
                />
                {formik.errors.client_email && (
                  <p className="text-xs text-destructive mt-1">
                    {formik.errors.client_email as string}
                  </p>
                )}
                {matchedClient && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Existing client found: {matchedClient.first_name}{" "}
                    {matchedClient.last_name} - Details pre-filled below
                  </p>
                )}
                {!matchedClient && formik.values.client_email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    New client - Fill in the details below
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_first_name">First Name*</Label>
                  <Input
                    id="client_first_name"
                    {...formik.getFieldProps("client_first_name")}
                    className={
                      formik.errors.client_first_name
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {formik.errors.client_first_name && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.client_first_name as string}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="client_last_name">Last Name*</Label>
                  <Input
                    id="client_last_name"
                    {...formik.getFieldProps("client_last_name")}
                    className={
                      formik.errors.client_last_name ? "border-destructive" : ""
                    }
                  />
                  {formik.errors.client_last_name && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.client_last_name as string}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="client_phone">Phone*</Label>
                <Input
                  id="client_phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  {...formik.getFieldProps("client_phone")}
                  className={
                    formik.errors.client_phone ? "border-destructive" : ""
                  }
                />
                {formik.errors.client_phone && (
                  <p className="text-xs text-destructive mt-1">
                    {formik.errors.client_phone as string}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Loan Details */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
              <h3 className="text-lg font-semibold">Loan Details</h3>
              <div>
                <Label htmlFor="loan_type">Loan Type*</Label>
                <Select
                  value={formik.values.loan_type}
                  onValueChange={(value) =>
                    formik.setFieldValue("loan_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loan_amount">Loan Amount*</Label>
                  <Input
                    id="loan_amount"
                    type="number"
                    {...formik.getFieldProps("loan_amount")}
                    className={
                      formik.errors.loan_amount ? "border-destructive" : ""
                    }
                  />
                  {formik.errors.loan_amount && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.loan_amount as string}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="property_value">Property Value*</Label>
                  <Input
                    id="property_value"
                    type="number"
                    {...formik.getFieldProps("property_value")}
                    className={
                      formik.errors.property_value ? "border-destructive" : ""
                    }
                  />
                  {formik.errors.property_value && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.property_value as string}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="down_payment">Down Payment*</Label>
                <Input
                  id="down_payment"
                  type="number"
                  {...formik.getFieldProps("down_payment")}
                  className={
                    formik.errors.down_payment ? "border-destructive" : ""
                  }
                />
                {formik.errors.down_payment && (
                  <p className="text-xs text-destructive mt-1">
                    {formik.errors.down_payment as string}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="loan_purpose">Loan Purpose</Label>
                <Textarea
                  id="loan_purpose"
                  {...formik.getFieldProps("loan_purpose")}
                  rows={3}
                />
              </div>

              {/* Broker Assignment (Admin Only) */}
              {isAdmin && (
                <div className="pt-4 border-t">
                  <Label
                    htmlFor="assigned_broker"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Assign to Broker
                  </Label>
                  <Select
                    value={selectedBrokerId?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedBrokerId(parseInt(value))
                    }
                    disabled={brokersLoading}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select broker..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brokersLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading brokers...
                        </SelectItem>
                      ) : brokers.length > 0 ? (
                        brokers.map((broker) => (
                          <SelectItem
                            key={broker.id}
                            value={broker.id.toString()}
                          >
                            {broker.first_name} {broker.last_name}
                            {broker.id === user?.id && " (Me)"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No brokers available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Assign this loan to yourself or another broker in your team.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Property Details */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
              <h3 className="text-lg font-semibold">Property Information</h3>
              <div>
                <Label htmlFor="property_address">Address*</Label>
                <Input
                  id="property_address"
                  {...formik.getFieldProps("property_address")}
                  className={
                    formik.errors.property_address ? "border-destructive" : ""
                  }
                />
                {formik.errors.property_address && (
                  <p className="text-xs text-destructive mt-1">
                    {formik.errors.property_address as string}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="property_city">City*</Label>
                  <Input
                    id="property_city"
                    {...formik.getFieldProps("property_city")}
                    className={
                      formik.errors.property_city ? "border-destructive" : ""
                    }
                  />
                  {formik.errors.property_city && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.property_city as string}
                    </p>
                  )}
                </div>
                <div className="col-span-1">
                  <Label htmlFor="property_state">State*</Label>
                  <Input
                    id="property_state"
                    {...formik.getFieldProps("property_state")}
                    className={
                      formik.errors.property_state ? "border-destructive" : ""
                    }
                  />
                  {formik.errors.property_state && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.property_state as string}
                    </p>
                  )}
                </div>
                <div className="col-span-1">
                  <Label htmlFor="property_zip">ZIP*</Label>
                  <Input
                    id="property_zip"
                    {...formik.getFieldProps("property_zip")}
                    className={
                      formik.errors.property_zip ? "border-destructive" : ""
                    }
                  />
                  {formik.errors.property_zip && (
                    <p className="text-xs text-destructive mt-1">
                      {formik.errors.property_zip as string}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="property_type">Property Type*</Label>
                <Select
                  value={formik.values.property_type}
                  onValueChange={(value) =>
                    formik.setFieldValue("property_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimated_close_date">
                  Estimated Close Date
                </Label>
                <Input
                  id="estimated_close_date"
                  type="date"
                  {...formik.getFieldProps("estimated_close_date")}
                />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...formik.getFieldProps("notes")}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Tasks */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Assign Initial Tasks
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select task templates to assign to this loan. The client will
                  receive an email with instructions for each task.
                </p>

                {/* No Templates Warning */}
                {activeTemplates.length === 0 && (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-900 text-sm mb-1">
                          No task templates found
                        </p>
                        <p className="text-xs text-amber-700 mb-3">
                          You don't have any active task templates. Create
                          templates to quickly assign common tasks to loans.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={navigateToTasks}
                          className="h-8"
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Go to Tasks Page
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Templates */}
                {activeTemplates.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-sm mb-3">
                      Available Templates
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {activeTemplates.map((template) => {
                        const isAdded = tasks.some(
                          (t) => t.template_id === template.id,
                        );
                        return (
                          <Button
                            key={template.id}
                            type="button"
                            variant={isAdded ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => addTemplateTask(template)}
                            disabled={isAdded}
                            className="justify-start h-auto p-3"
                          >
                            <div className="flex items-start gap-2 w-full">
                              {isAdded ? (
                                <CheckCircle className="h-4 w-4 mt-0.5 text-primary" />
                              ) : (
                                <Plus className="h-4 w-4 mt-0.5" />
                              )}
                              <div className="flex-1 text-left">
                                <p className="font-medium text-xs">
                                  {template.title}
                                </p>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {template.default_due_days || 3}d
                              </Badge>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Tasks List */}
                {tasks.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <h4 className="font-medium text-sm mb-2">
                      Selected Tasks ({tasks.length})
                    </h4>
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{task.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                            {task.template_id && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-700"
                              >
                                Template
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due in {task.due_days} days
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTask(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Need a new template? */}
                <div className="p-3 border border-dashed rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    Need a different task?
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={navigateToTasks}
                    className="h-8"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Create New Template
                  </Button>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 flex items-start gap-1.5">
                    <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Don't worry! Your progress will be saved as a draft. You
                      can resume this loan application anytime.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300">
              <h3 className="text-lg font-semibold">Review & Confirm</h3>
              <p className="text-sm text-muted-foreground">
                Please review all details before creating the loan application.
              </p>

              {/* Client Information Summary */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Client Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Name</p>
                    <p className="font-medium">
                      {formik.values.client_first_name}{" "}
                      {formik.values.client_last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium">{formik.values.client_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p className="font-medium">{formik.values.client_phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    {matchedClient ? (
                      <Badge variant="secondary" className="text-xs">
                        Existing Client
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        New Client
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Loan Details Summary */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Loan Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Loan Type</p>
                    <p className="font-medium capitalize">
                      {formik.values.loan_type.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Loan Amount</p>
                    <p className="font-medium">
                      ${parseInt(formik.values.loan_amount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Property Value
                    </p>
                    <p className="font-medium">
                      ${parseInt(formik.values.property_value).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Down Payment
                    </p>
                    <p className="font-medium">
                      ${parseInt(formik.values.down_payment).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Property Details Summary */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Property Information
                </h4>
                <div className="text-sm space-y-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p className="font-medium">
                      {formik.values.property_address}
                    </p>
                    <p className="text-muted-foreground">
                      {formik.values.property_city},{" "}
                      {formik.values.property_state}{" "}
                      {formik.values.property_zip}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Property Type
                    </p>
                    <p className="font-medium capitalize">
                      {formik.values.property_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tasks Summary */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Assigned Tasks ({tasks.length})
                </h4>
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-muted/30 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {task.due_days}d
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tasks assigned
                  </p>
                )}
              </div>

              {/* Broker Assignment */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Broker Assignment
                </h4>
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Assigned to</p>
                  <p className="font-medium">
                    {(() => {
                      const selectedBroker = brokers.find(
                        (b) => b.id === selectedBrokerId,
                      );
                      if (selectedBroker) {
                        return `${selectedBroker.first_name} ${selectedBroker.last_name}${selectedBroker.id === user?.id ? " (Me)" : ""}`;
                      }
                      return user
                        ? `${user.first_name} ${user.last_name} (Me)`
                        : "Not assigned";
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This loan will be added to{" "}
                    {selectedBrokerId === user?.id ? "your" : "their"} pipeline.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handlePrevious}
            >
              {currentStep === 1 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                </>
              )}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : currentStep === 5 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" /> Create Loan
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewLoanWizard;
