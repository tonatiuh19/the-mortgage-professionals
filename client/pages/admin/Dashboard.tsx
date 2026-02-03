import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  FileText,
  AlertCircle,
  TrendingUp,
  Users,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import NewLoanWizard from "@/components/NewLoanWizard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLoans } from "@/store/slices/pipelineSlice";
import { fetchDashboardStats } from "@/store/slices/dashboardSlice";

const AdminDashboard = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { loans, isLoading: loading } = useAppSelector(
    (state) => state.pipeline,
  );
  const { stats, isLoading: statsLoading } = useAppSelector(
    (state) => state.dashboard,
  );

  useEffect(() => {
    dispatch(fetchLoans());
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const handleLoanCreated = () => {
    dispatch(fetchLoans());
    dispatch(fetchDashboardStats());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "underwriting":
      case "under_review":
        return "bg-blue-500";
      case "documents_pending":
        return "bg-amber-500";
      case "conditional_approval":
      case "approved":
        return "bg-emerald-500";
      case "denied":
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-blue-500";
    }
  };

  const formatLoanType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Prepare chart data from weekly activity
  const chartData =
    stats?.weeklyActivity.map((day) => ({
      name: new Date(day.date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      apps: day.applications,
      closed: day.closed,
    })) || [];

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

  return (
    <>
      <MetaHelmet
        {...adminPageMeta("Dashboard", "Overview of your brokerage operations")}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 sm:mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Overview
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your brokerage operations efficiently.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search everything..." className="pl-9" />
            </div>
            <Button
              className="gap-2 whitespace-nowrap"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">New Loan</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </header>

        <NewLoanWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onSuccess={handleLoanCreated}
        />

        <div className="space-y-8 animate-in fade-in duration-500">
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
                icon: <TrendingUp className="text-emerald-500" />,
              },
              {
                title: "Active Applications",
                value:
                  statsLoading || !stats
                    ? "..."
                    : stats.activeApplications.toString(),
                change: appsChange,
                trend: "up",
                icon: <Users className="text-blue-500" />,
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
                icon: <CheckCircle2 className="text-emerald-500" />,
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
                          ? "text-emerald-500"
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

          {/* Recent Pipeline Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Pipeline</CardTitle>
                <CardDescription>
                  Recent loan applications and their current status.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : loans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active loans yet. Create your first loan application!
                  </div>
                ) : (
                  <table className="w-full caption-bottom text-sm min-w-[640px]">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                          Client
                        </th>
                        <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                          Broker
                        </th>
                        <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                          Loan Type
                        </th>
                        <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                          Amount
                        </th>
                        <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                          Status
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
                      {loans.map((loan) => (
                        <tr
                          key={loan.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-4 align-middle font-medium whitespace-nowrap">
                            {loan.client_first_name} {loan.client_last_name}
                          </td>
                          <td className="p-2 sm:p-4 align-middle whitespace-nowrap">
                            {loan.broker_first_name ? (
                              <Badge variant="outline" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                {loan.broker_first_name} {loan.broker_last_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="p-2 sm:p-4 align-middle whitespace-nowrap">
                            {formatLoanType(loan.loan_type)}
                          </td>
                          <td className="p-2 sm:p-4 align-middle font-semibold whitespace-nowrap">
                            $
                            {new Intl.NumberFormat("en-US").format(
                              loan.loan_amount,
                            )}
                          </td>
                          <td className="p-2 sm:p-4 align-middle">
                            <Badge
                              className={cn(
                                "text-white whitespace-nowrap text-xs",
                                getStatusColor(loan.status),
                              )}
                            >
                              {formatLoanType(loan.status)}
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
                                <DropdownMenuItem className="gap-2">
                                  <Mail className="h-4 w-4" /> Message
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <FileText className="h-4 w-4" /> View Docs
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive">
                                  <AlertCircle className="h-4 w-4" /> Flag Issue
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
