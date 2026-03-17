import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Link2,
  Copy,
  CheckCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  Share2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokerShareLink,
  fetchMyShareLink,
  clearBrokerShareLink,
} from "@/store/slices/brokersSlice";
import type { Broker } from "@shared/api";

interface BrokerShareLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: Broker | null;
  /** Set true when the logged-in partner is fetching their own link */
  useSelfEndpoint?: boolean;
}

export default function BrokerShareLinkModal({
  open,
  onOpenChange,
  broker,
  useSelfEndpoint = false,
}: BrokerShareLinkModalProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { brokerShareLink, shareLinkLoading } = useAppSelector(
    (state) => state.brokers,
  );

  useEffect(() => {
    if (open) {
      if (useSelfEndpoint) {
        dispatch(fetchMyShareLink());
      } else if (broker?.id) {
        dispatch(fetchBrokerShareLink(broker.id));
      }
    }
    if (!open) {
      setCopied(false);
      dispatch(clearBrokerShareLink());
    }
  }, [open, broker?.id, useSelfEndpoint, dispatch]);

  const handleCopy = async () => {
    if (!brokerShareLink?.share_url) return;
    await navigator.clipboard.writeText(brokerShareLink.share_url);
    setCopied(true);
    toast({ title: "Copied!", description: "Share link copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenInBrowser = () => {
    if (!brokerShareLink?.share_url) return;
    window.open(brokerShareLink.share_url, "_blank", "noopener,noreferrer");
  };

  const brokerName = broker
    ? `${broker.first_name} ${broker.last_name}`
    : "Broker";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-sm shrink-0">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">
                Client Application Link
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Share this link with clients to apply under{" "}
                <strong className="text-gray-700">{brokerName}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Broker identity card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-red-600" />
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
              <Link2 className="h-3.5 w-3.5" />
              Application Link
            </p>

            <AnimatePresence mode="wait">
              {shareLinkLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-6"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-red-500 mr-2" />
                  <span className="text-sm text-gray-500">
                    Loading share link…
                  </span>
                </motion.div>
              ) : brokerShareLink ? (
                <motion.div
                  key="link"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* URL display */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2.5 min-w-0">
                      <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <Input
                        value={brokerShareLink.share_url}
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

                  {/* Info note */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      When clients submit an application through this link, it
                      will be automatically associated with{" "}
                      <strong>{brokerName}</strong>.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-red-600 py-3"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Could not load share link. Please try again.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInBrowser}
            disabled={!brokerShareLink}
            className="gap-1.5 text-gray-600 hover:text-gray-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview Page
          </Button>
          <Button
            size="sm"
            onClick={handleCopy}
            disabled={!brokerShareLink || shareLinkLoading}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <CheckCheck className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
