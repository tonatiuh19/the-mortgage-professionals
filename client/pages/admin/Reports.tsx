import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  History,
  DollarSign,
  Users,
  FileText,
  TrendingDown,
  Activity,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchReportOverview,
  fetchRevenueReport,
  fetchPerformanceReport,
  exportReport,
  setDateRange,
} from "@/store/slices/reportsSlice";
import {
  fetchAuditLogs,
  fetchAuditLogStats,
} from "@/store/slices/auditLogsSlice";
import { format, subDays, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const Reports = () => {
  const dispatch = useAppDispatch();
  const { overview, revenue, performance, isLoading } = useAppSelector(
    (state) => state.reports,
  );
  const { logs, stats: auditStats } = useAppSelector(
    (state) => state.auditLogs,
  );
  const [datePreset, setDatePreset] = useState("30days");
  const [exportFormat, setExportFormat] = useState("csv");
  const [selectedReport, setSelectedReport] = useState("overview");

  useEffect(() => {
    loadReports();
  }, [datePreset, dispatch]);

  const loadReports = () => {
    const dateRange = getDateRange(datePreset);
    dispatch(setDateRange(dateRange));
    dispatch(fetchReportOverview(dateRange));
    dispatch(fetchRevenueReport({ ...dateRange, group_by: "month" }));
    dispatch(fetchPerformanceReport(dateRange));
    dispatch(fetchAuditLogs({}));
    dispatch(fetchAuditLogStats());
  };

  const getDateRange = (preset: string) => {
    const today = new Date();
    let fromDate: Date;

    switch (preset) {
      case "7days":
        fromDate = subDays(today, 7);
        break;
      case "30days":
        fromDate = subDays(today, 30);
        break;
      case "3months":
        fromDate = subMonths(today, 3);
        break;
      case "6months":
        fromDate = subMonths(today, 6);
        break;
      case "1year":
        fromDate = subMonths(today, 12);
        break;
      default:
        fromDate = subDays(today, 30);
    }

    return {
      from_date: format(fromDate, "yyyy-MM-dd"),
      to_date: format(today, "yyyy-MM-dd"),
    };
  };

  const handleExport = async () => {
    try {
      const dateRange = getDateRange(datePreset);
      await dispatch(
        exportReport({
          report_type: selectedReport,
          format: exportFormat,
          ...dateRange,
        }),
      ).unwrap();
      toast({
        title: "Export Started",
        description:
          "Your report is being generated and will download shortly.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error || "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatPercent = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Reports & Analytics",
          "Advanced reporting and analytics dashboard",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-emerald-500" />
              Reports & Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive analytics and business intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading reports...
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="overview"
                onClick={() => setSelectedReport("overview")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="revenue"
                onClick={() => setSelectedReport("revenue")}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                onClick={() => setSelectedReport("performance")}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                onClick={() => setSelectedReport("audit")}
              >
                <History className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics Cards */}
              {overview ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Total Loans
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {overview.loans.total_loans}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(overview.loans.total_loan_volume)}{" "}
                          volume
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Total Clients
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {overview.clients.total_clients}
                        </div>
                        <p className="text-xs text-emerald-500 mt-1">
                          {overview.clients.active_clients} active
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Task Completion
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {overview.tasks.completed_tasks}/
                          {overview.tasks.total_tasks}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatPercent(
                            (overview.tasks.completed_tasks /
                              overview.tasks.total_tasks) *
                              100,
                          )}{" "}
                          complete
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Avg Loan Amount
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(overview.loans.avg_loan_amount)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Per application
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Loan Status Distribution */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Loan Status Distribution</CardTitle>
                        <CardDescription>
                          Current status of all loans
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsPieChart>
                            <Pie
                              data={[
                                {
                                  name: "Approved",
                                  value: overview.loans.approved_loans,
                                },
                                {
                                  name: "Pending",
                                  value: overview.loans.pending_loans,
                                },
                                {
                                  name: "In Review",
                                  value: overview.loans.in_review_loans,
                                },
                                {
                                  name: "Rejected",
                                  value: overview.loans.rejected_loans,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${entry.value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {COLORS.map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Loans by Type</CardTitle>
                        <CardDescription>
                          Distribution of loan types
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsBarChart data={overview.loansByType}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="loan_type" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#10b981" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Overview Data</p>
                      <p className="text-sm mt-2">
                        Unable to load overview statistics.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* REVENUE TAB */}
            <TabsContent value="revenue" className="space-y-6">
              {revenue && revenue.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>
                      Loan volume and count over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <RechartsLineChart data={revenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="total_amount"
                          stroke="#10b981"
                          name="Total Amount"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="loan_count"
                          stroke="#3b82f6"
                          name="Loan Count"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Revenue Data</p>
                      <p className="text-sm mt-2">
                        No loan data available for the selected period.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* PERFORMANCE TAB */}
            <TabsContent value="performance" className="space-y-6">
              {performance ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Approval Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-500">
                        {formatPercent(
                          performance.conversionRate.approval_rate,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {performance.conversionRate.approved} of{" "}
                        {performance.conversionRate.total_applications}{" "}
                        applications
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Task Completion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-500">
                        {formatPercent(
                          performance.taskCompletion.completion_rate,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Avg{" "}
                        {performance.taskCompletion.avg_completion_days?.toFixed(
                          1,
                        )}{" "}
                        days to complete
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {performance.taskCompletion.total_tasks}
                      </div>
                      <p className="text-xs text-emerald-500 mt-2">
                        {performance.taskCompletion.completed} completed
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Performance Data</p>
                      <p className="text-sm mt-2">
                        Unable to load performance metrics.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AUDIT LOGS TAB */}
            <TabsContent value="audit" className="space-y-6">
              {auditStats && (
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Logs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {auditStats.total}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Success
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-500">
                        {auditStats.byStatus.find((s) => s.status === "success")
                          ?.count || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Failures
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-500">
                        {auditStats.byStatus.find((s) => s.status === "failure")
                          ?.count || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-500">
                        {auditStats.byStatus.find((s) => s.status === "warning")
                          ?.count || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest system activities and user actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {logs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                log.status === "success"
                                  ? "default"
                                  : log.status === "failure"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                            <span className="font-medium text-sm">
                              {log.action}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{log.actor_name}</span>
                            <span>•</span>
                            <span>
                              {format(
                                new Date(log.created_at),
                                "MMM dd, yyyy HH:mm",
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
};

export default Reports;
