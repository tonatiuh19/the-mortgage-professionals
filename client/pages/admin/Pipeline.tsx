import React, { useEffect, useState } from "react";
import {
  Kanban,
  Plus,
  Search,
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
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLoans,
  fetchLoanDetails,
  clearSelectedLoan,
} from "@/store/slices/pipelineSlice";
import { fetchTaskDocuments } from "@/store/slices/clientPortalSlice";
import axios from "axios";
import { toast } from "@/hooks/use-toast";

const Pipeline = () => {
  const dispatch = useAppDispatch();
  const {
    loans,
    selectedLoan,
    isLoading: loading,
    isLoadingDetails,
  } = useAppSelector((state) => state.pipeline);
  const { sessionToken } = useAppSelector((state) => state.brokerAuth);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [taskDocuments, setTaskDocuments] = useState<
    Record<
      number,
      { pdfs: any[]; images: { main: any; extra: any[] }; loading: boolean }
    >
  >({});
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
    {},
  );
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchLoans());
  }, [dispatch]);

  const handleLoanClick = async (loanId: number) => {
    setIsPanelOpen(true);
    await dispatch(fetchLoanDetails(loanId));
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      dispatch(clearSelectedLoan());
      setTaskDocuments({});
      setExpandedTasks({});
    }, 300);
  };

  const handleViewTaskDocuments = async (taskId: number) => {
    const isCurrentlyExpanded = expandedTasks[taskId];

    // Toggle expansion
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

    // If collapsing or already loaded, don't fetch again
    if (isCurrentlyExpanded || taskDocuments[taskId]) return;

    // Set loading state
    setTaskDocuments((prev) => ({
      ...prev,
      [taskId]: { pdfs: [], images: { main: null, extra: [] }, loading: true },
    }));

    try {
      const result = await dispatch(fetchTaskDocuments(taskId)).unwrap();
      console.log("Fetched documents for task", taskId, result);
      setTaskDocuments((prev) => ({
        ...prev,
        [taskId]: {
          pdfs: result.pdfs || [],
          images: result.images || { main: null, extra: [] },
          loading: false,
        },
      }));
    } catch (error) {
      console.error("Error fetching documents for task", taskId, error);
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
        { reason: reopenReason },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      );

      toast({
        title: "Task Reopened",
        description: "The client will be notified to revise the task.",
      });

      setReopenDialogOpen(false);
      setReopenReason("");
      setSelectedTaskId(null);

      // Refresh loan details to update task status
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

  const handleExportMISMO = async () => {
    if (!selectedLoan) return;

    try {
      toast({
        title: "Generating MISMO File",
        description: "Please wait while we prepare your file...",
      });

      const response = await axios.get(
        `/api/loans/${selectedLoan.id}/export-mismo`,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
          responseType: "blob", // Important for file download
        },
      );

      // Create blob URL and trigger download
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
        title: "MISMO File Downloaded",
        description: "The file has been downloaded successfully.",
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
    }
  };

  const formatLoanType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-200";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredLoans = loans.filter(
    (loan) =>
      loan.client_first_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      loan.client_last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.application_number.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const columns = [
    { id: "draft", title: "Draft", color: "bg-slate-500" },
    { id: "submitted", title: "Submitted", color: "bg-blue-500" },
    { id: "under_review", title: "Under Review", color: "bg-indigo-500" },
    {
      id: "documents_pending",
      title: "Documents Pending",
      color: "bg-amber-500",
    },
    { id: "underwriting", title: "Underwriting", color: "bg-purple-500" },
    {
      id: "conditional_approval",
      title: "Conditional Approval",
      color: "bg-cyan-500",
    },
    { id: "approved", title: "Approved", color: "bg-emerald-500" },
    { id: "closed", title: "Closed", color: "bg-green-600" },
  ];

  const groupedLoans = columns.reduce(
    (acc, col) => {
      acc[col.id] = filteredLoans.filter((l) => l.status === col.id);
      return acc;
    },
    {} as Record<string, typeof loans>,
  );

  const completedTasks =
    selectedLoan?.tasks.filter((t) => t.status === "completed").length || 0;
  const totalTasks = selectedLoan?.tasks.length || 0;
  const approvedTasks =
    selectedLoan?.tasks.filter((t) => t.status === "approved").length || 0;
  const allTasksApproved = totalTasks > 0 && approvedTasks === totalTasks;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Pipeline",
          "Manage loan applications in your pipeline",
        )}
      />
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Kanban className="h-7 w-7 text-primary" />
                Pipeline
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track all loan applications through their lifecycle
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search loans..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-4 mt-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Pipeline
                    </p>
                    <p className="text-2xl font-bold mt-1">{loans.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Kanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Under Review
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {groupedLoans.under_review.length +
                        groupedLoans.documents_pending.length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      In Underwriting
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {groupedLoans.underwriting.length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Approved
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {groupedLoans.approved.length +
                        groupedLoans.closed.length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Kanban className="h-12 w-12 mx-auto mb-3 animate-pulse" />
              <p>Loading pipeline...</p>
            </div>
          </div>
        ) : loans.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="border-dashed max-w-md">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <Kanban className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No loans yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first loan application to see it here
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="inline-flex gap-4 p-6 min-h-full">
              {columns.map((column) => {
                const columnLoans = groupedLoans[column.id];
                return (
                  <div
                    key={column.id}
                    className="w-80 flex-shrink-0 flex flex-col"
                  >
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn("w-3 h-3 rounded-full", column.color)}
                        />
                        <h3 className="font-semibold text-sm">
                          {column.title}
                        </h3>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {columnLoans.length}
                      </Badge>
                    </div>

                    {/* Column Cards */}
                    <div className="flex-1 space-y-3 overflow-y-auto pb-4 pt-2">
                      {columnLoans.length === 0 ? (
                        <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                          No loans
                        </div>
                      ) : (
                        columnLoans.map((loan) => (
                          <Card
                            key={loan.id}
                            className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 hover:-translate-y-1"
                            onClick={() => handleLoanClick(loan.id)}
                          >
                            <CardContent className="p-4">
                              {/* Client Name */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate">
                                    {loan.client_first_name}{" "}
                                    {loan.client_last_name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {loan.application_number}
                                  </p>
                                  {loan.broker_first_name && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      <User className="h-3 w-3 inline mr-1" />
                                      {loan.broker_first_name}{" "}
                                      {loan.broker_last_name}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs ml-2 capitalize",
                                    loan.priority === "urgent" &&
                                      "border-red-500 text-red-600 bg-red-50",
                                    loan.priority === "high" &&
                                      "border-orange-500 text-orange-600 bg-orange-50",
                                    loan.priority === "medium" &&
                                      "border-blue-500 text-blue-600 bg-blue-50",
                                    loan.priority === "low" &&
                                      "border-gray-500 text-gray-600 bg-gray-50",
                                  )}
                                >
                                  {loan.priority}
                                </Badge>
                              </div>

                              {/* Loan Details */}
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Amount
                                  </span>
                                  <span className="font-semibold">
                                    {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                      notation: "compact",
                                    }).format(loan.loan_amount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Type
                                  </span>
                                  <span className="font-medium capitalize">
                                    {formatLoanType(loan.loan_type)}
                                  </span>
                                </div>
                              </div>

                              {/* Task Progress */}
                              {loan.total_tasks > 0 && (
                                <div className="space-y-1.5 pt-3 border-t">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      Tasks
                                    </span>
                                    <span className="font-medium">
                                      {loan.completed_tasks}/{loan.total_tasks}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full transition-all duration-300",
                                        column.color,
                                      )}
                                      style={{
                                        width: `${(loan.completed_tasks / loan.total_tasks) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  {loan.next_task && (
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                      Next: {loan.next_task}
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Side Panel */}
        <Sheet open={isPanelOpen} onOpenChange={handleClosePanel}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Kanban className="h-12 w-12 mx-auto mb-3 animate-pulse text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading details...
                  </p>
                </div>
              </div>
            ) : selectedLoan ? (
              <>
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold">
                    {selectedLoan.client_first_name}{" "}
                    {selectedLoan.client_last_name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        selectedLoan.priority === "urgent" &&
                          "border-red-500 text-red-600 bg-red-50",
                        selectedLoan.priority === "high" &&
                          "border-orange-500 text-orange-600 bg-orange-50",
                        selectedLoan.priority === "medium" &&
                          "border-blue-500 text-blue-600 bg-blue-50",
                        selectedLoan.priority === "low" &&
                          "border-gray-500 text-gray-600 bg-gray-50",
                      )}
                    >
                      {selectedLoan.priority}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {formatStatus(selectedLoan.status)}
                    </Badge>
                    {selectedLoan.broker_first_name && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 border-blue-200 text-blue-700 cursor-help"
                              >
                                <User className="h-3 w-3 mr-1" />
                                {selectedLoan.broker_first_name}{" "}
                                {selectedLoan.broker_last_name}
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              This loan belongs to{" "}
                              {selectedLoan.broker_first_name}{" "}
                              {selectedLoan.broker_last_name}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </SheetHeader>

                {/* MISMO Export Button - Only show when all tasks are approved */}
                {allTasksApproved && (
                  <div className="mt-4">
                    <Button
                      onClick={handleExportMISMO}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                      size="lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export MISMO 3.4 for LendingPad
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      ✓ All tasks approved • Ready for submission
                    </p>
                  </div>
                )}

                <div className="mt-6 space-y-6">
                  {/* Overview Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">
                        Loan Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            Loan Amount
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(selectedLoan.loan_amount)}
                          </p>
                        </div>
                      </div>
                      {selectedLoan.property_value && (
                        <div className="flex items-center gap-3 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                              Property Value
                            </p>
                            <p className="font-semibold">
                              {formatCurrency(selectedLoan.property_value)}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            Property Address
                          </p>
                          <p className="font-medium">
                            {selectedLoan.property_address || "Not provided"}
                          </p>
                          {selectedLoan.property_city && (
                            <p className="text-xs text-muted-foreground">
                              {selectedLoan.property_city},{" "}
                              {selectedLoan.property_state}{" "}
                              {selectedLoan.property_zip}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            Contact
                          </p>
                          <p className="font-medium">
                            {selectedLoan.client_email}
                          </p>
                          {selectedLoan.client_phone && (
                            <p className="text-xs text-muted-foreground">
                              {selectedLoan.client_phone}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedLoan.estimated_close_date && (
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                              Estimated Close
                            </p>
                            <p className="font-medium">
                              {new Date(
                                selectedLoan.estimated_close_date,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Task Progress */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          Task Progress
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {completedTasks} of {totalTasks} completed
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Progress value={progressPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">
                          {Math.round(progressPercentage)}% complete
                        </p>
                      </div>

                      {/* Tasks List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedLoan.tasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No tasks assigned yet
                          </p>
                        ) : (
                          selectedLoan.tasks.map((task) => (
                            <Collapsible
                              key={task.id}
                              open={expandedTasks[task.id]}
                              onOpenChange={() =>
                                handleViewTaskDocuments(task.id)
                              }
                            >
                              <div
                                className={cn(
                                  "p-3 rounded-lg border transition-all",
                                  task.status === "completed" &&
                                    "bg-emerald-50/50 dark:bg-emerald-950/20",
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5">
                                    {task.status === "completed" ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : task.status === "in_progress" ? (
                                      <Clock className="h-4 w-4 text-blue-600" />
                                    ) : task.status === "overdue" ? (
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4
                                        className={cn(
                                          "font-medium text-sm",
                                          task.status === "completed" &&
                                            "line-through text-muted-foreground",
                                        )}
                                      >
                                        {task.title}
                                      </h4>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-xs capitalize",
                                          getTaskStatusColor(task.status),
                                        )}
                                      >
                                        {task.status.replace("_", " ")}
                                      </Badge>
                                    </div>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                      <span className="capitalize">
                                        {task.task_type.replace("_", " ")}
                                      </span>
                                      {task.due_date && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            Due{" "}
                                            {new Date(
                                              task.due_date,
                                            ).toLocaleDateString()}
                                          </span>
                                        </>
                                      )}
                                      <span>•</span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs capitalize"
                                      >
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs gap-1 hover:bg-primary/10"
                                        >
                                          <File className="h-3 w-3" />
                                          View Documents
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
                                            className="h-7 text-xs gap-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                            onClick={() =>
                                              handleApproveTask(task.id)
                                            }
                                            disabled={isSubmitting}
                                          >
                                            <Check className="h-3 w-3" />
                                            Approve
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs gap-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                                            onClick={() =>
                                              handleOpenReopenDialog(task.id)
                                            }
                                            disabled={isSubmitting}
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                            Reopen
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <CollapsibleContent className="mt-3 pt-3 border-t space-y-3">
                                  {taskDocuments[task.id]?.loading ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                      Loading documents...
                                    </p>
                                  ) : (
                                    <>
                                      {/* PDFs */}
                                      {taskDocuments[task.id]?.pdfs &&
                                        taskDocuments[task.id].pdfs.length >
                                          0 && (
                                          <div>
                                            <h5 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                              <FileText className="h-3 w-3 text-red-500" />
                                              PDFs (
                                              {
                                                taskDocuments[task.id].pdfs
                                                  .length
                                              }
                                              )
                                            </h5>
                                            <div className="space-y-2">
                                              {taskDocuments[task.id].pdfs.map(
                                                (pdf: any, idx: number) => (
                                                  <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                                                  >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                      <span className="truncate">
                                                        {pdf.filename}
                                                      </span>
                                                    </div>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      asChild
                                                      className="h-6 px-2 flex-shrink-0"
                                                    >
                                                      <a
                                                        href={`https://disruptinglabs.com${pdf.path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                      >
                                                        <ExternalLink className="h-3 w-3" />
                                                      </a>
                                                    </Button>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* Images */}
                                      {(taskDocuments[task.id]?.images.main ||
                                        (taskDocuments[task.id]?.images.extra &&
                                          taskDocuments[task.id].images.extra
                                            .length > 0)) && (
                                        <div>
                                          <h5 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                            <Image className="h-3 w-3 text-blue-500" />
                                            Images (
                                            {(taskDocuments[task.id].images.main
                                              ? 1
                                              : 0) +
                                              (taskDocuments[task.id].images
                                                .extra?.length || 0)}
                                            )
                                          </h5>
                                          <div className="space-y-2">
                                            {taskDocuments[task.id].images
                                              .main && (
                                              <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                  <span className="truncate">
                                                    {
                                                      taskDocuments[task.id]
                                                        .images.main.filename
                                                    }
                                                  </span>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  asChild
                                                  className="h-6 px-2 flex-shrink-0"
                                                >
                                                  <a
                                                    href={`https://disruptinglabs.com${taskDocuments[task.id].images.main.path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    <ExternalLink className="h-3 w-3" />
                                                  </a>
                                                </Button>
                                              </div>
                                            )}
                                            {taskDocuments[
                                              task.id
                                            ].images.extra?.map(
                                              (img: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                                                >
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                    <span className="truncate">
                                                      {img.filename}
                                                    </span>
                                                  </div>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="h-6 px-2 flex-shrink-0"
                                                  >
                                                    <a
                                                      href={`https://disruptinglabs.com${img.path}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                    >
                                                      <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                  </Button>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Empty State */}
                                      {(!taskDocuments[task.id] ||
                                        ((!taskDocuments[task.id].pdfs ||
                                          taskDocuments[task.id].pdfs.length ===
                                            0) &&
                                          !taskDocuments[task.id].images.main &&
                                          (!taskDocuments[task.id].images
                                            .extra ||
                                            taskDocuments[task.id].images.extra
                                              .length === 0))) && (
                                        <div className="text-center py-4">
                                          <File className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                          <p className="text-xs text-muted-foreground">
                                            No documents uploaded yet
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  {selectedLoan.notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedLoan.notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : null}
          </SheetContent>
        </Sheet>

        {/* Reopen Task Dialog */}
        <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reopen Task for Revision</DialogTitle>
              <DialogDescription>
                Please provide feedback explaining why this task needs to be
                revised. The client will receive an email with your feedback.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Example: The uploaded documents are not clear. Please re-upload high-quality scans..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={5}
                className="resize-none"
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
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? "Reopening..." : "Reopen Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Pipeline;
