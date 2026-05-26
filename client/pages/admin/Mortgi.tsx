import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings2,
  History,
  Shield,
  Bot,
  Save,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Wrench,
  MessageSquare,
  Zap,
  Info,
} from "lucide-react";
import { LiaRobotSolid } from "react-icons/lia";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMortgiConfig,
  updateMortgiConfig,
  fetchMortgiHistory,
  fetchMortgiUsage,
  deleteMortgiSession,
  openChat,
} from "@/store/slices/mortgiSlice";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const BROKER_TOOLS = [
  {
    id: "get_pipeline_summary",
    label: "Pipeline Summary",
    description: "Loan count grouped by status",
  },
  {
    id: "get_overdue_tasks",
    label: "Overdue Tasks",
    description: "Tasks past their due date",
  },
  {
    id: "get_client_list",
    label: "Client List",
    description: "Recent clients with loan status",
  },
  {
    id: "get_monthly_metrics",
    label: "Monthly Metrics",
    description: "Applications, closings, and funded loans",
  },
  {
    id: "get_recent_leads",
    label: "Recent Leads",
    description: "Latest leads with source and status",
  },
  {
    id: "get_communication_activity",
    label: "Communication Activity",
    description: "SMS/email sent in last 7 days",
  },
  {
    id: "get_realtor_prospects",
    label: "Realtor Prospects",
    description: "Realtor pipeline by stage",
  },
];

const CLIENT_TOOLS = [
  {
    id: "get_my_loan_status",
    label: "Loan Status",
    description: "Client's own loan application details",
  },
  {
    id: "get_my_pending_tasks",
    label: "Pending Tasks",
    description: "Outstanding tasks for the client",
  },
  {
    id: "get_my_documents",
    label: "My Documents",
    description: "Uploaded document status",
  },
  {
    id: "get_my_next_meeting",
    label: "Next Meeting",
    description: "Upcoming scheduled meeting",
  },
  {
    id: "get_pre_approval_info",
    label: "Pre-Approval Info",
    description: "Pre-approval letter details",
  },
];

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: "easeOut" as const },
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────

