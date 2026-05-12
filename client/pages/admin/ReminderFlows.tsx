import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GitBranch,
  Plus,
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Zap,
  CheckCheck,
  Trash2,
  Play,
  Pause,
  ChevronRight,
  Save,
  ArrowLeft,
  Settings2,
  Activity,
  LayoutList,
  Copy,
  AlarmClock,
  Workflow,
  HelpCircle,
  MousePointer2,
  Link2,
  Lightbulb,
  X,
  MoveRight,
  Monitor,
  Users,
  ChevronDown,
  CalendarClock,
  Hourglass,
  Split,
} from "lucide-react";
import { FaSms, FaWhatsapp } from "react-icons/fa";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { DataGrid } from "@/components/ui/data-grid";
import type { DataGridColumn } from "@/components/ui/data-grid";
import type { ReminderFlowExecution } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchReminderFlows,
  fetchReminderFlow,
  createReminderFlow,
  saveReminderFlow,
  deleteReminderFlow,
  toggleReminderFlow,
  fetchReminderFlowExecutions,
  fetchReminderFlowTrace,
  clearSelectedFlow,
} from "@/store/slices/reminderFlowsSlice";
import type {
  ReminderFlow,
  ReminderStepType,
  ReminderFlowStepConfig,
  ReminderTriggerEvent,
  SaveReminderFlowStep,
  SaveReminderFlowConnection,
} from "@shared/api";

// ─────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────

type FlowCategory = "loan" | "realtor_prospecting";

const LOAN_TRIGGER_EVENT_OPTIONS: {
  value: ReminderTriggerEvent;
  label: string;
}[] = [
  // Pipeline stage events (in pipeline order)
  { value: "app_sent", label: "Application Sent" },
  { value: "application_received", label: "Application Received" },
  { value: "prequalified", label: "Prequalified" },
  { value: "preapproved", label: "Preapproved" },
  { value: "under_contract_loan_setup", label: "Under Contract / Loan Setup" },
  { value: "submitted_to_underwriting", label: "Submitted to Underwriting" },
  { value: "approved_with_conditions", label: "Approved with Conditions" },
  { value: "clear_to_close", label: "Clear to Close" },
  { value: "docs_out", label: "Documents Out" },
  { value: "loan_funded", label: "Loan Funded" },
  // Activity / task events
  { value: "task_pending", label: "Task Pending" },
  { value: "task_in_progress", label: "Task In Progress" },
  { value: "task_overdue", label: "Task Overdue" },
  { value: "no_activity", label: "No Activity" },
  { value: "manual", label: "Manual Trigger" },
];

const REALTOR_TRIGGER_EVENT_OPTIONS: {
  value: ReminderTriggerEvent;
  label: string;
}[] = [
  { value: "prospect_contact_attempted", label: "Contact Attempted" },
  { value: "prospect_contacted", label: "Contacted" },
  { value: "prospect_appt_set", label: "Appointment Set" },
  { value: "prospect_waiting_for_1st_deal", label: "Waiting for 1st Deal" },
  { value: "prospect_first_deal_funded", label: "First Deal Funded" },
  { value: "prospect_second_deal_funded", label: "2nd Deal Funded" },
  { value: "prospect_top_agent_whale", label: "Top Agent (Whale)" },
  { value: "no_activity", label: "No Activity" },
  { value: "manual", label: "Manual Trigger" },
];

// Combined for label lookup
const TRIGGER_EVENT_OPTIONS = [
  ...LOAN_TRIGGER_EVENT_OPTIONS,
  ...REALTOR_TRIGGER_EVENT_OPTIONS,
];

const triggerLabel = (event: ReminderTriggerEvent) =>
  TRIGGER_EVENT_OPTIONS.find((o) => o.value === event)?.label ?? event;

interface StepMeta {
  type: ReminderStepType;
  label: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
}

const STEP_TYPES: StepMeta[] = [
  {
    type: "trigger",
    label: "Trigger",
    icon: <Zap className="h-4 w-4" />,
    color: "text-emerald-600",
    borderColor: "border-emerald-400",
    bgColor: "bg-emerald-50",
    description: "Flow starting point",
  },
  {
    type: "wait",
    label: "Wait",
    icon: <Clock className="h-4 w-4" />,
    color: "text-sky-600",
    borderColor: "border-sky-400",
    bgColor: "bg-sky-50",
    description: "Delay before next step",
  },
  {
    type: "send_notification",
    label: "Notification",
    icon: <Bell className="h-4 w-4" />,
    color: "text-orange-600",
    borderColor: "border-orange-400",
    bgColor: "bg-orange-50",
    description: "In-app notification",
  },
  {
    type: "send_email",
    label: "Send Email",
    icon: <Mail className="h-4 w-4" />,
    color: "text-violet-600",
    borderColor: "border-violet-400",
    bgColor: "bg-violet-50",
    description: "Email to client",
  },
  {
    type: "send_sms",
    label: "Send SMS",
    icon: <FaSms className="h-4 w-4" />,
    color: "text-teal-600",
    borderColor: "border-teal-400",
    bgColor: "bg-teal-50",
    description: "SMS to client",
  },
  {
    type: "send_whatsapp",
    label: "Send WhatsApp",
    icon: <FaWhatsapp className="h-4 w-4" />,
    color: "text-green-600",
    borderColor: "border-green-400",
    bgColor: "bg-green-50",
    description: "WhatsApp message",
  },
  {
    type: "condition",
    label: "Condition",
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-amber-600",
    borderColor: "border-amber-400",
    bgColor: "bg-amber-50",
    description: "Conditional branch",
  },
  {
    type: "branch",
    label: "Branch",
    icon: <Split className="h-4 w-4" />,
    color: "text-fuchsia-600",
    borderColor: "border-fuchsia-400",
    bgColor: "bg-fuchsia-50",
    description: "Multi-way branch (loan_type)",
  },
  {
    type: "wait_for_response",
    label: "Wait for Response",
    icon: <Hourglass className="h-4 w-4" />,
    color: "text-indigo-600",
    borderColor: "border-indigo-400",
    bgColor: "bg-indigo-50",
    description: "Pause until client replies / timeout",
  },
  {
    type: "wait_until_date",
    label: "Wait Until Date",
    icon: <CalendarClock className="h-4 w-4" />,
    color: "text-rose-600",
    borderColor: "border-rose-400",
    bgColor: "bg-rose-50",
    description: "Pause until a stored date",
  },
  {
    type: "end",
    label: "End",
    icon: <CheckCheck className="h-4 w-4" />,
    color: "text-gray-500",
    borderColor: "border-gray-400",
    bgColor: "bg-gray-50",
    description: "End of flow",
  },
];

const getStepMeta = (type: ReminderStepType): StepMeta =>
  STEP_TYPES.find((s) => s.type === type) ?? STEP_TYPES[0];

