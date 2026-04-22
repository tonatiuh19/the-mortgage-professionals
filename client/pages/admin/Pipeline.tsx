import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Kanban,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  UserX,
  DollarSign,
  ChevronDown,
  TrendingUp,
  Link2,
  RefreshCw,
  Users,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLoans,
  fetchLoanDetails,
  clearSelectedLoan,
  updateLoanStatus,
  updateLoanStatusLocal,
} from "@/store/slices/pipelineSlice";
import { fetchRealtorProspects } from "@/store/slices/realtorProspectingSlice";
import { toast } from "@/hooks/use-toast";
import { LoanOverlay } from "@/components/LoanOverlay";
import NewLoanWizard from "@/components/NewLoanWizard";
import BrokerShareLinkModal from "@/components/BrokerShareLinkModal";
import { RealtorProspectingBoard } from "@/components/RealtorProspectingBoard";
import type { Broker } from "@shared/api";

type PipelineView = "loan" | "realtor_prospecting";

const Pipeline = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    loans,
    selectedLoan,
    isLoading: loading,
    isLoadingDetails,
  } = useAppSelector((state) => state.pipeline);
  const realtorProspects = useAppSelector(
    (s) => s.realtorProspecting.prospects,
  );
  const realtorLoading = useAppSelector((s) => s.realtorProspecting.isLoading);

  const [activePipeline, setActivePipeline] = useState<PipelineView>("loan");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    loanType: "all",
    dateRange: "all",
    assignee: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [draggingLoanId, setDraggingLoanId] = useState<number | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [draggingFromColumn, setDraggingFromColumn] = useState<string | null>(
    null,
  );
  const [pendingMove, setPendingMove] = useState<{
    loanId: number;
    fromColumnId: string;
    toColumnId: string;
    loanLabel: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { user } = useAppSelector((state) => state.brokerAuth);
  const isPartner = user?.role === "broker";
  const partnerAsBroker: Broker | null = user
    ? {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone ?? null,
        role: user.role as "broker" | "admin",
        status: user.status,
        email_verified: user.email_verified,
        last_login: user.last_login ?? null,
        license_number: user.license_number ?? null,
        specializations: user.specializations ?? null,
      }
    : null;

  useEffect(() => {
    // Fetch loans with current filters
    const filtersToApply = {
      ...filters,
      search: searchQuery || undefined,
    };

    // Remove empty filter values
    Object.keys(filtersToApply).forEach((key) => {
      if (
        filtersToApply[key as keyof typeof filtersToApply] === "all" ||
        filtersToApply[key as keyof typeof filtersToApply] === ""
      ) {
        delete filtersToApply[key as keyof typeof filtersToApply];
      }
    });

    dispatch(fetchLoans(filtersToApply));
  }, [dispatch, filters, searchQuery]);

  const handleLoanClick = async (loanId: number) => {
    setIsPanelOpen(true);
    await dispatch(fetchLoanDetails(loanId));
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      dispatch(clearSelectedLoan());
    }, 300);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    loanId: number,
    fromColumnId: string,
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("loanId", String(loanId));
    setDraggingLoanId(loanId);
    setDraggingFromColumn(fromColumnId);
  };

  const handleDragEnd = () => {
    setDraggingLoanId(null);
    setDragOverColumnId(null);
    setDraggingFromColumn(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (columnId: string) => {
    setDragOverColumnId(columnId);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    toColumnId: string,
  ) => {
    e.preventDefault();
    const loanId = parseInt(e.dataTransfer.getData("loanId"), 10);
    const fromColumnId = draggingFromColumn;
    setDragOverColumnId(null);
    setDraggingLoanId(null);
    setDraggingFromColumn(null);

    if (!loanId || fromColumnId === toColumnId || !fromColumnId) return;

    const loan = loans.find((l) => l.id === loanId);
    const loanLabel = loan
      ? `${loan.client_first_name} ${loan.client_last_name} (${loan.application_number})`
      : `Loan #${loanId}`;

    setPendingMove({ loanId, fromColumnId, toColumnId, loanLabel });
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    setIsConfirming(true);
    try {
      await dispatch(
        updateLoanStatus({
          loanId: pendingMove.loanId,
          status: pendingMove.toColumnId,
        }),
      ).unwrap();
      dispatch(
        updateLoanStatusLocal({
          loanId: pendingMove.loanId,
          status: pendingMove.toColumnId,
        }),
      );
      toast({
        title: "Status updated",
        description: `${pendingMove.loanLabel} moved to ${columns.find((c) => c.id === pendingMove.toColumnId)?.name ?? pendingMove.toColumnId}.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
      setPendingMove(null);
    }
  };

  const formatLoanType = (type: string) => {
    return type
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

  const columns = [
    {
      id: "draft",
      name: "Draft",
      color: "bg-slate-50",
      headerColor: "bg-slate-100",
      textColor: "text-slate-600",
      description: "Action item for realtor",
    },
    {
      id: "app_sent",
      name: "App Sent",
      color: "bg-indigo-50",
      headerColor: "bg-indigo-100",
      textColor: "text-indigo-700",
      description: "Application sent to client",
    },
    {
      id: "application_received",
      name: "Application Received",
      color: "bg-blue-50",
      headerColor: "bg-blue-100",
      textColor: "text-blue-700",
      description: "Application received & reviewing",
    },
    {
      id: "preapproved",
      name: "Pre-Approved",
      color: "bg-teal-50",
      headerColor: "bg-teal-100",
      textColor: "text-teal-700",
      description: "Client preapproved",
    },
    {
      id: "under_contract_loan_setup",
      name: "Under Contract / Loan Setup",
      color: "bg-yellow-50",
      headerColor: "bg-yellow-100",
      textColor: "text-yellow-700",
      description: "Under contract, loan setup",
    },
    {
      id: "submitted_to_underwriting",
      name: "Submitted to Underwriting",
      color: "bg-orange-50",
      headerColor: "bg-orange-100",
      textColor: "text-orange-700",
      description: "Submitted to underwriting",
    },
    {
      id: "approved_with_conditions",
      name: "Approved with Conditions",
      color: "bg-purple-50",
      headerColor: "bg-purple-100",
      textColor: "text-purple-700",
      description: "Conditions pending",
    },
    {
      id: "clear_to_close",
      name: "Clear to Close",
      color: "bg-indigo-50",
      headerColor: "bg-indigo-100",
      textColor: "text-indigo-700",
      description: "Cleared for closing",
    },
    {
      id: "docs_out",
      name: "Docs Out",
      color: "bg-green-50",
      headerColor: "bg-green-100",
      textColor: "text-green-700",
      description: "Closing documents sent",
    },
    {
      id: "loan_funded",
      name: "Loan Funded",
      color: "bg-emerald-50",
      headerColor: "bg-emerald-100",
      textColor: "text-emerald-700",
      description: "Loan successfully funded",
    },
  ];

  // Update active filters count
  useEffect(() => {
    const count = Object.values(filters).filter(
      (value) => value !== "all",
    ).length;
    if (searchQuery) setActiveFiltersCount(count + 1);
    else setActiveFiltersCount(count);
  }, [filters, searchQuery]);

  // Use loans directly from Redux (already filtered by API)
  const loansByColumn = columns.reduce(
    (acc, col) => {
      acc[col.id] = loans.filter((l) => l.status === col.id);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Pipeline",
          "Track all loan applications and realtor prospects",
        )}
      />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 shadow-sm">
          <PageHeader
            variant="toolbar"
            icon={
              <Kanban className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
            }
            title={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 font-bold text-gray-900 hover:text-primary transition-colors group">
                    <span>
                      {activePipeline === "loan"
                        ? "Loan Pipeline"
                        : "Realtor Prospecting"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 shadow-lg">
                  <DropdownMenuLabel className="text-xs text-gray-400 font-normal uppercase tracking-wider">
                    Switch Pipeline
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setActivePipeline("loan")}
                    className={cn(
                      "gap-3 py-2.5 cursor-pointer",
                      activePipeline === "loan" &&
                        "bg-primary/5 text-primary font-semibold",
                    )}
                  >
                    <Kanban className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Loan Pipeline</div>
                      <div className="text-xs text-gray-400">
                        Track loan applications
                      </div>
                    </div>
                    {activePipeline === "loan" && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setActivePipeline("realtor_prospecting");
                      dispatch(fetchRealtorProspects({}));
                    }}
                    className={cn(
                      "gap-3 py-2.5 cursor-pointer",
                      activePipeline === "realtor_prospecting" &&
                        "bg-primary/5 text-primary font-semibold",
                    )}
                  >
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">
                        Realtor Prospecting
                      </div>
                      <div className="text-xs text-gray-400">
                        Build referral partnerships
                      </div>
                    </div>
                    {activePipeline === "realtor_prospecting" && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
            description={
              activePipeline === "loan" ? (
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  {loans.length} active applications
                  <Badge className="bg-blue-50 text-blue-700 text-[10px] h-4 px-1.5">
                    Live
                  </Badge>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-violet-500" />
                  {realtorProspects.length} realtor prospects
                  <Badge className="bg-violet-50 text-violet-700 text-[10px] h-4 px-1.5">
                    Live
                  </Badge>
                </span>
              )
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      activePipeline === "loan"
                        ? "Search applications, clients..."
                        : "Search realtors, opportunities..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-72 h-9"
                  />
                  {searchQuery && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {activePipeline === "loan"
                          ? loans.length
                          : realtorProspects.length}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isRefreshing || loading || realtorLoading}
                  onClick={async () => {
                    setIsRefreshing(true);
                    if (activePipeline === "loan") {
                      const filtersToApply = {
                        ...filters,
                        search: searchQuery || undefined,
                      };
                      Object.keys(filtersToApply).forEach((key) => {
                        if (
                          filtersToApply[key as keyof typeof filtersToApply] ===
                            "all" ||
                          filtersToApply[key as keyof typeof filtersToApply] ===
                            ""
                        ) {
                          delete filtersToApply[
                            key as keyof typeof filtersToApply
                          ];
                        }
                      });
                      await dispatch(fetchLoans(filtersToApply));
                    } else {
                      await dispatch(fetchRealtorProspects({}));
                    }
                    setIsRefreshing(false);
                  }}
                  className="h-9 w-9"
                  title="Refresh pipeline"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing || loading || realtorLoading ? "animate-spin" : ""}`}
                  />
                </Button>

                {/* Loan Pipeline: Filters + Action button */}
                {activePipeline === "loan" && (
                  <>
                    <DropdownMenu
                      open={showFilters}
                      onOpenChange={setShowFilters}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2 h-9 px-3 text-xs"
                        >
                          <Filter className="h-4 w-4" />
                          Filters
                          <ChevronDown className="h-3 w-3 opacity-50" />
                          {activeFiltersCount > 0 && (
                            <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-80 p-0 bg-white border shadow-lg rounded-lg"
                        align="end"
                      >
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <DropdownMenuLabel className="p-0">
                              <h3 className="font-semibold text-gray-900">
                                Filter Options
                              </h3>
                            </DropdownMenuLabel>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFilters({
                                  status: "all",
                                  priority: "all",
                                  loanType: "all",
                                  dateRange: "all",
                                  assignee: "all",
                                });
                                setShowFilters(false);
                              }}
                              className="h-8 text-xs text-red-600 hover:bg-red-50"
                            >
                              Clear all
                            </Button>
                          </div>
                          <DropdownMenuSeparator />
                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                Status
                              </label>
                              <Select
                                value={filters.status}
                                onValueChange={(value) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    status: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    All Statuses
                                  </SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem key={col.id} value={col.id}>
                                      {col.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                Priority
                              </label>
                              <Select
                                value={filters.priority}
                                onValueChange={(value) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    priority: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    All Priorities
                                  </SelectItem>
                                  <SelectItem value="urgent">
                                    🔥 Urgent
                                  </SelectItem>
                                  <SelectItem value="high">⚡ High</SelectItem>
                                  <SelectItem value="medium">
                                    📋 Medium
                                  </SelectItem>
                                  <SelectItem value="low">📝 Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                Loan Type
                              </label>
                              <Select
                                value={filters.loanType}
                                onValueChange={(value) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    loanType: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  <SelectItem value="purchase">
                                    Purchase
                                  </SelectItem>
                                  <SelectItem value="refinance">
                                    Refinance
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                Date Range
                              </label>
                              <Select
                                value={filters.dateRange}
                                onValueChange={(value) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    dateRange: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Time</SelectItem>
                                  <SelectItem value="today">Today</SelectItem>
                                  <SelectItem value="week">
                                    This Week
                                  </SelectItem>
                                  <SelectItem value="month">
                                    This Month
                                  </SelectItem>
                                  <SelectItem value="quarter">
                                    This Quarter
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isPartner ? (
                      <Button
                        onClick={() => setShareLinkOpen(true)}
                        className="gap-2 h-9 px-4 bg-primary text-white"
                      >
                        <Link2 className="h-4 w-4" />
                        Get My Link
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setIsNewLoanOpen(true)}
                        className="gap-2 h-9 px-4 bg-primary text-white"
                      >
                        <Plus className="h-4 w-4" />
                        New Loan
                      </Button>
                    )}
                  </>
                )}

                {/* Realtor Prospecting: Add opportunity */}
                {activePipeline === "realtor_prospecting" && !isPartner && (
                  <Button
                    onClick={() => {
                      // Trigger add modal on the board component via a ref or global state
                      // We dispatch a custom event to open the modal
                      window.dispatchEvent(
                        new CustomEvent("realtor-add-opportunity"),
                      );
                    }}
                    className="gap-2 h-9 px-4 bg-primary text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add opportunity
                  </Button>
                )}
              </div>
            }
          />
        </div>

        {/* Board content */}
        {activePipeline === "loan" ? (
          <>
            {/* Loan Kanban Board */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex gap-4 p-6 overflow-x-auto">
                {columns.map((column) => (
                  <div key={column.id} className="flex-shrink-0 w-80">
                    <div className="flex flex-col h-full">
                      {/* Clean Column Header */}
                      <div className="rounded-lg border border-gray-200 p-3 mb-3 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className={cn(
                                "font-semibold text-sm",
                                column.textColor,
                              )}
                            >
                              {column.name}
                            </h3>
                          </div>
                          <Badge className="bg-gray-100 text-gray-700 text-xs px-2 py-1">
                            {loansByColumn[column.id]?.length || 0}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {column.description}
                        </p>
                      </div>

                      {/* Column Content */}
                      <div
                        className={cn(
                          "flex-1 space-y-3 p-3 rounded-lg border-2 min-h-[400px] transition-all duration-150",
                          dragOverColumnId === column.id &&
                            draggingFromColumn !== column.id
                            ? "border-blue-400 bg-blue-50 scale-[1.01]"
                            : cn("border-gray-200", column.color),
                        )}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(column.id)}
                        onDragLeave={(e) => {
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
                            setDragOverColumnId(null);
                          }
                        }}
                        onDrop={(e) => handleDrop(e, column.id)}
                      >
                        {loansByColumn[column.id]?.map((loan: any) => (
                          <div
                            key={loan.id}
                            draggable={!isPartner}
                            onDragStart={(e) =>
                              handleDragStart(e, loan.id, column.id)
                            }
                            onDragEnd={handleDragEnd}
                            onClick={() =>
                              draggingLoanId === null &&
                              handleLoanClick(loan.id)
                            }
                            className={cn(
                              "bg-white rounded-lg border p-3 transition-all duration-150 select-none",
                              draggingLoanId === loan.id
                                ? "opacity-40 scale-95 border-blue-400 shadow-inner cursor-grabbing"
                                : "border-gray-200 cursor-grab hover:shadow-md hover:border-blue-300 active:cursor-grabbing",
                            )}
                          >
                            <div
                              className={cn(
                                "w-full h-0.5 rounded-full mb-3",
                                loan.priority === "urgent" && "bg-red-500",
                                loan.priority === "high" && "bg-orange-500",
                                loan.priority === "medium" && "bg-blue-500",
                                loan.priority === "low" && "bg-gray-400",
                              )}
                            />
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-sm text-gray-900 truncate">
                                    {loan.client_first_name}{" "}
                                    {loan.client_last_name}
                                  </h4>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {loan.application_number}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span className="text-sm font-medium text-green-700">
                                  {formatCurrency(loan.loan_amount)}
                                </span>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700"
                              >
                                {formatLoanType(loan.loan_type)}
                              </Badge>
                              {loan.property_address && (
                                <div className="text-xs text-gray-600 truncate">
                                  {loan.property_address}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                {loan.broker_first_name ||
                                loan.partner_first_name ? (
                                  <>
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500 truncate">
                                      {loan.broker_first_name
                                        ? `${loan.broker_first_name} ${loan.broker_last_name}`
                                        : `${loan.partner_first_name} ${loan.partner_last_name}`}
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                    <UserX className="h-3 w-3" />
                                    Unassigned
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      loan.created_at,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                                {loan.estimated_close_date && (
                                  <span className="text-xs text-blue-600">
                                    Close:{" "}
                                    {new Date(
                                      loan.estimated_close_date,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {(!loansByColumn[column.id] ||
                          loansByColumn[column.id]?.length === 0) && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500">
                              No applications
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loan Overlay */}
            <LoanOverlay
              isOpen={isPanelOpen}
              onClose={handleClosePanel}
              selectedLoan={selectedLoan}
              isLoadingDetails={isLoadingDetails}
            />

            {/* New Loan Wizard */}
            <NewLoanWizard
              open={isNewLoanOpen}
              onOpenChange={setIsNewLoanOpen}
              onSuccess={() => {
                const filtersToApply = {
                  ...filters,
                  search: searchQuery || undefined,
                };
                Object.keys(filtersToApply).forEach((key) => {
                  if (
                    filtersToApply[key as keyof typeof filtersToApply] ===
                      "all" ||
                    filtersToApply[key as keyof typeof filtersToApply] === ""
                  ) {
                    delete filtersToApply[key as keyof typeof filtersToApply];
                  }
                });
                dispatch(fetchLoans(filtersToApply));
              }}
            />
            <BrokerShareLinkModal
              open={shareLinkOpen}
              onOpenChange={setShareLinkOpen}
              broker={partnerAsBroker}
              useSelfEndpoint
            />

            {/* Status Change Confirmation Dialog */}
            <AlertDialog
              open={!!pendingMove}
              onOpenChange={(open) => {
                if (!open && !isConfirming) setPendingMove(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move loan to a new stage?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        You're about to move{" "}
                        <span className="font-semibold text-foreground">
                          {pendingMove?.loanLabel}
                        </span>{" "}
                        from{" "}
                        <span className="font-semibold text-foreground">
                          {
                            columns.find(
                              (c) => c.id === pendingMove?.fromColumnId,
                            )?.name
                          }
                        </span>{" "}
                        →{" "}
                        <span className="font-semibold text-foreground">
                          {
                            columns.find(
                              (c) => c.id === pendingMove?.toColumnId,
                            )?.name
                          }
                        </span>
                        .
                      </p>
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs leading-relaxed">
                        ⚡ This will trigger any active{" "}
                        <strong>Reminder Flows</strong> configured for the{" "}
                        <em>
                          {
                            columns.find(
                              (c) => c.id === pendingMove?.toColumnId,
                            )?.name
                          }
                        </em>{" "}
                        stage — including automated SMS and email sequences to
                        the client.
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isConfirming}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isConfirming}
                    onClick={handleConfirmMove}
                  >
                    {isConfirming ? "Moving…" : "Yes, move loan"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <RealtorProspectingBoard searchQuery={searchQuery} />
        )}
      </div>
    </>
  );
};

export default Pipeline;
