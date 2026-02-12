import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Kanban,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  DollarSign,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
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
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLoans,
  fetchLoanDetails,
  clearSelectedLoan,
} from "@/store/slices/pipelineSlice";
import { LoanOverlay } from "@/components/LoanOverlay";
import NewLoanWizard from "@/components/NewLoanWizard";

const Pipeline = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    loans,
    selectedLoan,
    isLoading: loading,
    isLoadingDetails,
  } = useAppSelector((state) => state.pipeline);
  const [searchQuery, setSearchQuery] = useState("");
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
      color: "bg-gray-50",
      headerColor: "bg-gray-100",
      textColor: "text-gray-700",
      description: "Being prepared",
    },
    {
      id: "submitted",
      name: "Submitted",
      color: "bg-blue-50",
      headerColor: "bg-blue-100",
      textColor: "text-blue-700",
      description: "Ready for review",
    },
    {
      id: "under_review",
      name: "In Review",
      color: "bg-yellow-50",
      headerColor: "bg-yellow-100",
      textColor: "text-yellow-700",
      description: "Under analysis",
    },
    {
      id: "documents_pending",
      name: "Docs Required",
      color: "bg-orange-50",
      headerColor: "bg-orange-100",
      textColor: "text-orange-700",
      description: "Awaiting documents",
    },
    {
      id: "underwriting",
      name: "Underwriting",
      color: "bg-purple-50",
      headerColor: "bg-purple-100",
      textColor: "text-purple-700",
      description: "In underwriting",
    },
    {
      id: "conditional_approval",
      name: "Conditional",
      color: "bg-indigo-50",
      headerColor: "bg-indigo-100",
      textColor: "text-indigo-700",
      description: "Conditions pending",
    },
    {
      id: "approved",
      name: "Approved",
      color: "bg-green-50",
      headerColor: "bg-green-100",
      textColor: "text-green-700",
      description: "Ready to close",
    },
    {
      id: "closed",
      name: "Closed",
      color: "bg-emerald-50",
      headerColor: "bg-emerald-100",
      textColor: "text-emerald-700",
      description: "Successfully closed",
    },
    {
      id: "denied",
      name: "Denied",
      color: "bg-red-50",
      headerColor: "bg-red-100",
      textColor: "text-red-700",
      description: "Application denied",
    },
    {
      id: "cancelled",
      name: "Cancelled",
      color: "bg-slate-50",
      headerColor: "bg-slate-100",
      textColor: "text-slate-700",
      description: "Cancelled by client",
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
          "Track all loan applications through the process",
        )}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Clean Modern Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                      <Kanban className="h-8 w-8 text-primary" />
                      Pipeline
                    </h1>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <p className="text-sm text-gray-600">
                        {loans.length} active applications
                      </p>
                      <Badge className="bg-blue-50 text-blue-700">Live</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Clean Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search applications, clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80 h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Badge className="bg-blue-500 text-white text-xs">
                        {loans.length}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Clean Filters */}
                <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 px-4">
                      <Filter className="h-4 w-4" />
                      Filters
                      <ChevronDown className="h-3 w-3 opacity-50" />
                      {activeFiltersCount > 0 && (
                        <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500 text-white">
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
                              setFilters((prev) => ({ ...prev, status: value }))
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
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
                              <SelectItem value="urgent">🔥 Urgent</SelectItem>
                              <SelectItem value="high">⚡ High</SelectItem>
                              <SelectItem value="medium">📋 Medium</SelectItem>
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
                              <SelectItem value="conventional">
                                Conventional
                              </SelectItem>
                              <SelectItem value="fha">FHA</SelectItem>
                              <SelectItem value="va">VA</SelectItem>
                              <SelectItem value="usda">USDA</SelectItem>
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
                              <SelectItem value="week">This Week</SelectItem>
                              <SelectItem value="month">This Month</SelectItem>
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

                {/* New Loan Button */}
                <Button
                  onClick={() => setIsNewLoanOpen(true)}
                  className="gap-2 h-10 px-6 bg-primary text-white"
                >
                  <Plus className="h-4 w-4" />
                  New Loan
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Kanban Board */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex gap-4 p-6 overflow-x-auto">
            {columns.map((column, index) => (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="flex flex-col h-full">
                  {/* Clean Column Header */}
                  <div
                    className={cn(
                      "rounded-lg border border-gray-200 p-3 mb-3 bg-white shadow-sm",
                    )}
                  >
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
                      "flex-1 space-y-3 p-3 rounded-lg border border-gray-200 min-h-[400px]",
                      column.color,
                    )}
                  >
                    {loansByColumn[column.id]?.map((loan: any) => (
                      <div
                        key={loan.id}
                        onClick={() => handleLoanClick(loan.id)}
                        className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                      >
                        {/* Priority Indicator */}
                        <div
                          className={cn(
                            "w-full h-0.5 rounded-full mb-3",
                            loan.priority === "urgent" && "bg-red-500",
                            loan.priority === "high" && "bg-orange-500",
                            loan.priority === "medium" && "bg-blue-500",
                            loan.priority === "low" && "bg-gray-400",
                          )}
                        ></div>

                        <div className="space-y-2">
                          {/* Card Header */}
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {loan.client_first_name} {loan.client_last_name}
                              </h4>
                              <p className="text-xs text-gray-500 font-mono">
                                {loan.application_number}
                              </p>
                            </div>
                          </div>

                          {/* Loan Amount */}
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              {formatCurrency(loan.loan_amount)}
                            </span>
                          </div>

                          {/* Loan Type */}
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700"
                          >
                            {formatLoanType(loan.loan_type)}
                          </Badge>

                          {/* Address */}
                          {loan.property_address && (
                            <div className="text-xs text-gray-600 truncate">
                              {loan.property_address}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(loan.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
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

                    {/* Empty State */}
                    {(!loansByColumn[column.id] ||
                      loansByColumn[column.id]?.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        </div>
                        <p className="text-xs text-gray-500">No applications</p>
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
            // Refresh loans after successful creation
            const filtersToApply = {
              ...filters,
              search: searchQuery || undefined,
            };
            Object.keys(filtersToApply).forEach((key) => {
              if (
                filtersToApply[key as keyof typeof filtersToApply] === "all" ||
                filtersToApply[key as keyof typeof filtersToApply] === ""
              ) {
                delete filtersToApply[key as keyof typeof filtersToApply];
              }
            });
            dispatch(fetchLoans(filtersToApply));
          }}
        />
      </div>
    </>
  );
};

export default Pipeline;
