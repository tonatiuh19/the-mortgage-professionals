import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  FileText,
  AlertCircle,
  TrendingUp,
  Users,
  User,
  Clock,
  CheckCircle2,
  Eye,
  ArrowRight,
  Link2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import NewLoanWizard from "@/components/NewLoanWizard";
import BrokerShareLinkModal from "@/components/BrokerShareLinkModal";
import { LoanOverlay } from "@/components/LoanOverlay";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLoans, fetchLoanDetails } from "@/store/slices/pipelineSlice";
import {
  fetchDashboardStats,
  fetchBrokerMetrics,
} from "@/store/slices/dashboardSlice";
import { logger } from "@/lib/logger";
import BrokerMetricsPanel from "@/components/BrokerMetricsPanel";
import { useSortableData } from "@/hooks/use-sortable-data";
import type { Broker } from "@shared/api";

const AdminDashboard = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loanOverlayOpen, setLoanOverlayOpen] = useState(false);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    loans,
    isLoading: loading,
    error: loansError,
    selectedLoan,
    isLoadingDetails,
  } = useAppSelector((state) => state.pipeline);
  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAppSelector((state) => state.dashboard);
  const { user, sessionToken } = useAppSelector((state) => state.brokerAuth);
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
    if (!sessionToken) return;
    try {
      dispatch(fetchLoans({}));
      dispatch(fetchDashboardStats());
      dispatch(fetchBrokerMetrics(undefined));
    } catch (error) {
      logger.error("Error loading dashboard data:", error);
    }
  }, [dispatch, sessionToken]);

  const handleLoanCreated = () => {
    try {
      dispatch(fetchLoans({}));
      dispatch(fetchDashboardStats());
      dispatch(fetchBrokerMetrics(undefined));
    } catch (error) {
      logger.error("Error refreshing dashboard data:", error);
    }
  };

  const handleOpenLoan = async (loanId: number) => {
    await dispatch(fetchLoanDetails(loanId));
    setLoanOverlayOpen(true);
  };

  const handleCloseLoan = () => {
    setLoanOverlayOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "underwriting":
      case "under_review":
        return "bg-primary";
      case "documents_pending":
        return "bg-amber-500";
      case "conditional_approval":
      case "approved":
        return "bg-primary/60";
      case "denied":
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-primary";
    }
  };

  const formatLoanType = (type: string) => {
    if (!type || typeof type !== "string") {
      return "N/A";
    }
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Prepare chart data from weekly activity with error handling
  const chartData = React.useMemo(() => {
    if (!stats?.weeklyActivity || !Array.isArray(stats.weeklyActivity)) {
      return [];
    }
    return stats.weeklyActivity.map((day) => ({
      name: new Date(day.date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      apps: day.applications || 0,
      closed: day.closed || 0,
    }));
  }, [stats]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      notation: value >= 1000000 ? "compact" : "standard",
    }).format(value);
  };

  // Calculate changes (mock for now - would need historical data)
  const pipelineChange = "+12.5%";
  const appsChange = stats
    ? `+${Math.max(0, stats.activeApplications - Math.floor(stats.activeApplications * 0.9))}`
    : "+4";
  const timeChange = stats?.avgClosingDays
    ? `-${Math.max(1, Math.floor(stats.avgClosingDays * 0.1))} Days`
    : "-2 Days";
  const rateChange = "+2.1%";

  const filteredLoans = React.useMemo(() => {
    const all = loans || [];
    if (!dashboardSearch.trim()) return all;
    const q = dashboardSearch.toLowerCase();
    return all.filter(
      (loan) =>
        `${loan.client_first_name ?? ""} ${loan.client_last_name ?? ""}`
          .toLowerCase()
          .includes(q) ||
        `${loan.broker_first_name ?? ""} ${loan.broker_last_name ?? ""}`
          .toLowerCase()
          .includes(q) ||
        (loan.loan_type ?? "").toLowerCase().includes(q) ||
        (loan.status ?? "").toLowerCase().includes(q) ||
        (loan.application_number ?? "").toLowerCase().includes(q),
    );
  }, [loans, dashboardSearch]);

  const {
    sorted: sortedLoans,
    sortKey: loanSortKey,
    sortDir: loanSortDir,
    requestSort: sortLoans,
  } = useSortableData(filteredLoans, "client_first_name");

  return (
    <>
      <MetaHelmet
        {...adminPageMeta("Dashboard", "Overview of your operations")}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Overview"
          description="Manage your operations efficiently."
          className="mb-6 sm:mb-8"
          actions={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:max-w-xs md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search loans..."
                  className="pl-9"
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                />
              </div>
              {isPartner ? (
                <Button
                  className="gap-2 whitespace-nowrap"
                  onClick={() => setShareLinkOpen(true)}
                >
                  <Link2 className="h-4 w-4" />{" "}
                  <span className="hidden sm:inline">Get My Link</span>
                  <span className="sm:hidden">My Link</span>
                </Button>
              ) : (
                <Button
                  className="gap-2 whitespace-nowrap"
                  onClick={() => setWizardOpen(true)}
                >
                  <Plus className="h-4 w-4" />{" "}
                  <span className="hidden sm:inline">New Loan</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
            </div>
          }
        />

        <NewLoanWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onSuccess={handleLoanCreated}
        />
        <BrokerShareLinkModal
          open={shareLinkOpen}
          onOpenChange={setShareLinkOpen}
          broker={partnerAsBroker}
          useSelfEndpoint
        />

        <LoanOverlay
          isOpen={loanOverlayOpen}
          onClose={handleCloseLoan}
          selectedLoan={selectedLoan}
          isLoadingDetails={isLoadingDetails}
        />

        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Error Display */}
          {(statsError || loansError) && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">
                    Error loading dashboard data: {statsError || loansError}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Total Pipeline",
                value:
                  statsLoading || !stats
                    ? "Loading..."
                    : formatCurrency(stats.totalPipelineValue),
                change: pipelineChange,
                trend: "up",
                icon: <TrendingUp className="text-primary" />,
              },
              {
                title: "Active Applications",
                value:
                  statsLoading || !stats
                    ? "..."
                    : stats.activeApplications.toString(),
                change: appsChange,
                trend: "up",
                icon: <Users className="text-primary" />,
              },
              {
                title: "Avg. Closing Time",
                value:
                  statsLoading || !stats
                    ? "..."
                    : `${stats.avgClosingDays} Days`,
                change: timeChange,
                trend: "up",
                icon: <Clock className="text-amber-500" />,
              },
              {
                title: "Closure Rate",
                value: statsLoading || !stats ? "..." : `${stats.closureRate}%`,
                change: rateChange,
                trend: "up",
                icon: <CheckCircle2 className="text-primary" />,
              },
            ].map((stat, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">
                    {stat.title}
                  </CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 flex-wrap">
                    <span
                      className={
                        stat.trend === "up"
                          ? "text-primary"
                          : "text-destructive"
                      }
                    >
                      {stat.change}
                    </span>
                    from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Application Volume
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Daily new applications vs closed loans.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted))"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="apps"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      name="Applications"
                    />
                    <Bar
                      dataKey="closed"
                      fill="hsl(var(--secondary))"
                      radius={[4, 4, 0, 0]}
                      name="Closed"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Revenue Forecast
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Projected commission for the next 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorApps"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted))"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="apps"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorApps)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Broker Monthly Metrics */}
          <BrokerMetricsPanel isPartner={isPartner} />

          {/* Recent Pipeline Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Pipeline</CardTitle>
                <CardDescription>
                  Recent loan applications and their current status.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate("/admin/pipeline")}
                >
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                {isPartner ? (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShareLinkOpen(true)}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Get My Link
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setWizardOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Loan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : filteredLoans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {dashboardSearch
                      ? `No loans match "${dashboardSearch}".`
                      : "No active loans yet. Create your first loan application!"}
                  </div>
                ) : (
                  <>
                    {/* Mobile card view */}
                    <div className="block lg:hidden space-y-3">
                      {sortedLoans.map((loan) => (
                        <div
                          key={loan.id}
                          className="rounded-lg border p-4 bg-white space-y-2 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm">
                                {loan.client_first_name} {loan.client_last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {loan.application_number}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "text-white text-xs whitespace-nowrap",
                                getStatusColor(loan.status || "app_sent"),
                              )}
                            >
                              {loan.status
                                ? formatLoanType(loan.status)
                                : "App Sent"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {loan.broker_first_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {loan.broker_first_name} {loan.broker_last_name}
                              </span>
                            )}
                            <span className="font-semibold text-foreground">
                              $
                              {new Intl.NumberFormat("en-US").format(
                                loan.loan_amount || 0,
                              )}
                            </span>
                            {loan.loan_type && (
                              <span>{formatLoanType(loan.loan_type)}</span>
                            )}
                          </div>
                          {loan.next_task && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 flex-shrink-0" />
                              {loan.next_task}
                            </p>
                          )}
                          <div className="flex justify-end pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleOpenLoan(loan.id)}
                            >
                              <Eye className="h-3 w-3" /> View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table view */}
                    <table className="hidden lg:table w-full caption-bottom text-sm min-w-[640px]">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => sortLoans("client_first_name")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Client{" "}
                              {loanSortKey === "client_first_name" ? (
                                loanSortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                          <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => sortLoans("broker_first_name")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Broker{" "}
                              {loanSortKey === "broker_first_name" ? (
                                loanSortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                          <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => sortLoans("loan_type")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Loan Type{" "}
                              {loanSortKey === "loan_type" ? (
                                loanSortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                          <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => sortLoans("loan_amount")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Amount{" "}
                              {loanSortKey === "loan_amount" ? (
                                loanSortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                          <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => sortLoans("status")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Status{" "}
                              {loanSortKey === "status" ? (
                                loanSortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                          <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                            Next Task
                          </th>
                          <th className="h-12 px-2 sm:px-4 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {sortedLoans.map((loan) => (
                          <tr
                            key={loan.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="p-2 sm:p-4 align-middle font-medium whitespace-nowrap">
                              {loan.client_first_name || ""}{" "}
                              {loan.client_last_name || ""}
                            </td>
                            <td className="p-2 sm:p-4 align-middle whitespace-nowrap">
                              {loan.broker_first_name ? (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {loan.broker_first_name}{" "}
                                  {loan.broker_last_name || ""}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="p-2 sm:p-4 align-middle whitespace-nowrap">
                              {loan.loan_type
                                ? formatLoanType(loan.loan_type)
                                : "N/A"}
                            </td>
                            <td className="p-2 sm:p-4 align-middle font-semibold whitespace-nowrap">
                              $
                              {new Intl.NumberFormat("en-US").format(
                                loan.loan_amount || 0,
                              )}
                            </td>
                            <td className="p-2 sm:p-4 align-middle">
                              <Badge
                                className={cn(
                                  "text-white whitespace-nowrap text-xs",
                                  getStatusColor(loan.status || "app_sent"),
                                )}
                              >
                                {loan.status
                                  ? formatLoanType(loan.status)
                                  : "App Sent"}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-4 align-middle">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                {loan.next_task ? (
                                  <>
                                    <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs whitespace-nowrap">
                                      {loan.next_task}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    No pending tasks
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 sm:p-4 align-middle text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => handleOpenLoan(loan.id)}
                                  >
                                    <Eye className="h-4 w-4" /> Open Loan
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => navigate(`/admin/pipeline`)}
                                  >
                                    <ArrowRight className="h-4 w-4" /> Go to
                                    Pipeline
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => navigate("/admin/documents")}
                                  >
                                    <FileText className="h-4 w-4" /> View Docs
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