const MortgiPage = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const {
    config,
    isLoadingConfig,
    isSavingConfig,
    history,
    historyTotal,
    isLoadingHistory,
    usage,
    isLoadingUsage,
    quotaExceeded,
    quotaExceededAt,
  } = useAppSelector((s) => s.mortgi);
  const { user } = useAppSelector((s) => s.brokerAuth);
  const isAdmin = user?.role === "admin";

  // Local form state (mirrors config)
  const [form, setForm] = useState({
    mortgi_enabled: true,
    mortgi_client_enabled: true,
    mortgi_broker_enabled: true,
    mortgi_system_prompt: "",
    mortgi_daily_message_limit: 50,
    mortgi_broker_tools: BROKER_TOOLS.map((t) => t.id),
    mortgi_client_tools: CLIENT_TOOLS.map((t) => t.id),
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Load config on mount
  useEffect(() => {
    dispatch(fetchMortgiConfig());
    dispatch(fetchMortgiHistory());
    dispatch(fetchMortgiUsage());
  }, [dispatch]);

  // Sync config to local form
  useEffect(() => {
    if (config) {
      setForm({
        mortgi_enabled: config.mortgi_enabled,
        mortgi_client_enabled: config.mortgi_client_enabled,
        mortgi_broker_enabled: config.mortgi_broker_enabled,
        mortgi_system_prompt: config.mortgi_system_prompt,
        mortgi_daily_message_limit: config.mortgi_daily_message_limit,
        mortgi_broker_tools: config.mortgi_broker_tools,
        mortgi_client_tools: config.mortgi_client_tools,
      });
      setIsDirty(false);
    }
  }, [config]);

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaved(false);
  };

  const toggleTool = (arr: string[], toolId: string): string[] =>
    arr.includes(toolId) ? arr.filter((t) => t !== toolId) : [...arr, toolId];

  const handleSave = async () => {
    const result = await dispatch(updateMortgiConfig(form));
    if (updateMortgiConfig.fulfilled.match(result)) {
      setSaved(true);
      setIsDirty(false);
      await dispatch(fetchMortgiConfig());
      toast({
        title: "Mortgi configuration saved",
        description: "Changes are live immediately.",
      });
    } else {
      toast({
        title: "Failed to save",
        description: String(result.payload),
        variant: "destructive",
      });
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteId) return;
    const result = await dispatch(deleteMortgiSession(deleteId));
    setDeleteId(null);
    if (deleteMortgiSession.fulfilled.match(result)) {
      toast({ title: "Session deleted" });
    }
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta("Mortgi AI", "Manage the Mortgi AI assistant")}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Mortgi"
          description="AI Assistant Management"
          icon={<LiaRobotSolid className="h-7 w-7 text-primary" />}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => dispatch(openChat())}
              >
                <LiaRobotSolid className="h-4 w-4" />
                Try Mortgi
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty || isSavingConfig}
                  className={cn(
                    "gap-2 transition-all",
                    saved
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground",
                  )}
                >
                  {isSavingConfig ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saved ? "Saved" : "Save Changes"}
                </Button>
              )}
            </div>
          }
        />

        <div className="space-y-6">
          <Tabs defaultValue="config" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="config" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-2">
                <Wrench className="h-4 w-4" />
                Tools & Permissions
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Chat History
                {historyTotal > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                    {historyTotal}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Configuration Tab ─────────────────────────────────── */}
            <TabsContent value="config" className="space-y-4">
              {/* Quota exceeded banner */}
              {quotaExceeded && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-4"
                >
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive">
                      AI Quota Exhausted — Mortgi Auto-Disabled
                    </p>
                    <p className="text-xs text-destructive/80 mt-0.5">
                      The Groq API daily quota was reached
                      {quotaExceededAt
                        ? ` on ${format(new Date(quotaExceededAt), "MMM d 'at' h:mm a")}`
                        : ""}
                      . Mortgi has been automatically disabled to prevent
                      errors. Contact your system developer to upgrade the Groq
                      plan or wait for the quota to reset (resets daily). Once
                      resolved, re-enable Mortgi below — the flag will clear
                      automatically.
                    </p>
                  </div>
                </motion.div>
              )}
              {!isAdmin && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                  <Shield className="h-4 w-4 shrink-0" />
                  Only admins can modify Mortgi settings. You can preview the
                  current configuration.
                </div>
              )}

              {/* Global switch */}
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60 overflow-hidden">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-5 border-b bg-rose-50/60 dark:bg-rose-950/20 border-b border-border/40">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <Zap className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Master Switch</CardTitle>
                      <CardDescription>
                        Enable or disable Mortgi entirely
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-5 space-y-4">
                    <ToggleRow
                      label="Mortgi Enabled"
                      hint="Global on/off switch. Disabling this overrides all other settings."
                      checked={form.mortgi_enabled}
                      onCheckedChange={(v) => update("mortgi_enabled", v)}
                      disabled={!isAdmin}
                      accent="violet"
                    />
                    <ToggleRow
                      label="Mortgage Banker Portal"
                      hint="Show Mortgi widget to Mortgage Bankers and Partners"
                      checked={form.mortgi_broker_enabled}
                      onCheckedChange={(v) =>
                        update("mortgi_broker_enabled", v)
                      }
                      disabled={!isAdmin || !form.mortgi_enabled}
                      accent="indigo"
                    />
                    <ToggleRow
                      label="Client Portal"
                      hint="Show Mortgi widget to clients in their self-service portal"
                      checked={form.mortgi_client_enabled}
                      onCheckedChange={(v) =>
                        update("mortgi_client_enabled", v)
                      }
                      disabled={!isAdmin || !form.mortgi_enabled}
                      accent="purple"
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Rate limits */}
              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-5 border-b">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <Shield className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Rate Limits</CardTitle>
                      <CardDescription>
                        Control how many messages users can send per day
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-5">
                    <div className="space-y-1.5 max-w-xs">
                      <Label className="text-sm font-medium">
                        Daily message limit per user
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={form.mortgi_daily_message_limit}
                        onChange={(e) =>
                          update(
                            "mortgi_daily_message_limit",
                            parseInt(e.target.value, 10) || 50,
                          )
                        }
                        className="h-9 w-32"
                        disabled={!isAdmin}
                      />
                      <p className="text-xs text-muted-foreground">
                        Groq free tier: 6,000 requests/day. Set per-user limits
                        to protect your quota.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Custom system prompt */}
              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-5 border-b">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <MessageSquare className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Custom System Prompt
                      </CardTitle>
                      <CardDescription>
                        Override the default personality. Leave empty to use the
                        built-in prompt.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-5">
                    <Textarea
                      value={form.mortgi_system_prompt}
                      onChange={(e) =>
                        update("mortgi_system_prompt", e.target.value)
                      }
                      placeholder={`You are Mortgi, a helpful AI assistant for mortgage professionals at [Your Company]. Be concise, professional, and data-driven...`}
                      className="min-h-[120px] text-sm font-mono"
                      maxLength={2000}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {form.mortgi_system_prompt.length}/2000 characters
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Usage & Credits */}
              <motion.div
                custom={3}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-5 border-b">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <Zap className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Usage & Credits
                      </CardTitle>
                      <CardDescription>
                        Token consumption tracked from all sessions
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch(fetchMortgiUsage())}
                      disabled={isLoadingUsage}
                      className="gap-2"
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isLoadingUsage && "animate-spin",
                        )}
                      />
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent className="px-6 py-5">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        {
                          label: "Tokens today",
                          value: isLoadingUsage
                            ? "…"
                            : (usage?.tokens_today ?? 0).toLocaleString(),
                          sub: "of ~500K free/day",
                        },
                        {
                          label: "Sessions today",
                          value: isLoadingUsage
                            ? "…"
                            : (usage?.sessions_today ?? 0).toLocaleString(),
                          sub: "active today",
                        },
                        {
                          label: "Total tokens",
                          value: isLoadingUsage
                            ? "…"
                            : (usage?.tokens_total ?? 0).toLocaleString(),
                          sub: "all time",
                        },
                        {
                          label: "Total sessions",
                          value: isLoadingUsage
                            ? "…"
                            : (usage?.sessions_total ?? 0).toLocaleString(),
                          sub: "all time",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
                        >
                          <p className="text-xs text-muted-foreground">
                            {stat.label}
                          </p>
                          <p className="text-xl font-semibold tabular-nums mt-0.5">
                            {stat.value}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {stat.sub}
                          </p>
                        </div>
                      ))}
                    </div>
                    {quotaExceeded && (
                      <p className="text-xs text-destructive mt-3 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Quota exceeded — contact your developer to upgrade or
                        reset the Groq plan.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ── Tools Tab ─────────────────────────────────────────── */}
            <TabsContent value="tools" className="space-y-4">
              {/* Broker tools */}
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-5 border-b bg-muted/40 border-b border-border/40">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <Users className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Mortgage Banker & Partner Tools
                      </CardTitle>
                      <CardDescription>
                        Data Mortgi can access on behalf of Mortgage Bankers and
                        Partners
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-4 divide-y divide-border/40">
                    {BROKER_TOOLS.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between py-3 gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium">{tool.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                        <Switch
                          checked={form.mortgi_broker_tools.includes(tool.id)}
                          onCheckedChange={() =>
                            update(
                              "mortgi_broker_tools",
                              toggleTool(form.mortgi_broker_tools, tool.id),
                            )
                          }
                          disabled={!isAdmin}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Client tools */}
              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-5 border-b bg-muted/40 border-b border-border/40">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <User className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Client Tools</CardTitle>
                      <CardDescription>
                        Data Mortgi can access on behalf of clients — strictly
                        scoped to their own records
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-4 divide-y divide-border/40">
                    {CLIENT_TOOLS.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between py-3 gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium">{tool.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                        <Switch
                          checked={form.mortgi_client_tools.includes(tool.id)}
                          onCheckedChange={() =>
                            update(
                              "mortgi_client_tools",
                              toggleTool(form.mortgi_client_tools, tool.id),
                            )
                          }
                          disabled={!isAdmin}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Security note */}
              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-4 py-3">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      All queries are read-only
                    </span>{" "}
                    and scoped by tenant ID. Client tools are additionally
                    scoped by client ID — clients can only see their own data.
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ── History Tab ───────────────────────────────────────── */}
            <TabsContent value="history" className="space-y-4">
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={FADE_UP}
              >
                <Card className="border border-border/60">
                  <CardHeader className="px-6 py-5 border-b flex flex-row items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
                      <History className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Recent Sessions
                      </CardTitle>
                      <CardDescription>
                        {historyTotal} total session
                        {historyTotal !== 1 ? "s" : ""} across all users
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch(fetchMortgiHistory())}
                      disabled={isLoadingHistory}
                      className="gap-2"
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isLoadingHistory && "animate-spin",
                        )}
                      />
                      Refresh
                    </Button>
                  </CardHeader>

                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading history…</span>
                      </div>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No chat sessions yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">
                              Messages
                            </TableHead>
                            <TableHead className="text-right">Tokens</TableHead>
                            <TableHead>Last Active</TableHead>
                            {isAdmin && (
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((session) => (
                            <TableRow
                              key={session.id}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="font-medium text-sm">
                                {session.user_name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    session.user_type === "broker"
                                      ? "border-rose-300 text-rose-700 dark:text-rose-300"
                                      : "border-border text-muted-foreground",
                                  )}
                                >
                                  {session.user_type === "broker"
                                    ? "Mortgage Banker"
                                    : "Client"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {session.messages_count}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                                {session.tokens_used.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(
                                  new Date(session.updated_at),
                                  "MMM d, h:mm a",
                                )}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteId(session.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat history for this session.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDeleteSession}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Helper sub-component ─────────────────────────────────────────────────────

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  accent,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  accent?: "violet" | "indigo" | "purple";
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-border/50 bg-background hover:bg-muted/20 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export default MortgiPage;
