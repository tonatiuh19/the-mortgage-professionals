/**
 * PhoneNumbersPanel — full-height side-sheet for managing Twilio phone numbers.
 * Replaces the old Dialog so the list can grow to hundreds of numbers without
 * clipping or scroll issues.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  Phone,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Users,
  UserPlus,
  MessageSquare,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchPhoneNumbers as fetchPhoneNumbersThunk,
  assignPhoneNumber,
  configurePhoneNumber,
  fixCallSetup,
} from "@/store/slices/voiceSlice";

// ── Types ────────────────────────────────────────────────────────────────────

export type PhoneNumberEntry = {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceUrl: string;
  smsUrl: string;
  configured: boolean;
  smsConfigured: boolean;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
  assignedBrokerId: number | null;
  assignedBrokerName: string | null;
};

type BrokerOption = { id: number; name: string };

interface PhoneNumbersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken?: string | null;
}

// ── Component ─────────────────────────────────────────────────────

const PhoneNumbersPanel: React.FC<PhoneNumbersPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberEntry[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<BrokerOption[]>([]);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [isConfiguringAll, setIsConfiguringAll] = useState(false);
  const [configuringSid, setConfiguringSid] = useState<string | null>(null);
  const [assigningSid, setAssigningSid] = useState<string | null>(null);
  const [isSyncingCallSetup, setIsSyncingCallSetup] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadPhoneNumbers = useCallback(async () => {
    setIsLoadingNumbers(true);
    try {
      const data = await dispatch(fetchPhoneNumbersThunk()).unwrap();
      if (data.success) {
        setPhoneNumbers(data.numbers);
        if (data.brokers) setBrokerOptions(data.brokers);
      }
    } catch {
      // silent — user can retry via Refresh
    } finally {
      setIsLoadingNumbers(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (isOpen) loadPhoneNumbers();
  }, [isOpen, loadPhoneNumbers]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const assignNumber = async (sid: string, brokerId: number | null) => {
    setAssigningSid(sid);
    try {
      const data = await dispatch(assignPhoneNumber({ sid, brokerId })).unwrap();
      if (data.success) {
        toast({
          title: "Routing updated",
          description: brokerId
            ? "Number assigned to banker"
            : "Number set to shared (All Mortgage Bankers)",
        });
        await loadPhoneNumbers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to assign",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign number",
        variant: "destructive",
      });
    } finally {
      setAssigningSid(null);
    }
  };

  const configureNumber = async (sid: string) => {
    if (sid === "all") setIsConfiguringAll(true);
    else setConfiguringSid(sid);
    try {
      const data = await dispatch(configurePhoneNumber(sid)).unwrap();
      if (data.success) {
        toast({
          title: "Configured",
          description:
            sid === "all"
              ? `All ${data.updated} numbers configured`
              : "Number configured for incoming calls",
        });
        await loadPhoneNumbers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to configure",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to configure number",
        variant: "destructive",
      });
    } finally {
      setIsConfiguringAll(false);
      setConfiguringSid(null);
    }
  };

  const syncCallSetup = async () => {
    setIsSyncingCallSetup(true);
    try {
      const data = await dispatch(fixCallSetup()).unwrap();
      if (data.success) {
        toast({
          title: "Outbound calls ready",
          description: "Voice configuration synced — outbound calls are ready.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync voice configuration",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to sync voice configuration",
        variant: "destructive",
      });
    } finally {
      setIsSyncingCallSetup(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 space-y-4">
          <SheetHeader className="pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                Phone Numbers & Routing
              </SheetTitle>
              <button
                onClick={onClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure which Twilio numbers are active and who answers inbound
              calls.
            </p>
          </SheetHeader>

          {/* How routing works */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              How inbound call routing works
            </p>
            <p>
              <span className="font-medium">Shared (All Mortgage Bankers)</span>{" "}
              — rings every available banker simultaneously; first to answer
              wins.
            </p>
            <p>
              <span className="font-medium">Personal Line</span> — rings only
              the assigned banker exclusively, even if others are available.
            </p>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={loadPhoneNumbers}
              disabled={isLoadingNumbers}
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  isLoadingNumbers && "animate-spin",
                )}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={syncCallSetup}
              disabled={isSyncingCallSetup}
            >
              {isSyncingCallSetup ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-primary" />
              )}
              {isSyncingCallSetup ? "Syncing…" : "Sync Voice Config"}
            </Button>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 ml-auto"
                    onClick={() => configureNumber("all")}
                    disabled={isConfiguringAll || isLoadingNumbers}
                  >
                    {isConfiguringAll ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Configure All Webhooks
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[260px] text-xs text-center"
                >
                  Sets the Voice & SMS webhook URLs on every Twilio number to
                  point at this server. Run this when numbers show an amber
                  warning, or after deploying to a new domain.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ── Scrollable number list ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-3 pb-8">
            {isLoadingNumbers ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm">Loading numbers…</p>
                </div>
              </div>
            ) : phoneNumbers.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">
                No phone numbers found on your Twilio account.
              </div>
            ) : (
              phoneNumbers.map((num) => (
                <NumberCard
                  key={num.sid}
                  num={num}
                  brokerOptions={brokerOptions}
                  assigningSid={assigningSid}
                  configuringSid={configuringSid}
                  onAssign={assignNumber}
                  onConfigure={configureNumber}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

// ── NumberCard sub-component ───────────────────────────────────────────────────

interface NumberCardProps {
  num: PhoneNumberEntry;
  brokerOptions: BrokerOption[];
  assigningSid: string | null;
  configuringSid: string | null;
  onAssign: (sid: string, brokerId: number | null) => void;
  onConfigure: (sid: string) => void;
}

const NumberCard: React.FC<NumberCardProps> = ({
  num,
  brokerOptions,
  assigningSid,
  configuringSid,
  onAssign,
  onConfigure,
}) => {
  const isShared = !num.assignedBrokerId;
  const webhookReady = num.configured && num.smsConfigured;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-sm",
        webhookReady ? "border-border" : "border-amber-300",
      )}
    >
      {/* ── Number header ── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={cn(
            "p-2 rounded-full flex-shrink-0 mt-0.5",
            webhookReady ? "bg-green-100" : "bg-amber-100",
          )}
        >
          {webhookReady ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground tracking-wide">
              {num.phoneNumber}
            </p>
            {num.friendlyName && num.friendlyName !== num.phoneNumber && (
              <span className="text-xs text-muted-foreground">
                {num.friendlyName}
              </span>
            )}
          </div>
          {/* Capability badges */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {num.capabilities.voice && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5",
                  num.configured
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                <Phone className="h-2.5 w-2.5" />
                Voice {num.configured ? "✓" : "— not configured"}
              </span>
            )}
            {num.capabilities.sms && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5",
                  num.smsConfigured
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                <MessageSquare className="h-2.5 w-2.5" />
                SMS {num.smsConfigured ? "✓" : "— not configured"}
              </span>
            )}
            {num.capabilities.mms && (
              <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                MMS
              </span>
            )}
          </div>
        </div>
        {!webhookReady && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => onConfigure(num.sid)}
            disabled={configuringSid === num.sid}
          >
            {configuringSid === num.sid ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            Set up webhooks
          </Button>
        )}
      </div>

      {/* ── Routing section ── */}
      <div className="mx-4 mb-4 rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2.5 pb-1.5 border-b border-border/40">
          Inbound call routing
        </p>

        {/* Shared option */}
        <button
          onClick={() => (!isShared ? onAssign(num.sid, null) : undefined)}
          disabled={assigningSid === num.sid || isShared}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
            isShared
              ? "bg-blue-50 text-blue-800"
              : "hover:bg-muted/50 text-muted-foreground cursor-pointer",
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
              isShared ? "border-blue-500 bg-blue-500" : "border-border",
            )}
          >
            {isShared && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>
          <Users
            className={cn(
              "h-4 w-4 flex-shrink-0",
              isShared ? "text-blue-600" : "text-muted-foreground",
            )}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs font-semibold",
                isShared ? "text-blue-800" : "text-foreground",
              )}
            >
              All Mortgage Bankers
            </p>
            <p className="text-[10px] text-muted-foreground">
              Rings all available bankers simultaneously
            </p>
          </div>
          {isShared && (
            <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              Active
            </span>
          )}
        </button>

        <div className="h-px bg-border/40 mx-3" />

        {/* Personal line option */}
        <div
          className={cn(
            "px-3 py-2.5 transition-colors",
            !isShared ? "bg-indigo-50" : "hover:bg-muted/50",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                !isShared ? "border-indigo-500 bg-indigo-500" : "border-border",
              )}
            >
              {!isShared && (
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </div>
            <UserPlus
              className={cn(
                "h-4 w-4 flex-shrink-0",
                !isShared ? "text-indigo-600" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-semibold",
                  !isShared ? "text-indigo-800" : "text-foreground",
                )}
              >
                Personal Line — specific banker only
              </p>
              <p className="text-[10px] text-muted-foreground">
                Rings exclusively the selected banker
              </p>
            </div>
            {!isShared && (
              <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                Active
              </span>
            )}
          </div>

          {/* Broker picker — always visible so routing can be changed without extra click */}
          <div className="mt-2 ml-7 flex items-center gap-2">
            <Select
              value={num.assignedBrokerId?.toString() ?? ""}
              onValueChange={(val) => onAssign(num.sid, parseInt(val, 10))}
              disabled={assigningSid === num.sid}
            >
              <SelectTrigger
                className={cn(
                  "h-8 text-xs max-w-[240px]",
                  !isShared ? "border-indigo-300 bg-white" : "border-border",
                )}
              >
                <SelectValue placeholder="Select a banker…">
                  {assigningSid === num.sid ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving…
                    </span>
                  ) : num.assignedBrokerName ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {num.assignedBrokerName.charAt(0)}
                      </span>
                      {num.assignedBrokerName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select a banker…
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {brokerOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {b.name.charAt(0)}
                      </span>
                      {b.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneNumbersPanel;
