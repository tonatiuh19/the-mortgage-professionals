import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Ban,
  Loader2,
  MessageSquareOff,
  PhoneOff,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { BlockNumberDialog } from "@/components/BlockNumberDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBlockedNumbers,
  unblockPhoneNumber,
} from "@/store/slices/blockedNumbersSlice";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { formatPhoneLabel } from "@shared/group-conversations";
import type { BlockedPhoneNumber } from "@shared/api";

const timeAgo = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : formatDistanceToNow(d, { addSuffix: true });
};

/** Blocked phone numbers manager (admin roles). Used in Settings. */
export function BlockedNumbersCard({ canEdit }: { canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { items, loading, loaded, removingId, error } = useAppSelector(
    (s) => s.blockedNumbers,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<BlockedPhoneNumber | null>(null);

  useEffect(() => {
    if (canEdit) dispatch(fetchBlockedNumbers());
  }, [dispatch, canEdit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const qDigits = q.replace(/\D/g, "");
    return items.filter(
      (b) =>
        (qDigits && b.normalized_phone.includes(qDigits)) ||
        (b.reason ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const handleUnblock = async () => {
    if (!confirm) return;
    const target = confirm;
    setConfirm(null);
    try {
      await dispatch(unblockPhoneNumber(target.id)).unwrap();
      toast({
        title: "Number unblocked",
        description: `${formatPhoneLabel(target.phone_e164)} can reach your lines again.`,
      });
    } catch (err) {
      logger.error("Unblock number failed:", err);
      toast({
        title: "Couldn't unblock number",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Only admins can view and manage blocked numbers.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number or reason"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => dispatch(fetchBlockedNumbers())}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="flex-1 gap-2 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Block a number
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && !loaded ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-10 text-center"
        >
          <ShieldOff className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground/80">
            {items.length === 0 ? "No blocked numbers" : "No matches"}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {items.length === 0
              ? "Block spam or robocall numbers so they never ring your lines or land in Conversations."
              : "Try a different number or reason."}
          </p>
        </motion.div>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
          <AnimatePresence initial={false}>
            {filtered.map((b) => {
              const attempts = b.blocked_call_count + b.blocked_sms_count;
              const lastHit = timeAgo(b.last_blocked_at);
              return (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                      <Ban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {formatPhoneLabel(b.phone_e164)}
                        </span>
                        {b.block_calls && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px]"
                          >
                            <PhoneOff className="h-3 w-3" /> Calls
                          </Badge>
                        )}
                        {b.block_sms && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px]"
                          >
                            <MessageSquareOff className="h-3 w-3" /> Texts
                          </Badge>
                        )}
                      </div>
                      {b.reason && (
                        <p className="truncate text-xs text-foreground/70">
                          {b.reason}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Blocked {timeAgo(b.created_at) ?? ""}
                        {b.blocked_by_name ? ` by ${b.blocked_by_name}` : ""}
                        {attempts > 0
                          ? ` · ${attempts} attempt${attempts === 1 ? "" : "s"} stopped${lastHit ? `, last ${lastHit}` : ""}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 self-end text-muted-foreground hover:text-foreground sm:self-auto"
                    onClick={() => setConfirm(b)}
                    disabled={removingId === b.id}
                  >
                    {removingId === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" />
                    )}
                    Unblock
                  </Button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <BlockNumberDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unblock {confirm ? formatPhoneLabel(confirm.phone_e164) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Calls and texts from this number will reach your lines again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BlockedNumbersCard;
