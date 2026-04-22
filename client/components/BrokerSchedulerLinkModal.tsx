import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Copy,
  CheckCheck,
  ExternalLink,
  AlertCircle,
  User,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Broker } from "@shared/api";

interface BrokerSchedulerLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: Broker | null;
}

export default function BrokerSchedulerLinkModal({
  open,
  onOpenChange,
  broker,
}: BrokerSchedulerLinkModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const schedulerUrl = broker?.public_token
    ? `${window.location.origin}/scheduler/${broker.public_token}`
    : null;

  const brokerName = broker
    ? `${broker.first_name} ${broker.last_name}`
    : "Broker";

  const handleCopy = async () => {
    if (!schedulerUrl) return;
    await navigator.clipboard.writeText(schedulerUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Scheduler link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setCopied(false);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-sm shrink-0">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">
                Scheduler Booking Link
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Share this link so clients can book a consultation with{" "}
                <strong className="text-gray-700">{brokerName}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Broker identity card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
            <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {brokerName}
              </p>
              <p className="text-xs text-gray-500">{broker?.email}</p>
            </div>
            <div className="ml-auto">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  broker?.role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700",
                )}
              >
                {broker?.role === "admin" ? "Mortgage Banker" : "Partner"}
              </span>
            </div>
          </div>

          {/* Link section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Booking Link
            </p>

            {schedulerUrl ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* URL display */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2.5 min-w-0">
                    <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
                    <Input
                      value={schedulerUrl}
                      readOnly
                      className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0 cursor-text text-gray-700 truncate"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className={cn(
                      "shrink-0 gap-1.5 transition-all",
                      copied
                        ? "border-green-500 text-green-600 bg-green-50"
                        : "",
                    )}
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                {/* Open in browser */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() =>
                    window.open(schedulerUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview Booking Page
                </Button>

                {/* Info note */}
                <div className="flex items-start gap-2 p-3 bg-violet-50 rounded-lg border border-violet-100">
                  <AlertCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-700 leading-relaxed">
                    Clients who book through this link will be scheduled
                    directly with <strong>{brokerName}</strong> using their
                    personal availability and settings.
                  </p>
                </div>

                {/* Availability requirement note */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>{brokerName}</strong> must configure their weekly
                    availability in the Calendar → Settings tab. Without it, the
                    booking page will show no available dates.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-600 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                This broker has no public token. Generate one by editing the
                broker.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
