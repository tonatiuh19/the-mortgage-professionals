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
  Sparkles,
  TrendingUp,
  Clock,
  Link2,
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
import BrokerShareLinkModal from "@/components/BrokerShareLinkModal";
import type { Broker } from "@shared/api";

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
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
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
      id: "app_sent",
      name: "App Sent",
      color: "bg-gray-50",
      headerColor: "bg-gray-100",
      textColor: "text-gray-700",
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
      id: "prequalified",
      name: "Prequalified",
      color: "bg-cyan-50",
      headerColor: "bg-cyan-100",
      textColor: "text-cyan-700",
      description: "Client prequalified",
    },
    {
      id: "preapproved",
      name: "Preapproved",
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
          "Track all loan applications through the process",
        )}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Clean Modern Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                      <Kanban className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
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

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Clean Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search applications, clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-80 h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                              <SelectItem value="purchase">Purchase</SelectItem>
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

                {/* New Loan / Get My Link Button */}
                {isPartner ? (
                  <Button
                    onClick={() => setShareLinkOpen(true)}
                    className="gap-2 h-10 px-6 bg-primary text-white"
                  >
                    <Link2 className="h-4 w-4" />
                    Get My Link
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsNewLoanOpen(true)}
                    className="gap-2 h-10 px-6 bg-primary text-white"
                  >
                    <Plus className="h-4 w-4" />
                    New Loan
                  </Button>
                )}
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

                          {/* Broker / Partner */}
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
        <BrokerShareLinkModal
          open={shareLinkOpen}
          onOpenChange={setShareLinkOpen}
          broker={partnerAsBroker}
          useSelfEndpoint
        />
      </div>
    </>
  );
};

export default Pipeline;
