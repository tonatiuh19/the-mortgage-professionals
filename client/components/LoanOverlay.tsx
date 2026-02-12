import React, { useState, useEffect } from "react";
import {
  Kanban,
  X,
  Calendar,
  DollarSign,
  MapPin,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  File,
  Image,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Download,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLoanDetails } from "@/store/slices/pipelineSlice";
import { fetchTaskDocuments } from "@/store/slices/clientPortalSlice";
import {
  deleteTaskInstance,
  updateTaskStatus,
  createTask,
  fetchTasks,
} from "@/store/slices/tasksSlice";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface LoanOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLoan: any;
  isLoadingDetails: boolean;
}

export function LoanOverlay({
  isOpen,
  onClose,
  selectedLoan,
  isLoadingDetails,
}: LoanOverlayProps) {
  const dispatch = useAppDispatch();
  const { sessionToken } = useAppSelector((state) => state.brokerAuth);
  const { tasks: taskTemplates } = useAppSelector((state) => state.tasks);

  const [taskDocuments, setTaskDocuments] = useState<
    Record<
      number,
      { pdfs: any[]; images: { main: any; extra: any[] }; loading: boolean }
    >
  >({});
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
    {},
  );
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [statusChangeComment, setStatusChangeComment] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: number;
    newStatus: string;
    taskTitle: string;
    currentStatus: string;
  } | null>(null);
  const [addTasksDialogOpen, setAddTasksDialogOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(
    new Set(),
  );
  const [isAddingTasks, setIsAddingTasks] = useState(false);

  // Fetch task templates when component mounts
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchTasks());
    }
  }, [dispatch, isOpen]);

  const handleViewTaskDocuments = async (taskId: number) => {
    if (taskDocuments[taskId]?.loading) return;

    setTaskDocuments((prev) => ({
      ...prev,
      [taskId]: {
        pdfs: [],
        images: { main: null, extra: [] },
        loading: true,
      },
    }));

    try {
      const result = await dispatch(fetchTaskDocuments(taskId)).unwrap();
      setTaskDocuments((prev) => ({
        ...prev,
        [taskId]: {
          ...result,
          loading: false,
        },
      }));
    } catch (error) {
      console.error("Error fetching documents:", error);
      setTaskDocuments((prev) => ({
        ...prev,
        [taskId]: {
          pdfs: [],
          images: { main: null, extra: [] },
          loading: false,
        },
      }));
    }
  };

  const handleApproveTask = async (taskId: number) => {
    try {
      setIsSubmitting(true);
      await axios.post(
        `/api/tasks/${taskId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      );

      toast({
        title: "Task Approved",
        description: "The task has been approved successfully.",
      });

      // Refresh loan details to update task status
      if (selectedLoan) {
        await dispatch(fetchLoanDetails(selectedLoan.id));
      }
    } catch (error: any) {
      console.error("Error approving task:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to approve task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (
    taskId: number,
    newStatus: string,
    taskTitle: string,
    currentStatus: string,
  ) => {
    setPendingStatusChange({
      taskId,
      newStatus,
      taskTitle,
      currentStatus,
    });
    setStatusChangeComment(""); // Clear previous comment
    setStatusChangeDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    if (!statusChangeComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a comment explaining the status change.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await dispatch(
        updateTaskStatus({
          taskId: pendingStatusChange.taskId,
          status: pendingStatusChange.newStatus,
          comment: statusChangeComment.trim(),
        }),
      ).unwrap();

      toast({
        title: "Status Updated",
        description: `Task "${pendingStatusChange.taskTitle}" status changed to ${pendingStatusChange.newStatus.replace("_", " ")}`,
      });

      // Refresh loan details to update task status
      if (selectedLoan) {
        await dispatch(fetchLoanDetails(selectedLoan.id));
      }

      setStatusChangeDialogOpen(false);
      setPendingStatusChange(null);
      setStatusChangeComment("");
    } catch (error: any) {
      console.error("Error updating task status:", error);
      toast({
        title: "Error",
        description: error || "Failed to update task status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReopenDialog = (taskId: number) => {
    setSelectedTaskId(taskId);
    setReopenReason("");
    setReopenDialogOpen(true);
  };

  const handleReopenTask = async () => {
    if (!selectedTaskId || !reopenReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for reopening the task",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post(
        `/api/tasks/${selectedTaskId}/reopen`,
        {
          reason: reopenReason,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      );

      toast({
        title: "Task Reopened",
        description: "The task has been reopened for revision.",
      });

      setReopenDialogOpen(false);
      setSelectedTaskId(null);
      setReopenReason("");

      // Refresh loan details
      if (selectedLoan) {
        await dispatch(fetchLoanDetails(selectedLoan.id));
      }
    } catch (error: any) {
      console.error("Error reopening task:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to reopen task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (task: any) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      setIsDeleting(true);
      await dispatch(deleteTaskInstance(taskToDelete.id)).unwrap();

      toast({
        title: "Task Deleted",
        description: `Task "${taskToDelete.title}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setTaskToDelete(null);

      // Refresh loan details
      if (selectedLoan) {
        await dispatch(fetchLoanDetails(selectedLoan.id));
      }
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: error || "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteTasks = async () => {
    if (!selectedLoan) return;
    const eligibleTasks = selectedLoan.tasks.filter(
      (task: any) =>
        selectedTasks.has(task.id) &&
        (task.status === "pending" ||
          task.status === "in_progress" ||
          task.status === "reopened"),
    );

    if (eligibleTasks.length === 0) {
      toast({
        title: "No Eligible Tasks",
        description:
          "Selected tasks cannot be deleted (completed tasks are protected)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);

      // Delete tasks one by one
      const deletePromises = eligibleTasks.map((task) =>
        dispatch(deleteTaskInstance(task.id)).unwrap(),
      );

      await Promise.all(deletePromises);

      toast({
        title: "Tasks Deleted",
        description: `${eligibleTasks.length} tasks have been deleted successfully.`,
      });

      setSelectedTasks(new Set());
      setBulkActionMode(false);

      // Refresh loan details
      if (selectedLoan) {
        await dispatch(fetchLoanDetails(selectedLoan.id));
      }
    } catch (error: any) {
      console.error("Error bulk deleting tasks:", error);
      toast({
        title: "Error",
        description: error || "Failed to delete tasks",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportMISMO = async () => {
    if (!selectedLoan) return;

    try {
      setIsSubmitting(true);
      const response = await axios.get(
        `/api/loans/${selectedLoan.id}/export-mismo`,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
          responseType: "blob",
        },
      );

      // Create download link
      const blob = new Blob([response.data], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MISMO_${selectedLoan.application_number}_${new Date().toISOString().split("T")[0]}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "MISMO Export Complete",
        description: "The MISMO file has been generated and downloaded.",
      });
    } catch (error: any) {
      console.error("Error exporting MISMO:", error);
      toast({
        title: "Export Failed",
        description:
          error.response?.data?.error ||
          "Failed to generate MISMO file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = (taskId: number) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatLoanType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Handle adding tasks from templates
  const handleTemplateSelection = (templateId: number, checked: boolean) => {
    setSelectedTemplates((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(templateId);
      } else {
        newSet.delete(templateId);
      }
      return newSet;
    });
  };

  const handleAddSelectedTasks = async () => {
    if (!selectedLoan || selectedTemplates.size === 0) return;

    try {
      setIsAddingTasks(true);

      // Get existing task template IDs to avoid duplicates
      const existingTemplateIds =
        selectedLoan.tasks
          ?.map((task: any) => task.template_id)
          .filter(Boolean) || [];

      // Filter out templates that are already assigned
      const templatesToAdd = Array.from(selectedTemplates).filter(
        (templateId) => !existingTemplateIds.includes(templateId),
      );

      if (templatesToAdd.length === 0) {
        toast({
          title: "No New Tasks",
          description:
            "All selected task templates are already assigned to this loan.",
          variant: "destructive",
        });
        setIsAddingTasks(false);
        return;
      }

      // Create task instances for each selected template
      const createPromises = templatesToAdd.map(async (templateId) => {
        const template = taskTemplates.find((t) => t.id === templateId);
        return dispatch(
          createTask({
            title: template.title,
            description: template.description,
            task_type: template.task_type,
            priority: template.priority,
            default_due_days: template.default_due_days,
            requires_documents: template.requires_documents,
            document_instructions: template.document_instructions,
            has_custom_form: template.has_custom_form,
            application_id: selectedLoan.id,
          }),
        ).unwrap();
      });

      await Promise.all(createPromises);

      toast({
        title: "Tasks Added",
        description: `${templatesToAdd.length} task(s) have been added successfully.`,
      });

      setSelectedTemplates(new Set());
      setAddTasksDialogOpen(false);

      // Refresh loan details to show new tasks
      await dispatch(fetchLoanDetails(selectedLoan.id));
    } catch (error: any) {
      console.error("Error adding tasks:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add tasks.",
        variant: "destructive",
      });
    } finally {
      setIsAddingTasks(false);
    }
  };

  // Filter available templates (exclude already assigned ones)
  const availableTemplates = taskTemplates.filter((template: any) => {
    const existingTemplateIds =
      selectedLoan?.tasks
        ?.map((task: any) => task.template_id)
        .filter(Boolean) || [];
    return !existingTemplateIds.includes(template.id);
  });
  const taskStatuses = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "pending_approval", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
    { value: "reopened", label: "Reopened" },
    { value: "cancelled", label: "Cancelled" },
    { value: "overdue", label: "Overdue" },
  ];

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "completed":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "pending_approval":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "approved":
        return "text-green-600 bg-green-50 border-green-200";
      case "reopened":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "cancelled":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "overdue":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleTaskSelection = (taskId: number, checked: boolean) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const completedTasks =
    selectedLoan?.tasks.filter((t: any) => t.status === "completed").length ||
    0;
  const approvedTasks =
    selectedLoan?.tasks.filter((t: any) => t.status === "approved").length || 0;
  const totalTasks = selectedLoan?.tasks.length || 0;
  const allTasksCount = totalTasks;
  const progressPercentage =
    allTasksCount > 0 ? (approvedTasks / allTasksCount) * 100 : 0;

  // Check if all tasks are fully completed (approved) for MISMO export
  const areAllTasksCompleted = totalTasks > 0 && approvedTasks === totalTasks;
  const canExportMISMO = sessionToken && areAllTasksCompleted; // Only brokers/admins with completed tasks

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-white">
        {isLoadingDetails ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Kanban className="h-12 w-12 mx-auto mb-3 animate-pulse text-blue-600" />
              <p className="text-sm text-gray-600">Loading details...</p>
            </div>
          </div>
        ) : selectedLoan ? (
          <>
            <SheetHeader className="border-b border-gray-100 pb-4 mb-6">
              <SheetTitle className="text-2xl font-bold text-gray-900">
                {selectedLoan.client_first_name} {selectedLoan.client_last_name}
              </SheetTitle>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <Badge
                  className={cn(
                    "text-xs font-medium px-3 py-1",
                    selectedLoan.priority === "urgent" &&
                      "bg-red-100 text-red-700 border-red-200",
                    selectedLoan.priority === "high" &&
                      "bg-orange-100 text-orange-700 border-orange-200",
                    selectedLoan.priority === "medium" &&
                      "bg-blue-100 text-blue-700 border-blue-200",
                    selectedLoan.priority === "low" &&
                      "bg-gray-100 text-gray-700 border-gray-200",
                  )}
                >
                  {selectedLoan.priority} priority
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs px-3 py-1">
                  {selectedLoan.status.replace("_", " ")}
                </Badge>
                {canExportMISMO ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportMISMO}
                    className="gap-2 h-8 px-3 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 hover:text-dark transition-colors duration-200"
                    disabled={isSubmitting}
                  >
                    <Download className="h-3 w-3" />
                    {isSubmitting ? "Generating..." : "Export MISMO"}
                  </Button>
                ) : totalTasks > 0 && !areAllTasksCompleted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-2 h-8 px-3 text-xs border-gray-200 text-gray-500 bg-gray-50 cursor-not-allowed"
                    title={`Complete all tasks to export MISMO (${approvedTasks}/${totalTasks} approved)`}
                  >
                    <Download className="h-3 w-3" />
                    Export MISMO
                  </Button>
                ) : totalTasks === 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-2 h-8 px-3 text-xs border-gray-200 text-gray-500 bg-gray-50 cursor-not-allowed"
                    title="Add tasks before exporting MISMO"
                  >
                    <Download className="h-3 w-3" />
                    Export MISMO
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {/* Loan Overview */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Loan Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-1">
                        Loan Amount
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(selectedLoan.loan_amount)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Property Value
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(selectedLoan.property_value)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        Property Address
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedLoan.property_address}
                        <br />
                        {selectedLoan.property_city},{" "}
                        {selectedLoan.property_state}{" "}
                        {selectedLoan.property_zip}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        Contact Information
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedLoan.client_email}
                        <br />
                        {selectedLoan.client_phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        Application Date
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedLoan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Task Progress */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Task Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {approvedTasks} of {totalTasks} completed
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {Math.round(progressPercentage)}% complete
                        </span>
                        {areAllTasksCompleted && totalTasks > 0 && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-1">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ready for Export
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    {totalTasks > 0 && !areAllTasksCompleted && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="text-amber-800 font-medium mb-1">
                              MISMO Export Unavailable
                            </p>
                            <p className="text-amber-700">
                              All tasks must be approved before MISMO export is
                              available.
                              {totalTasks - approvedTasks} task
                              {totalTasks - approvedTasks !== 1 ? "s" : ""}{" "}
                              remaining.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tasks Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Tasks
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddTasksDialogOpen(true)}
                        className="text-xs h-8 px-3 border-gray-300 text-gray-700 hover:text-dark hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Task
                      </Button>
                      {selectedLoan.tasks && selectedLoan.tasks.length > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkActionMode(!bulkActionMode)}
                            className="text-xs h-8 px-3 border-gray-300 text-gray-700 hover:text-dark hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
                          >
                            {bulkActionMode ? "Exit Bulk Mode" : "Bulk Actions"}
                          </Button>
                          {bulkActionMode && selectedTasks.size > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleBulkDeleteTasks}
                              className="text-xs gap-1 h-8 px-3 transition-colors duration-200 hover:bg-red-50 hover:border-red-300 hover:text-red-800"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete Selected ({selectedTasks.size})
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {selectedLoan.tasks && selectedLoan.tasks.length > 0 ? (
                    selectedLoan.tasks.map((task: any) => (
                      <Collapsible
                        key={task.id}
                        open={expandedTasks[task.id]}
                        onOpenChange={() => toggleTask(task.id)}
                      >
                        <div className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-3">
                            {bulkActionMode && (
                              <Checkbox
                                checked={selectedTasks.has(task.id)}
                                onCheckedChange={(checked) =>
                                  handleTaskSelection(
                                    task.id,
                                    checked as boolean,
                                  )
                                }
                                className="mt-1"
                              />
                            )}
                            <div className="flex-shrink-0 mt-1">
                              <div>
                                {task.status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : task.status === "in_progress" ? (
                                  <Clock className="h-4 w-4 text-blue-600" />
                                ) : task.status === "overdue" ? (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4
                                  className={cn(
                                    "font-medium text-sm text-gray-900",
                                    task.status === "completed" &&
                                      "line-through text-gray-500",
                                  )}
                                >
                                  {task.title}
                                </h4>
                                <div className="flex-shrink-0">
                                  <Select
                                    value={task.status}
                                    onValueChange={(newStatus) =>
                                      handleStatusChange(
                                        task.id,
                                        newStatus,
                                        task.title,
                                        task.status,
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        "h-7 text-xs w-32 border",
                                        getTaskStatusColor(task.status),
                                      )}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {taskStatuses.map((status) => (
                                        <SelectItem
                                          key={status.value}
                                          value={status.value}
                                          className="text-xs"
                                        >
                                          {status.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                                <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-medium">
                                  {task.task_type.replace("_", " ")}
                                </span>
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due{" "}
                                    {new Date(
                                      task.due_date,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                <Badge
                                  className={cn(
                                    "text-xs px-2 py-0.5 font-medium",
                                    task.priority === "urgent" &&
                                      "bg-red-100 text-red-700",
                                    task.priority === "high" &&
                                      "bg-orange-100 text-orange-700",
                                    task.priority === "medium" &&
                                      "bg-blue-100 text-blue-700",
                                    task.priority === "low" &&
                                      "bg-gray-100 text-gray-700",
                                  )}
                                >
                                  {task.priority}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1 text-gray-600 hover:text-dark hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200"
                                  >
                                    <File className="h-3 w-3" />
                                    Documents
                                    {expandedTasks[task.id] ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>

                                {/* Approve/Reopen buttons for completed tasks */}
                                {task.status === "completed" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-colors duration-200"
                                      onClick={() => handleApproveTask(task.id)}
                                      disabled={isSubmitting}
                                    >
                                      <Check className="h-3 w-3" />
                                      {isSubmitting
                                        ? "Approving..."
                                        : "Approve"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 transition-colors duration-200"
                                      onClick={() =>
                                        handleOpenReopenDialog(task.id)
                                      }
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      Reopen
                                    </Button>
                                  </>
                                )}

                                {/* Delete button for non-completed tasks */}
                                {(task.status === "pending" ||
                                  task.status === "in_progress" ||
                                  task.status === "reopened") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 hover:text-red-800 transition-colors duration-200"
                                    onClick={() => handleDeleteTask(task)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <CollapsibleContent className="mt-4 pl-7">
                            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                              {taskDocuments[task.id]?.loading ? (
                                <p className="text-xs text-gray-500">
                                  Loading documents...
                                </p>
                              ) : (
                                <>
                                  {/* PDFs */}
                                  {taskDocuments[task.id]?.pdfs?.length > 0 && (
                                    <div>
                                      <h6 className="text-xs font-semibold mb-2 text-gray-700">
                                        PDF Documents
                                      </h6>
                                      <div className="space-y-2">
                                        {taskDocuments[task.id].pdfs.map(
                                          (doc: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                                            >
                                              <div className="flex items-center gap-2">
                                                <File className="h-3 w-3 text-red-600" />
                                                <span className="text-xs text-gray-700">
                                                  {doc.document_name}
                                                </span>
                                              </div>
                                              <a
                                                href={doc.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                                View
                                              </a>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Images */}
                                  {(taskDocuments[task.id]?.images?.main ||
                                    taskDocuments[task.id]?.images?.extra
                                      ?.length > 0) && (
                                    <div>
                                      <h6 className="text-xs font-semibold mb-1">
                                        Images
                                      </h6>
                                      <div className="space-y-1">
                                        {taskDocuments[task.id]?.images
                                          ?.main && (
                                          <div className="flex items-center gap-2">
                                            <Image className="h-3 w-3 text-blue-600" />
                                            <span className="text-xs">
                                              Main image
                                            </span>
                                            <a
                                              href={
                                                taskDocuments[task.id].images
                                                  .main.file_url
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-primary hover:underline"
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          </div>
                                        )}
                                        {taskDocuments[
                                          task.id
                                        ]?.images?.extra?.map(
                                          (img: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="flex items-center gap-2"
                                            >
                                              <Image className="h-3 w-3 text-blue-600" />
                                              <span className="text-xs">
                                                Extra image {idx + 1}
                                              </span>
                                              <a
                                                href={img.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                              </a>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* No documents message */}
                                  {!taskDocuments[task.id]?.pdfs?.length &&
                                    !taskDocuments[task.id]?.images?.main &&
                                    !taskDocuments[task.id]?.images?.extra
                                      ?.length && (
                                      <p className="text-xs text-muted-foreground">
                                        No documents uploaded yet
                                      </p>
                                    )}
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewTaskDocuments(task.id)}
                                className="h-7 text-xs w-full mt-2 hover:bg-gray-100 transition-colors duration-200"
                              >
                                Refresh Documents
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        No Tasks Assigned
                      </h4>
                      <p className="text-xs text-gray-600 mb-4">
                        Add tasks to track progress and requirements for this
                        loan application.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddTasksDialogOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Your First Task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedLoan.notes && (
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-3 border-b border-gray-100">
                    <CardTitle className="text-lg text-gray-900">
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedLoan.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No loan selected</p>
          </div>
        )}
      </SheetContent>

      {/* Reopen Task Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent
          aria-labelledby="reopen-dialog-title"
          aria-describedby="reopen-dialog-description"
        >
          <DialogTitle id="reopen-dialog-title">
            Reopen Task for Revision
          </DialogTitle>
          <DialogDescription id="reopen-dialog-description">
            Please provide feedback explaining why this task needs to be
            revised. The client will receive an email with your feedback.
          </DialogDescription>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Example: The uploaded documents are not clear. Please re-upload high-quality scans..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReopenDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReopenTask}
              disabled={isSubmitting || !reopenReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
            >
              {isSubmitting ? "Reopening..." : "Reopen Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This
              action cannot be undone.
              {taskToDelete && (
                <div className="mt-2 p-3 bg-muted/50 rounded border text-sm">
                  <strong>Task:</strong> {taskToDelete.title}
                  <br />
                  <strong>Type:</strong>{" "}
                  {taskToDelete.task_type?.replace("_", " ")}
                  <br />
                  <strong>Status:</strong>{" "}
                  {taskToDelete.status?.replace("_", " ")}
                  <br />
                  <strong>Due:</strong>{" "}
                  {taskToDelete.due_date
                    ? new Date(taskToDelete.due_date).toLocaleDateString()
                    : "No due date"}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTask}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog
        open={statusChangeDialogOpen}
        onOpenChange={setStatusChangeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange && (
                <>
                  You are about to change the status of{" "}
                  <span className="font-semibold">
                    "{pendingStatusChange.taskTitle}"
                  </span>{" "}
                  from{" "}
                  <span className="capitalize font-semibold">
                    {pendingStatusChange.currentStatus.replace("_", " ")}
                  </span>{" "}
                  to{" "}
                  <span className="capitalize font-semibold">
                    {pendingStatusChange.newStatus.replace("_", " ")}
                  </span>
                  . Please provide a comment explaining the reason for this
                  change.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Comment <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Example: Client provided updated documents, needs review...  OR  Task priority changed due to timeline adjustment..."
                value={statusChangeComment}
                onChange={(e) => setStatusChangeComment(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {statusChangeComment.length}/500 characters • Required for audit
                purposes
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setStatusChangeDialogOpen(false);
                setPendingStatusChange(null);
                setStatusChangeComment("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isSubmitting || !statusChangeComment.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Tasks Dialog */}
      <Dialog open={addTasksDialogOpen} onOpenChange={setAddTasksDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          aria-labelledby="add-tasks-dialog-title"
          aria-describedby="add-tasks-dialog-description"
        >
          <DialogTitle
            id="add-tasks-dialog-title"
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5 text-blue-600" />
            Add Tasks from Templates
          </DialogTitle>
          <DialogDescription id="add-tasks-dialog-description">
            Select task templates to add to this loan application. Tasks that
            are already assigned to this loan are not shown.
          </DialogDescription>
          <div className="space-y-4 py-4">
            {availableTemplates.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {availableTemplates.map((template: any) => (
                  <div
                    key={template.id}
                    className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTemplates.has(template.id)}
                      onCheckedChange={(checked) =>
                        handleTemplateSelection(template.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-900">
                          {template.title}
                        </h4>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs px-2 py-0.5",
                            template.priority === "urgent" &&
                              "bg-red-100 text-red-700",
                            template.priority === "high" &&
                              "bg-orange-100 text-orange-700",
                            template.priority === "medium" &&
                              "bg-blue-100 text-blue-700",
                            template.priority === "low" &&
                              "bg-gray-100 text-gray-700",
                          )}
                        >
                          {template.priority}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">
                          Type: {template.task_type}
                        </span>
                        {template.default_due_days && (
                          <span className="text-xs text-gray-500">
                            Due: {template.default_due_days} days
                          </span>
                        )}
                        {template.requires_documents && (
                          <Badge variant="outline" className="text-xs">
                            Docs Required
                          </Badge>
                        )}
                        {template.has_custom_form && (
                          <Badge variant="outline" className="text-xs">
                            Custom Form
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  No Available Templates
                </h4>
                <p className="text-xs text-gray-600">
                  All task templates are already assigned to this loan, or no
                  templates have been created yet.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="flex-1">
              {selectedTemplates.size > 0 && (
                <p className="text-xs text-gray-600">
                  {selectedTemplates.size} template(s) selected
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddTasksDialogOpen(false);
                  setSelectedTemplates(new Set());
                }}
                disabled={isAddingTasks}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedTasks}
                disabled={selectedTemplates.size === 0 || isAddingTasks}
                className="gap-2"
              >
                {isAddingTasks ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add{" "}
                    {selectedTemplates.size > 0
                      ? `${selectedTemplates.size} `
                      : ""}
                    Task{selectedTemplates.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