const uniqueKey = () =>
  `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─────────────────────────────────────────────────────────────────
// Custom React Flow Node Component
// ─────────────────────────────────────────────────────────────────

function FlowNode({ data, selected }: { data: any; selected: boolean }) {
  const meta = getStepMeta(data.step_type as ReminderStepType);
  const isTrigger = data.step_type === "trigger";
  const isEnd = data.step_type === "end";
  const isCondition = data.step_type === "condition";
  const isBranch = data.step_type === "branch";
  const isWaitForResponse = data.step_type === "wait_for_response";

  return (
    <div
      className={cn(
        "rounded-xl border-2 shadow-sm min-w-[160px] max-w-[220px] transition-all duration-150",
        meta.bgColor,
        meta.borderColor,
        selected && "ring-2 ring-primary ring-offset-2 shadow-md scale-[1.02]",
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-white !border-2 !border-gray-400"
        />
      )}

      <div className="px-3 py-2.5">
        <div
          className={cn(
            "flex items-center gap-2 font-semibold text-sm",
            meta.color,
          )}
        >
          {meta.icon}
          <span className="truncate">{data.label}</span>
        </div>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {data.description}
          </p>
        )}
        {data.config?.delay_days != null && (
          <Badge variant="secondary" className="mt-1 text-xs">
            Wait {data.config.delay_days}d
            {data.config.delay_hours ? ` ${data.config.delay_hours}h` : ""}
          </Badge>
        )}
        {data.config?.message && (
          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
            "{data.config.message}"
          </p>
        )}
      </div>

      {!isEnd && !isCondition && !isBranch && !isWaitForResponse && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-white !border-2 !border-gray-400"
        />
      )}
      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "30%" }}
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-600"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: "70%" }}
            className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-500"
          />
        </>
      )}
      {isBranch && (
        <>
          {/* loan_type branch: purchase / refi / default */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="purchase"
            style={{ left: "20%" }}
            className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-600"
            title="Purchase"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="refinance"
            style={{ left: "50%" }}
            className="!w-3 !h-3 !bg-violet-400 !border-2 !border-violet-600"
            title="Refinance"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="default"
            style={{ left: "80%" }}
            className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-600"
            title="Default / Other"
          />
        </>
      )}
      {isWaitForResponse && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="responded"
            style={{ left: "30%" }}
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-600"
            title="Client responded"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no_response"
            style={{ left: "70%" }}
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-600"
            title="Timeout — no response"
          />
        </>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { flowStep: FlowNode };

// ─────────────────────────────────────────────────────────────────
// Convert stored steps/connections to React Flow nodes/edges
// ─────────────────────────────────────────────────────────────────

function stepsToNodes(steps: any[]): Node[] {
  return steps.map((s) => ({
    id: s.step_key,
    type: "flowStep",
    position: { x: s.position_x ?? 0, y: s.position_y ?? 0 },
    data: {
      step_key: s.step_key,
      step_type: s.step_type,
      label: s.label,
      description: s.description,
      config: s.config,
    },
  }));
}

function connectionsToEdges(connections: any[]): Edge[] {
  return connections.map((c) => {
    // Map edge_type back to React Flow sourceHandle ids so reloaded flows
    // attach edges to the correct visual handle (yes/no/purchase/refi/etc.).
    let sourceHandle: string | undefined;
    switch (c.edge_type) {
      case "condition_yes":
        sourceHandle = "yes";
        break;
      case "condition_no":
        sourceHandle = "no";
        break;
      case "loan_type_purchase":
        sourceHandle = "purchase";
        break;
      case "loan_type_refinance":
        sourceHandle = "refinance";
        break;
      case "responded":
        sourceHandle = "responded";
        break;
      case "no_response":
        sourceHandle = "no_response";
        break;
      default:
        sourceHandle = undefined;
    }
    const stroke =
      c.edge_type === "condition_yes" || c.edge_type === "responded"
        ? "#10b981"
        : c.edge_type === "condition_no"
          ? "#ef4444"
          : c.edge_type === "loan_type_purchase"
            ? "#3b82f6"
            : c.edge_type === "loan_type_refinance"
              ? "#8b5cf6"
              : c.edge_type === "no_response"
                ? "#f59e0b"
                : "#94a3b8";
    return {
      id: c.edge_key,
      source: c.source_step_key,
      target: c.target_step_key,
      sourceHandle,
      label: c.label ?? undefined,
      animated: c.edge_type !== "default",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke, strokeWidth: 2 },
      labelStyle: { fill: "#64748b", fontSize: 11 },
      labelBgStyle: { fill: "#f8fafc", border: "1px solid #e2e8f0" },
      data: { edge_type: c.edge_type ?? "default" },
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Step Config Panel
// ─────────────────────────────────────────────────────────────────

interface StepConfigPanelProps {
  node: Node | null;
  onUpdate: (
    nodeId: string,
    changes: {
      label?: string;
      description?: string;
      config?: ReminderFlowStepConfig;
    },
  ) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

function StepConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: StepConfigPanelProps) {
  const [label, setLabel] = useState((node?.data?.label as string) ?? "");
  const [description, setDescription] = useState(
    (node?.data?.description as string) ?? "",
  );
  const [cfg, setCfg] = useState<ReminderFlowStepConfig>(
    (node?.data?.config as ReminderFlowStepConfig) ?? {},
  );

  useEffect(() => {
    setLabel((node?.data?.label as string) ?? "");
    setDescription((node?.data?.description as string) ?? "");
    setCfg((node?.data?.config as ReminderFlowStepConfig) ?? {});
  }, [node?.id]);

  if (!node) return null;

  const meta = getStepMeta(node.data.step_type as ReminderStepType);
  const stepType = node.data.step_type as ReminderStepType;

  const handleSave = () => {
    onUpdate(node.id, { label, description, config: cfg });
  };

  return (
    <div className="w-72 bg-background border-l h-full flex flex-col shadow-lg">
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          meta.bgColor,
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 font-semibold text-sm",
            meta.color,
          )}
        >
          {meta.icon}
          Configure: {meta.label}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          ×
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Step Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Step name..."
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            className="text-sm min-h-[60px] resize-none"
          />
        </div>

        {/* Wait step */}
        {stepType === "wait" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Delay Configuration
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Days</Label>
                <Input
                  type="number"
                  min={0}
                  value={cfg.delay_days ?? 0}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      delay_days: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hours</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={cfg.delay_hours ?? 0}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      delay_hours: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Message steps */}
        {(stepType === "send_notification" ||
          stepType === "send_email" ||
          stepType === "send_sms" ||
          stepType === "send_whatsapp") && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Message
            </h4>
            {stepType === "send_email" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={cfg.subject ?? ""}
                  onChange={(e) =>
                    setCfg((c) => ({ ...c, subject: e.target.value }))
                  }
                  placeholder="Email subject..."
                  className="h-8 text-sm"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Message Body</Label>
              <Textarea
                value={cfg.message ?? ""}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, message: e.target.value }))
                }
                placeholder="Your message... Use {{client_name}} for dynamic values."
                className="text-sm min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Template ID{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                type="number"
                min={1}
                value={cfg.template_id ?? ""}
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    template_id: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="e.g. 42"
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                If set, the template body overrides Message Body at send time.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Variables:{" "}
              <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{{broker_name}}"}</code>
            </p>
          </div>
        )}

        {/* Condition / Branch step */}
        {(stepType === "condition" || stepType === "branch") && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {stepType === "branch" ? "Branch" : "Condition"}
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {stepType === "branch" ? "Branch Type" : "Condition Type"}
              </Label>
              <Select
                value={
                  cfg.condition_type ??
                  (stepType === "branch" ? "loan_type" : "task_pending")
                }
                onValueChange={(v: any) =>
                  setCfg((c) => ({ ...c, condition_type: v }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stepType === "branch" ? (
                    <SelectItem value="loan_type">
                      Loan Type (Purchase / Refi)
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="task_completed">
                        Task Completed
                      </SelectItem>
                      <SelectItem value="task_pending">
                        Task Still Pending
                      </SelectItem>
                      <SelectItem value="inactivity_days">
                        No Activity (days)
                      </SelectItem>
                      <SelectItem value="loan_status">
                        Loan Status Equals
                      </SelectItem>
                      <SelectItem value="loan_status_ne">
                        Loan Status Not Equals
                      </SelectItem>
                      <SelectItem value="field_not_empty">
                        Field Not Empty
                      </SelectItem>
                      <SelectItem value="field_empty">Field Empty</SelectItem>
                      <SelectItem value="loan_type">Loan Type Is</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {(cfg.condition_type === "inactivity_days" ||
              cfg.condition_type === "loan_status" ||
              cfg.condition_type === "loan_status_ne" ||
              (cfg.condition_type === "loan_type" &&
                stepType === "condition")) && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {cfg.condition_type === "inactivity_days"
                    ? "Days without activity"
                    : cfg.condition_type === "loan_type"
                      ? "Loan type value (purchase / refinance)"
                      : "Loan status value"}
                </Label>
                <Input
                  value={cfg.condition_value ?? ""}
                  onChange={(e) =>
                    setCfg((c) => ({ ...c, condition_value: e.target.value }))
                  }
                  placeholder={
                    cfg.condition_type === "inactivity_days"
                      ? "7"
                      : cfg.condition_type === "loan_type"
                        ? "purchase"
                        : "approved"
                  }
                  className="h-8 text-sm"
                />
              </div>
            )}
            {(cfg.condition_type === "field_not_empty" ||
              cfg.condition_type === "field_empty") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Field name</Label>
                <Input
                  value={cfg.field_name ?? ""}
                  onChange={(e) =>
                    setCfg((c) => ({ ...c, field_name: e.target.value }))
                  }
                  placeholder="e.g. client_email, actual_close_date"
                  className="h-8 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Loan column name to inspect.
                </p>
              </div>
            )}
            {stepType === "condition" && (
              <div className="flex gap-2 text-xs mt-1">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                  Yes → continues
                </Badge>
                <Badge className="bg-red-100 text-red-700 border-red-300">
                  No → alternative
                </Badge>
              </div>
            )}
            {stepType === "branch" && (
              <div className="flex flex-wrap gap-1.5 text-xs mt-1">
                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                  Purchase
                </Badge>
                <Badge className="bg-violet-100 text-violet-700 border-violet-300">
                  Refinance
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                  Default
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Wait For Response */}
        {stepType === "wait_for_response" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Response Timeout
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={cfg.response_timeout_hours ?? 24}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      response_timeout_hours: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={cfg.response_timeout_minutes ?? 0}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      response_timeout_minutes: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 text-xs mt-1">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                Responded → continues
              </Badge>
              <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                No Response → timeout path
              </Badge>
            </div>
          </div>
        )}

        {/* Wait Until Date */}
        {stepType === "wait_until_date" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Target Date Field
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs">Date field name</Label>
              <Input
                value={cfg.date_field ?? ""}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, date_field: e.target.value }))
                }
                placeholder="e.g. actual_close_date, app_due_date"
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Loan column whose stored date the flow will pause until.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Offset Days</Label>
                <Input
                  type="number"
                  value={cfg.delay_days ?? 0}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      delay_days: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Offset Hours</Label>
                <Input
                  type="number"
                  value={cfg.delay_hours ?? 0}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      delay_hours: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Negative offsets = before the date (e.g. −3 days). Positive =
              after.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex gap-2">
        <Button size="sm" className="flex-1 h-8" onClick={handleSave}>
          <Save className="h-3 w-3 mr-1" />
          Apply
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-8"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// How-to Guide Modal
// ─────────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  {
    num: 1,
    icon: <MousePointer2 className="h-4 w-4 text-primary" />,
    title: "Drag a step onto the canvas",
    desc: "Pick any step type from the left palette and drag it onto the canvas area. Start with a Trigger — it's already there for you.",
    tip: "You can place as many steps as you need.",
  },
  {
    num: 2,
    icon: <Link2 className="h-4 w-4 text-sky-600" />,
    title: "Connect steps together",
    desc: "Hover over a step node — a small circle handle appears at the bottom. Drag from that circle to another node's top handle to create a connection.",
    tip: "Condition nodes have two handles: Yes (green, left) and No (red, right).",
  },
  {
    num: 3,
    icon: <Settings2 className="h-4 w-4 text-violet-600" />,
    title: "Configure each step",
    desc: "Click any node to open its settings panel on the right. Set the message, delay, or condition logic for that step.",
    tip: "Use {{client_name}} and {{broker_name}} as dynamic variables in messages.",
  },
  {
    num: 4,
    icon: <Save className="h-4 w-4 text-emerald-600" />,
    title: "Save & activate",
    desc: "Click Save Flow in the top toolbar. Toggle the Active switch to enable automatic execution for all new loans.",
    tip: "Flows marked as Active will automatically run when the trigger event occurs.",
  },
];

// ─────────────────────────────────────────────────────────────────
// Example Flow Diagram (visual flowchart)
// ─────────────────────────────────────────────────────────────────

function FlowBox({
  label,
  sub,
  color = "default",
  shape = "rect",
}: {
  label: string;
  sub?: string;
  color?:
    | "default"
    | "green"
    | "blue"
    | "orange"
    | "yellow"
    | "purple"
    | "red"
    | "gray";
  shape?: "rect" | "diamond" | "circle" | "pill";
}) {
  const colorCls: Record<string, string> = {
    default: "border-border bg-card text-foreground",
    green: "border-emerald-400 bg-emerald-50 text-emerald-800",
    blue: "border-blue-300 bg-blue-50 text-blue-800",
    orange: "border-orange-300 bg-orange-50 text-orange-800",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-800",
    purple: "border-purple-300 bg-purple-50 text-purple-800",
    red: "border-primary/50 bg-primary/10 text-primary",
    gray: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };

  if (shape === "diamond") {
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: 120, height: 72 }}
      >
        <div
          className={cn(
            "absolute rounded-sm border-2 rotate-45",
            colorCls[color],
          )}
          style={{ width: 64, height: 64 }}
        />
        <div className="relative z-10 text-center leading-tight px-1">
          <span className="text-[10px] font-semibold">{label}</span>
          {sub && (
            <span className="text-[9px] block text-muted-foreground">
              {sub}
            </span>
          )}
        </div>
      </div>
    );
  }
  if (shape === "circle") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 text-[10px] font-semibold",
          colorCls[color],
        )}
        style={{ width: 48, height: 48 }}
      >
        {label}
      </div>
    );
  }
  if (shape === "pill") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 px-3 py-1.5 text-[10px] font-semibold",
          colorCls[color],
        )}
      >
        {label}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border-2 rounded-lg px-3 py-2 text-center",
        colorCls[color],
      )}
      style={{ minWidth: 128 }}
    >
      <span className="text-[10px] font-semibold leading-tight">{label}</span>
      {sub && (
        <span className="text-[9px] text-muted-foreground mt-0.5">{sub}</span>
      )}
    </div>
  );
}

function FlowArrow({
  label,
  side,
}: {
  label?: string;
  side?: "left" | "right";
}) {
  if (side) {
    return (
      <div className="flex items-center gap-0.5">
        {side === "right" && (
          <div className="h-px w-8 bg-muted-foreground/40" />
        )}
        <span className="text-[9px] font-semibold text-muted-foreground border border-dashed border-muted-foreground/30 rounded px-1 py-0.5">
          {label}
        </span>
        {side === "left" && <div className="h-px w-8 bg-muted-foreground/40" />}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="w-px h-4 bg-muted-foreground/40" />
      <div
        className="w-0 h-0"
        style={{
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "5px solid hsl(var(--muted-foreground)/0.4)",
        }}
      />
    </div>
  );
}

function ExampleFlowDiagram() {
  return (
    <div className="overflow-x-auto">
      <div className="flex flex-col items-center gap-0 py-2 min-w-[300px]">
        {/* Admin creates Flow */}
        <FlowBox label="Admin creates Flow" color="gray" />
        <div className="flex flex-col items-center">
          <div className="w-px h-2 bg-muted-foreground/40" />
          <span className="text-[9px] font-mono bg-muted border border-dashed rounded px-1.5 py-0.5 text-muted-foreground">
            trigger: app_created
          </span>
          <div className="w-px h-2 bg-muted-foreground/40" />
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "5px solid hsl(var(--muted-foreground)/0.4)",
            }}
          />
        </div>

        {/* Trigger Node */}
        <FlowBox label="Trigger Node" color="green" />
        <FlowArrow />

        {/* Wait 3 days */}
        <FlowBox label="Wait 3 days" color="blue" shape="diamond" />
        <FlowArrow />

        {/* Send Notification */}
        <FlowBox label="Send Notification" color="orange" />
        <FlowArrow />

        {/* Condition */}
        <FlowBox
          label="Condition: Task Pending?"
          color="yellow"
          shape="diamond"
        />

        {/* Yes / No branches */}
        <div className="flex items-start gap-8 mt-0">
          {/* Yes branch */}
          <div className="flex flex-col items-center gap-0">
            <div className="flex items-center gap-0">
              <div className="h-px w-12 bg-muted-foreground/40" />
              <div
                className="w-0 h-0"
                style={{
                  borderTop: "4px solid transparent",
                  borderBottom: "4px solid transparent",
                  borderLeft: "5px solid hsl(var(--muted-foreground)/0.4)",
                }}
              />
            </div>
            <FlowArrow label="Yes" side="left" />
            <FlowBox label="Send Email Reminder" color="red" />
          </div>

          {/* No branch */}
          <div className="flex flex-col items-center gap-0">
            <div className="flex items-center gap-0">
              <div
                className="w-0 h-0"
                style={{
                  borderTop: "4px solid transparent",
                  borderBottom: "4px solid transparent",
                  borderRight: "5px solid hsl(var(--muted-foreground)/0.4)",
                }}
              />
              <div className="h-px w-12 bg-muted-foreground/40" />
            </div>
            <FlowArrow label="No" side="right" />
            <FlowBox label="Send SMS" color="purple" />
          </div>
        </div>

        {/* Converge arrows */}
        <div className="flex items-end gap-8 mt-0">
          <div className="flex flex-col items-center">
            <div className="w-px h-4 bg-muted-foreground/40" />
            <div className="h-px w-24 bg-muted-foreground/40" />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-px h-4 bg-muted-foreground/40" />
            <div className="h-px w-24 bg-muted-foreground/40" />
          </div>
        </div>
        <div className="flex flex-col items-center -mt-px">
          <div className="w-px h-4 bg-muted-foreground/40" />
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "5px solid hsl(var(--muted-foreground)/0.4)",
            }}
          />
        </div>

        {/* Wait 7 days */}
        <FlowBox label="Wait 7 days" color="blue" shape="diamond" />
        <FlowArrow />

        {/* Final Notification */}
        <FlowBox label="Final Notification" color="orange" />
        <FlowArrow />

        {/* End */}
        <FlowBox label="End" color="gray" shape="circle" />
      </div>
    </div>
  );
}

interface HowToUseModalProps {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Flow Trace Modal — shows per-step lifecycle logs
// ─────────────────────────────────────────────────────────────────

interface FlowTraceModalProps {
  flowId: number;
  open: boolean;
  onClose: () => void;
}

function FlowTraceModal({ flowId, open, onClose }: FlowTraceModalProps) {
  const dispatch = useAppDispatch();
  const { traceLogs, isLoadingTrace } = useAppSelector((s) => s.reminderFlows);

  useEffect(() => {
    if (open) {
      dispatch(fetchReminderFlowTrace({ flowId, limit: 300 }));
    }
  }, [open, flowId, dispatch]);

  const eventStyle = (event: string) => {
    switch (event) {
      case "started":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "succeeded":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      case "skipped":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "timeout":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Flow Trace Logs
          </DialogTitle>
          <DialogDescription>
            Per-step lifecycle records for this flow's executions. Newest first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between pb-2">
          <div className="text-xs text-muted-foreground">
            {isLoadingTrace
              ? "Loading…"
              : `${traceLogs.length} log entr${traceLogs.length === 1 ? "y" : "ies"}`}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            disabled={isLoadingTrace}
            onClick={() =>
              dispatch(fetchReminderFlowTrace({ flowId, limit: 300 }))
            }
          >
            <Activity className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr className="text-left">
                <th className="px-2 py-1.5 font-medium">Time</th>
                <th className="px-2 py-1.5 font-medium">Exec</th>
                <th className="px-2 py-1.5 font-medium">Step</th>
                <th className="px-2 py-1.5 font-medium">Type</th>
                <th className="px-2 py-1.5 font-medium">Event</th>
                <th className="px-2 py-1.5 font-medium">Channel</th>
                <th className="px-2 py-1.5 font-medium">Recipient</th>
                <th className="px-2 py-1.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {traceLogs.length === 0 && !isLoadingTrace && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No trace records yet. Logs are written only when this flow's
                    "Trace logging" toggle is on AND the engine has processed at
                    least one step.
                  </td>
                </tr>
              )}
              {traceLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-muted/50">
                  <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 font-mono">#{log.execution_id}</td>
                  <td className="px-2 py-1.5 font-mono truncate max-w-[140px]">
                    {log.step_key}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {log.step_type}
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", eventStyle(log.event))}
                    >
                      {log.event}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {log.channel}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[160px]">
                    {log.recipient ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[260px]">
                    {log.error_message
                      ? `❌ ${log.error_message}`
                      : log.external_id
                        ? `id: ${log.external_id}`
                        : (log.delivery_status ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HowToUseModal({ open, onClose }: HowToUseModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            How to build a Reminder Flow
          </DialogTitle>
          <DialogDescription>
            Follow these 4 steps to create an automated reminder flow for your
            clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {GUIDE_STEPS.map((step, idx) => (
            <div key={step.num} className="flex gap-3">
              {/* Step number + connector */}
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  {step.num}
                </div>
                {idx < GUIDE_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-sm mb-0.5">
                  {step.icon}
                  {step.title}
                </div>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                  <Lightbulb className="h-3 w-3 shrink-0" />
                  <span>{step.tip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step type legend */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Step Types Reference
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STEP_TYPES.map((s) => (
              <div
                key={s.type}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md border text-xs",
                  s.bgColor,
                  s.borderColor,
                )}
              >
                <span className={s.color}>{s.icon}</span>
                <div className="min-w-0">
                  <span className={cn("font-medium", s.color)}>{s.label}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {s.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Example Flow */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Example Flow
          </p>
          <p className="text-[11px] text-muted-foreground mb-3">
            Here's a real-world example: notify clients about pending tasks,
            branch if still pending after a week, then send a final reminder.
          </p>
          <div className="rounded-xl border bg-muted/30 p-4">
            <ExampleFlowDiagram />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Got it!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// Canvas Empty Hint (shown when no connections exist yet)
// ─────────────────────────────────────────────────────────────────

function CanvasEmptyHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
      <div className="pointer-events-auto w-full max-w-xl mx-6">
        <div className="bg-background/95 backdrop-blur-sm border-2 border-dashed border-primary/30 rounded-2xl p-6 shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">Build your flow</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-5">
            {[
              {
                icon: <MousePointer2 className="h-5 w-5" />,
                label: "Drag step",
                color: "text-primary bg-primary/10 border-primary/20",
              },
              {
                icon: (
                  <MoveRight className="h-4 w-4 text-muted-foreground/50" />
                ),
                label: "",
                color: "",
              },
              {
                icon: <Link2 className="h-5 w-5" />,
                label: "Connect",
                color: "text-sky-600 bg-sky-50 border-sky-200",
              },
              {
                icon: (
                  <MoveRight className="h-4 w-4 text-muted-foreground/50" />
                ),
                label: "",
                color: "",
              },
              {
                icon: <Settings2 className="h-5 w-5" />,
                label: "Configure",
                color: "text-violet-600 bg-violet-50 border-violet-200",
              },
              {
                icon: (
                  <MoveRight className="h-4 w-4 text-muted-foreground/50" />
                ),
                label: "",
                color: "",
              },
              {
                icon: <Save className="h-5 w-5" />,
                label: "Save",
                color: "text-emerald-600 bg-emerald-50 border-emerald-200",
              },
            ].map((item, i) =>
              item.label ? (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-xs font-semibold whitespace-nowrap min-w-[80px]",
                    item.color,
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ) : (
                <div key={i} className="flex items-center shrink-0">
                  {item.icon}
                </div>
              ),
            )}
          </div>

          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                1
              </span>
              <span>
                From the <strong className="text-foreground">left panel</strong>
                , drag any step type onto this canvas
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                2
              </span>
              <span>
                Hover a node and{" "}
                <strong className="text-foreground">
                  drag from the bottom circle
                </strong>{" "}
                to connect it to the next step
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                3
              </span>
              <span>
                <strong className="text-foreground">Click any node</strong> to
                configure its message, delay, or condition
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Inner Flow Canvas (must be inside ReactFlowProvider)
// ─────────────────────────────────────────────────────────────────

interface FlowCanvasProps {
  flow: ReminderFlow;
  onBack: () => void;
  onSaved: () => void;
}

function FlowCanvasInner({ flow, onBack, onSaved }: FlowCanvasProps) {
  const dispatch = useAppDispatch();
  const { isSaving } = useAppSelector((s) => s.reminderFlows);
  const currentBrokerId = useAppSelector((s) => s.brokerAuth.user?.id ?? null);
  const { toast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    stepsToNodes(flow.steps ?? []),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    connectionsToEdges(flow.connections ?? []),
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState(flow.name);
  const [flowDesc, setFlowDesc] = useState(flow.description ?? "");
  const [triggerEvent, setTriggerEvent] = useState<ReminderTriggerEvent>(
    flow.trigger_event,
  );
  const [triggerDelay, setTriggerDelay] = useState(
    flow.trigger_delay_days ?? 0,
  );
  const [isActive, setIsActive] = useState(flow.is_active);
  const [applyToAll, setApplyToAll] = useState(flow.apply_to_all_loans);
  // Restriction: when enabled the flow is hidden from other brokers AND
  // only triggers for loans whose broker_user_id matches `currentBrokerId`.
  // We mirror it as a local boolean and resolve to broker_id on save.
  const [restrictToMe, setRestrictToMe] = useState<boolean>(
    !!(flow as any).restricted_to_broker_id,
  );
  const [enableTrace, setEnableTrace] = useState<boolean>(
    !!(flow as any).enable_trace_logging,
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  // Show canvas hint when flow has no connections yet (first time)
  const [showHint, setShowHint] = useState(
    (flow.connections ?? []).length === 0,
  );

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const edgeKey = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      const sourceHandle = params.sourceHandle;
      // Map sourceHandle id (set on the FlowNode) back to the persisted
      // edge_type enum. Keep in sync with FlowNode handle ids and the DB
      // `reminder_flow_connections.edge_type` enum.
      let edgeType:
        | "default"
        | "condition_yes"
        | "condition_no"
        | "loan_type_purchase"
        | "loan_type_refinance"
        | "responded"
        | "no_response" = "default";
      let label: string | undefined;
      let stroke = "#94a3b8";
      switch (sourceHandle) {
        case "yes":
          edgeType = "condition_yes";
          label = "Yes";
          stroke = "#10b981";
          break;
        case "no":
          edgeType = "condition_no";
          label = "No";
          stroke = "#ef4444";
          break;
        case "purchase":
          edgeType = "loan_type_purchase";
          label = "Purchase";
          stroke = "#3b82f6";
          break;
        case "refinance":
          edgeType = "loan_type_refinance";
          label = "Refi";
          stroke = "#8b5cf6";
          break;
        case "default":
          edgeType = "default";
          label = "Default";
          break;
        case "responded":
          edgeType = "responded";
          label = "Responded";
          stroke = "#10b981";
          break;
        case "no_response":
          edgeType = "no_response";
          label = "No Response";
          stroke = "#f59e0b";
          break;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: edgeKey,
            animated: edgeType !== "default",
            markerEnd: { type: MarkerType.ArrowClosed },
            label,
            style: { stroke, strokeWidth: 2 },
            data: { edge_type: edgeType },
          },
          eds,
        ),
      );
      setShowHint(false);
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/reactflow",
      ) as ReminderStepType;
      if (!type) return;

      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) return;
      const meta = getStepMeta(type);

      const newNode: Node = {
        id: uniqueKey(),
        type: "flowStep",
        position: {
          x: event.clientX - rect.left - 100,
          y: event.clientY - rect.top - 30,
        },
        data: {
          step_type: type,
          label: meta.label,
          description: meta.description,
          config: {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = (nodeId: string, changes: any) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...changes } } : n,
      ),
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId
        ? { ...prev, data: { ...prev.data, ...changes } }
        : prev,
    );
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
    );
    setSelectedNode(null);
  };

  const handleSave = async () => {
    const steps: SaveReminderFlowStep[] = nodes.map((n) => ({
      step_key: n.id,
      step_type: n.data.step_type as ReminderStepType,
      label: n.data.label as string,
      description: n.data.description as string | undefined,
      config: n.data.config as ReminderFlowStepConfig | undefined,
      position_x: n.position.x,
      position_y: n.position.y,
    }));

    const connections: SaveReminderFlowConnection[] = edges.map((e) => ({
      edge_key: e.id,
      source_step_key: e.source,
      target_step_key: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
      edge_type: ((e.data as any)?.edge_type as any) ?? "default",
    }));

    const result = await dispatch(
      saveReminderFlow({
        flowId: flow.id,
        name: flowName,
        description: flowDesc,
        trigger_event: triggerEvent,
        trigger_delay_days: triggerDelay,
        is_active: isActive,
        apply_to_all_loans: applyToAll,
        // Per-broker restriction: send the broker id when the toggle is on,
        // explicit null clears it. Backend gates visibility on this field.
        restricted_to_broker_id: restrictToMe ? currentBrokerId : null,
        enable_trace_logging: enableTrace,
        steps,
        connections,
      }),
    );

    if (saveReminderFlow.fulfilled.match(result)) {
      toast({
        title: "Flow saved",
        description: "Reminder flow updated successfully.",
      });
      onSaved();
    } else {
      toast({
        title: "Error",
        description: (result.payload as string) ?? "Failed to save flow",
        variant: "destructive",
      });
    }
  };

  const onDragStart = (event: React.DragEvent, type: ReminderStepType) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Toolbar */}
      <div className="flex flex-col gap-2 px-3 md:px-4 py-3 border-b bg-background shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 w-fit"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Flows
        </Button>

        {/* Desktop editor controls */}
        <div className="hidden md:flex items-center gap-3">
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="h-8 text-sm font-medium max-w-xs"
            />
            <Select
              value={triggerEvent}
              onValueChange={(v) => setTriggerEvent(v as ReminderTriggerEvent)}
            >
              <SelectTrigger className="h-8 text-sm w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_EVENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-sm">
              <Label className="text-xs text-muted-foreground">
                Start after
              </Label>
              <Input
                type="number"
                min={0}
                value={triggerDelay}
                onChange={(e) => setTriggerDelay(Number(e.target.value))}
                className="h-8 text-sm w-16"
              />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="scale-90"
              />
              <Label className="text-xs">
                {isActive ? "Active" : "Inactive"}
              </Label>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={restrictToMe}
                    onCheckedChange={setRestrictToMe}
                    className="scale-90"
                    disabled={!currentBrokerId}
                  />
                  <Label className="text-xs">Restrict to me</Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Hide this flow from other brokers and only trigger it for loans
                assigned to me.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={enableTrace}
                    onCheckedChange={setEnableTrace}
                    className="scale-90"
                  />
                  <Label className="text-xs">Trace logging</Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Persist a step-by-step lifecycle log to reminder_flow_step_logs
                for debugging.
              </TooltipContent>
            </Tooltip>
            {enableTrace && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => setShowTrace(true)}
              >
                <Activity className="h-3.5 w-3.5" />
                View Trace
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving…" : "Save Flow"}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => setShowHelp(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>How to use the flow editor</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile header controls (editor itself is desktop-only) */}
        <div className="md:hidden space-y-2">
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="h-8 text-sm font-medium"
          />
          <div className="flex items-center justify-between rounded-md border px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Label className="text-xs font-medium">
                {isActive ? "Active" : "Inactive"}
              </Label>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="scale-90"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 h-8 flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => setShowHelp(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>How to use the flow editor</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Canvas body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile warning — flow editor requires a desktop browser */}
        <div className="md:hidden flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center bg-muted/20">
          <Monitor className="h-12 w-12 text-muted-foreground opacity-50" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Desktop Required</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              The flow editor uses drag-and-drop and requires a desktop or
              laptop browser. Please open this page on a larger device to edit
              flows.
            </p>
          </div>
        </div>

        {/* Step Palette — desktop only */}
        <div className="hidden md:flex w-44 border-r bg-muted/30 flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Step Types
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Drag onto canvas
            </p>
          </div>
          <div className="p-2 space-y-1.5">
            {STEP_TYPES.map((s) => (
              <div
                key={s.type}
                draggable
                onDragStart={(e) => onDragStart(e, s.type)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none transition-all hover:scale-[1.02] hover:shadow-sm",
                  s.bgColor,
                  s.borderColor,
                )}
              >
                <span className={s.color}>{s.icon}</span>
                <span className={cn("text-xs font-medium", s.color)}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Guide */}
          <div className="mt-auto border-t p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quick Guide
            </p>
            {[
              {
                num: "1",
                text: "Drag a step to the canvas",
                color: "bg-primary/10 text-primary",
              },
              {
                num: "2",
                text: "Connect nodes by dragging handles",
                color: "bg-sky-100 text-sky-600",
              },
              {
                num: "3",
                text: "Click a node to configure it",
                color: "bg-violet-100 text-violet-600",
              },
              {
                num: "4",
                text: "Save the flow when ready",
                color: "bg-emerald-100 text-emerald-600",
              },
            ].map((s) => (
              <div key={s.num} className="flex items-start gap-1.5">
                <span
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold",
                    s.color,
                  )}
                >
                  {s.num}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {s.text}
                </span>
              </div>
            ))}
            {/* Mini example strip */}
            <div className="mt-2 rounded-lg border bg-muted/40 p-2 space-y-0.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Example Flow
              </p>
              {[
                {
                  label: "Trigger Node",
                  color: "bg-emerald-100 text-emerald-700 border-emerald-300",
                },
                {
                  label: "Wait 3 days",
                  color: "bg-blue-100 text-blue-700 border-blue-300",
                },
                {
                  label: "Send Notification",
                  color: "bg-orange-100 text-orange-700 border-orange-300",
                },
                {
                  label: "Condition?",
                  color: "bg-yellow-100 text-yellow-700 border-yellow-300",
                },
                {
                  label: "Email / SMS",
                  color: "bg-primary/10 text-primary border-primary/30",
                },
                {
                  label: "Final Notice",
                  color: "bg-orange-100 text-orange-700 border-orange-300",
                },
                {
                  label: "End",
                  color: "bg-muted text-muted-foreground border-border",
                },
              ].map((step, i, arr) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-full text-center text-[9px] font-medium py-0.5 px-1 rounded border",
                      step.color,
                    )}
                  >
                    {step.label}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px h-2 bg-muted-foreground/30" />
                  )}
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground pt-1 text-center">
                See Full Guide for details
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[11px] gap-1.5 mt-1 text-muted-foreground hover:text-primary"
              onClick={() => setShowHelp(true)}
            >
              <HelpCircle className="h-3 w-3" />
              Full Guide
            </Button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div
          className="hidden md:flex flex-1 overflow-hidden relative"
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {showHint && edges.length === 0 && (
            <CanvasEmptyHint onDismiss={() => setShowHint(false)} />
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
            }}
            minZoom={0.3}
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background
              variant={BackgroundVariant.Lines}
              gap={24}
              lineWidth={0.5}
              color="#e8edf3"
            />
            <Controls className="!border !border-border !rounded-xl !overflow-hidden !shadow-sm" />
            <MiniMap
              className="!border !border-border !rounded-xl !overflow-hidden"
              nodeColor={(n) => {
                const meta = getStepMeta((n.data as any).step_type);
                return meta.borderColor.replace("border-", "");
              }}
              zoomable
              pannable
            />
            <Panel
              position="top-right"
              className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-sm"
            >
              {nodes.length} steps · {edges.length} connections
            </Panel>
          </ReactFlow>
        </div>

        {/* Step Config Panel */}
        {selectedNode && (
          <StepConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* How-to Modal */}
      <HowToUseModal open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Trace Logs Modal */}
      <FlowTraceModal
        flowId={flow.id}
        open={showTrace}
        onClose={() => setShowTrace(false)}
      />
    </div>
  );
}

// Wrap in ReactFlowProvider
function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Flow Card Component
// ─────────────────────────────────────────────────────────────────

interface FlowCardProps {
  flow: ReminderFlow;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function FlowCard({ flow, onEdit, onToggle, onDelete }: FlowCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer border-2",
        flow.is_active ? "border-primary/20" : "border-border opacity-70",
      )}
      onClick={onEdit}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "p-1.5 rounded-lg shrink-0",
                flow.is_active ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Workflow
                className={cn(
                  "h-4 w-4",
                  flow.is_active ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
            <CardTitle className="text-sm font-semibold truncate">
              {flow.name}
            </CardTitle>
          </div>
          <Badge
            variant={flow.is_active ? "default" : "secondary"}
            className={cn(
              "text-[10px] shrink-0",
              flow.is_active && "bg-primary/10 text-primary border-primary/30",
            )}
          >
            {flow.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        {flow.description && (
          <CardDescription className="text-xs mt-1 line-clamp-2">
            {flow.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Zap className="h-2.5 w-2.5" />
            {triggerLabel(flow.trigger_event)}
          </Badge>
          {flow.trigger_delay_days > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />+{flow.trigger_delay_days}d
            </Badge>
          )}
          {(flow.active_executions_count ?? 0) > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
            >
              <Activity className="h-2.5 w-2.5" />
              {flow.active_executions_count} running
            </Badge>
          )}
        </div>

        <div className="flex gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-1"
            onClick={onEdit}
          >
            <Settings2 className="h-3 w-3" />
            Edit Flow
            <ChevronRight className="h-3 w-3 ml-auto" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={onToggle}
            title={flow.is_active ? "Deactivate" : "Activate"}
          >
            {flow.is_active ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 hover:text-destructive hover:border-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────

const ReminderFlows = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const {
    flows,
    selectedFlow,
    isLoading,
    executions,
    pagination: execPagination,
  } = useAppSelector((s) => s.reminderFlows);

  const [activeCategory, setActiveCategory] = useState<FlowCategory>("loan");

  const [execSortBy, setExecSortBy] = useState("flow_name");
  const [execSortDir, setExecSortDir] = useState<"ASC" | "DESC">("ASC");

  const doFetchExec = useCallback(
    (params: {
      page?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      flow_category?: "loan" | "realtor_prospecting";
    }) => {
      dispatch(fetchReminderFlowExecutions({ limit: 30, ...params }));
    },
    [dispatch],
  );

  const handleExecSort = (field: string) => {
    const newDir =
      execSortBy === field && execSortDir === "ASC" ? "DESC" : "ASC";
    setExecSortBy(field);
    setExecSortDir(newDir);
    doFetchExec({
      page: 1,
      sortBy: field,
      sortOrder: newDir,
      flow_category: activeCategory,
    });
  };

  const [view, setView] = useState<"list" | "editor">("list");
  const [tab, setTab] = useState<"flows" | "executions">("flows");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteFlowId, setDeleteFlowId] = useState<number | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrigger, setNewTrigger] = useState<ReminderTriggerEvent>(
    "application_received",
  );
  const [newDelay, setNewDelay] = useState(0);

  // Which trigger options to show in the create modal
  const activeTriggerOptions =
    activeCategory === "realtor_prospecting"
      ? REALTOR_TRIGGER_EVENT_OPTIONS
      : LOAN_TRIGGER_EVENT_OPTIONS;

  const handleCategoryChange = (category: FlowCategory) => {
    setActiveCategory(category);
    // Reset trigger to first option for the new category
    if (category === "realtor_prospecting") {
      setNewTrigger("prospect_contact_attempted");
    } else {
      setNewTrigger("application_received");
    }
    dispatch(fetchReminderFlows(category));
    doFetchExec({
      page: 1,
      sortBy: execSortBy,
      sortOrder: execSortDir,
      flow_category: category,
    });
  };

  useEffect(() => {
    dispatch(fetchReminderFlows(activeCategory));
    doFetchExec({
      sortBy: execSortBy,
      sortOrder: execSortDir,
      flow_category: activeCategory,
    });
  }, [dispatch]);

  const handleEditFlow = async (flowId: number) => {
    await dispatch(fetchReminderFlow(flowId));
    setView("editor");
  };

  const handleBackToList = () => {
    setView("list");
    dispatch(clearSelectedFlow());
    dispatch(fetchReminderFlows(activeCategory));
  };

  const handleCreateFlow = async () => {
    if (!newName.trim()) return;
    const result = await dispatch(
      createReminderFlow({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        trigger_event: newTrigger,
        trigger_delay_days: newDelay,
        flow_category: activeCategory,
      }),
    );

    if (createReminderFlow.fulfilled.match(result)) {
      toast({
        title: "Flow created",
        description: `"${newName}" has been created.`,
      });
      setShowCreateModal(false);
      setNewName("");
      setNewDesc("");
      setNewTrigger("application_received");
      setNewDelay(0);
      dispatch(fetchReminderFlows(activeCategory));
      const flowId = (result.payload as any).flow_id;
      if (flowId) {
        await dispatch(fetchReminderFlow(flowId));
        setView("editor");
      }
    } else {
      toast({
        title: "Error",
        description: (result.payload as string) ?? "Failed to create flow",
        variant: "destructive",
      });
    }
  };

  const handleToggleFlow = async (flowId: number) => {
    const result = await dispatch(toggleReminderFlow(flowId));
    if (toggleReminderFlow.fulfilled.match(result)) {
      const { is_active } = result.payload;
      toast({ title: is_active ? "Flow activated" : "Flow deactivated" });
    }
  };

  const handleDeleteFlow = async () => {
    if (!deleteFlowId) return;
    const result = await dispatch(deleteReminderFlow(deleteFlowId));
    setDeleteFlowId(null);
    if (deleteReminderFlow.fulfilled.match(result)) {
      toast({ title: "Flow deleted" });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete flow",
        variant: "destructive",
      });
    }
  };

  const executionStatusColor: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-300",
    paused: "bg-amber-100 text-amber-700 border-amber-300",
    completed: "bg-sky-100 text-sky-700 border-sky-300",
    cancelled: "bg-gray-100 text-gray-600 border-gray-300",
    failed: "bg-red-100 text-red-700 border-red-300",
  };

  const executionColumns: DataGridColumn<ReminderFlowExecution>[] = [
    {
      key: "flow_name",
      label: "Flow",
      sortable: true,
      sticky: true,
      className: "font-medium text-xs min-w-[140px]",
      render: (ex) => (
        <span className="font-medium text-xs">{ex.flow_name}</span>
      ),
    },
    {
      key: "client_name",
      label: "Client",
      sortable: true,
      className: "text-xs",
      render: (ex) => <span className="text-xs">{ex.client_name ?? "—"}</span>,
    },
    {
      key: "application_number",
      label: "Application",
      sortable: true,
      shrink: true,
      className: "text-xs text-muted-foreground",
      render: (ex) => (
        <span className="text-xs text-muted-foreground">
          {ex.application_number ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      shrink: true,
      render: (ex) => (
        <Badge
          variant="outline"
          className={cn("text-[10px]", executionStatusColor[ex.status])}
        >
          {ex.status}
        </Badge>
      ),
    },
    {
      key: "current_step_key",
      label: "Current Step",
      sortable: false,
      className: "text-xs text-muted-foreground font-mono",
      render: (ex) => (
        <span className="text-xs text-muted-foreground font-mono">
          {ex.current_step_key ?? "—"}
        </span>
      ),
    },
    {
      key: "next_execution_at",
      label: "Next Run",
      sortable: true,
      shrink: true,
      className: "text-xs text-muted-foreground",
      render: (ex) => (
        <span className="text-xs text-muted-foreground">
          {ex.next_execution_at
            ? new Date(ex.next_execution_at).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
  ];

  // ── Editor view ────────────────────────────────────────────────
  if (view === "editor" && selectedFlow) {
    return (
      <>
        <MetaHelmet
          {...adminPageMeta("Reminder Flows", "Edit reminder automation flow")}
        />
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <FlowCanvas
            flow={selectedFlow}
            onBack={handleBackToList}
            onSaved={handleBackToList}
          />
        </div>
      </>
    );
  }

  // ── List view ──────────────────────────────────────────────────
  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Reminder Flows",
          "Automate client reminders with visual flow builder",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <PageHeader
          icon={<AlarmClock className="h-7 w-7 text-primary" />}
          title={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                  <span>
                    {activeCategory === "loan"
                      ? "Reminder Flows"
                      : "Realtor Prospecting Flows"}
                  </span>
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Select Pipeline
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleCategoryChange("loan")}
                  className={cn(
                    "gap-2",
                    activeCategory === "loan" && "bg-primary/5 text-primary",
                  )}
                >
                  <AlarmClock className="h-4 w-4" />
                  Loan Pipeline Flows
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCategoryChange("realtor_prospecting")}
                  className={cn(
                    "gap-2",
                    activeCategory === "realtor_prospecting" &&
                      "bg-primary/5 text-primary",
                  )}
                >
                  <Users className="h-4 w-4" />
                  Realtor Prospecting Flows
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
          description={
            activeCategory === "loan"
              ? "Build visual automation flows to keep clients engaged and on track with their tasks"
              : "Automate outreach and follow-ups for each realtor prospecting stage"
          }
          actions={
            <Button
              className="gap-2 self-start md:self-auto"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              New Flow
            </Button>
          }
        />

        {/* Tab switcher */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as any)}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="flows" className="gap-2">
              <Workflow className="h-4 w-4" />
              Flows
              {flows.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] h-4 px-1.5"
                >
                  {flows.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-2">
              <Activity className="h-4 w-4" />
              Executions
              {executions.filter((e) => e.status === "active").length > 0 && (
                <Badge className="ml-1 text-[10px] h-4 px-1.5 bg-emerald-500">
                  {executions.filter((e) => e.status === "active").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── FLOWS TAB ─────────────────────────────────────────── */}
          <TabsContent value="flows">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : flows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-5 rounded-2xl bg-primary/5 mb-4">
                  {activeCategory === "loan" ? (
                    <AlarmClock className="h-10 w-10 text-primary/60" />
                  ) : (
                    <Users className="h-10 w-10 text-primary/60" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {activeCategory === "loan"
                    ? "No reminder flows yet"
                    : "No realtor prospecting flows yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {activeCategory === "loan"
                    ? "Create your first flow to start automating client reminders based on pipeline events."
                    : "Create your first flow to automate outreach when a realtor prospect moves through each stage."}
                </p>
                <Button
                  className="mt-6 gap-2"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create First Flow
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {flows.map((flow) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    onEdit={() => handleEditFlow(flow.id)}
                    onToggle={() => handleToggleFlow(flow.id)}
                    onDelete={() => setDeleteFlowId(flow.id)}
                  />
                ))}
                {/* New Flow card */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="h-44 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-primary font-medium">
                    New Flow
                  </span>
                </button>
              </div>
            )}
          </TabsContent>

          {/* ── EXECUTIONS TAB ────────────────────────────────────── */}
          <TabsContent value="executions">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutList className="h-4 w-4 text-primary" />
                  Flow Executions
                </CardTitle>
                <CardDescription>
                  {activeCategory === "loan"
                    ? "Active and historical reminder flow executions per loan"
                    : "Active and historical realtor prospecting flow executions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataGrid<ReminderFlowExecution>
                  data={executions}
                  columns={executionColumns}
                  rowKey={(ex) => ex.id}
                  sortBy={execSortBy}
                  sortDir={execSortDir}
                  onSort={handleExecSort}
                  pagination={execPagination}
                  onPageChange={(page) =>
                    doFetchExec({
                      page,
                      sortBy: execSortBy,
                      sortOrder: execSortDir,
                      flow_category: activeCategory,
                    })
                  }
                  isLoading={isLoading}
                  emptyMessage={
                    activeCategory === "loan"
                      ? "No executions yet. Executions will appear here when flows start running for loans."
                      : "No executions yet. Executions will appear here when realtor prospecting flows start running."
                  }
                  mobileCard={(ex) => (
                    <div
                      key={ex.id}
                      className="rounded-lg border bg-card p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm">
                          {ex.flow_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            executionStatusColor[ex.status],
                          )}
                        >
                          {ex.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ex.client_name ?? "—"}
                        {ex.application_number ? (
                          <span className="ml-2 font-mono">
                            {ex.application_number}
                          </span>
                        ) : null}
                      </div>
                      {ex.current_step_key && (
                        <div className="text-xs font-mono text-muted-foreground">
                          Step: {ex.current_step_key}
                        </div>
                      )}
                      {ex.next_execution_at && (
                        <div className="text-xs text-muted-foreground">
                          Next run:{" "}
                          {new Date(ex.next_execution_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Flow Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeCategory === "loan" ? (
                <AlarmClock className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
              Create{" "}
              {activeCategory === "loan"
                ? "Reminder Flow"
                : "Realtor Prospecting Flow"}
            </DialogTitle>
            <DialogDescription>
              {activeCategory === "loan"
                ? "Set up a new automated reminder flow. You can add steps in the visual editor after creation."
                : "Set up a new flow to automate outreach when a realtor prospect moves to a stage."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Flow Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  activeCategory === "loan"
                    ? "e.g. Post-Application Follow-up"
                    : "e.g. Contact Attempted Outreach"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this flow do?"
                className="min-h-[70px] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Trigger Event</Label>
              <Select
                value={newTrigger}
                onValueChange={(v) => setNewTrigger(v as ReminderTriggerEvent)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeTriggerOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Start Flow After (days)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={newDelay}
                  onChange={(e) => setNewDelay(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  days after the trigger event
                </span>
              </div>
            </div>

            {/* Example preview */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Flow Preview
              </p>
              <p className="text-xs text-muted-foreground">
                When <strong>{triggerLabel(newTrigger)}</strong>
                {newDelay > 0 ? ` → wait ${newDelay} days →` : " →"} start flow
                steps
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFlow}
              disabled={!newName.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create & Edit Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteFlowId}
        onOpenChange={(o) => !o && setDeleteFlowId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder Flow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the flow and all its steps,
              connections, and active executions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Flow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReminderFlows;
