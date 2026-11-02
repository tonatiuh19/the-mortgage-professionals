import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { Ban, Loader2, MessageSquareOff, PhoneOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { blockPhoneNumber } from "@/store/slices/blockedNumbersSlice";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { formatPhoneLabel } from "@shared/group-conversations";
import type { BlockedPhoneNumber } from "@shared/api";

export const blockNumberSchema = Yup.object({
  phone: Yup.string()
    .trim()
    .required("Phone number is required")
    .test("digits", "Enter a valid phone number", (v) => {
      const n = (v ?? "").replace(/\D/g, "").length;
      return n >= 10 && n <= 15;
    }),
  reason: Yup.string().trim().max(255, "Keep it under 255 characters"),
  block_calls: Yup.boolean(),
  block_sms: Yup.boolean().test(
    "one-channel",
    "Block calls, texts, or both",
    function (v) {
      return !!v || !!this.parent.block_calls;
    },
  ),
  close_conversation: Yup.boolean(),
});

interface BlockNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills (and locks) the number, e.g. when opened from a conversation. */
  phone?: string | null;
  /** Display name for the contact, shown in the title. */
  contactName?: string | null;
  /** Shows the "Also close this conversation" option. */
  offerCloseConversation?: boolean;
  onBlocked?: (
    blocked: BlockedPhoneNumber,
    opts: { closeConversation: boolean },
  ) => void;
}

/** Reusable "block this number" dialog — Settings and Conversations. */
export function BlockNumberDialog({
  open,
  onOpenChange,
  phone,
  contactName,
  offerCloseConversation = false,
  onBlocked,
}: BlockNumberDialogProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const saving = useAppSelector((s) => s.blockedNumbers.saving);
  const phoneLocked = !!phone;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      phone: phone ?? "",
      reason: "",
      block_calls: true,
      block_sms: true,
      close_conversation: offerCloseConversation,
    },
    validationSchema: blockNumberSchema,
    onSubmit: async (values, helpers) => {
      try {
        const blocked = await dispatch(
          blockPhoneNumber({
            phone: values.phone.trim(),
            reason: values.reason.trim() || null,
            block_calls: values.block_calls,
            block_sms: values.block_sms,
          }),
        ).unwrap();
        toast({
          title: "Number blocked",
          description: `${formatPhoneLabel(blocked.phone_e164)} can no longer reach your lines.`,
        });
        onBlocked?.(blocked, {
          closeConversation:
            offerCloseConversation && values.close_conversation,
        });
        helpers.resetForm();
        onOpenChange(false);
      } catch (err) {
        logger.error("Block number failed:", err);
        toast({
          title: "Couldn't block number",
          description: String(err),
          variant: "destructive",
        });
      }
    },
  });

  const channelError =
    formik.submitCount > 0
      ? (formik.errors.block_sms as string | undefined)
      : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) formik.resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100"
            >
              <Ban className="h-5 w-5" />
            </motion.div>
            <div className="min-w-0">
              <DialogTitle className="truncate">
                Block{" "}
                {contactName || (phone ? formatPhoneLabel(phone) : "a number")}
              </DialogTitle>
              <DialogDescription>
                Applies to every line. You can unblock it anytime in
                Settings.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="block-phone">Phone number</Label>
            <Input
              id="block-phone"
              name="phone"
              inputMode="tel"
              placeholder="(562) 555-0100"
              value={
                phoneLocked
                  ? formatPhoneLabel(formik.values.phone)
                  : formik.values.phone
              }
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={phoneLocked}
              aria-invalid={!!(formik.touched.phone && formik.errors.phone)}
            />
            {formik.touched.phone && formik.errors.phone && (
              <p className="text-xs text-destructive">{formik.errors.phone}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
              <span className="flex items-center gap-2 text-sm font-medium">
                <PhoneOff className="h-4 w-4 text-muted-foreground" />
                Calls
              </span>
              <Switch
                aria-label="Block calls"
                checked={formik.values.block_calls}
                onCheckedChange={(v) => formik.setFieldValue("block_calls", v)}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
              <span className="flex items-center gap-2 text-sm font-medium">
                <MessageSquareOff className="h-4 w-4 text-muted-foreground" />
                Texts
              </span>
              <Switch
                aria-label="Block texts"
                checked={formik.values.block_sms}
                onCheckedChange={(v) => formik.setFieldValue("block_sms", v)}
              />
            </label>
          </div>
          {channelError && (
            <p className="-mt-2 text-xs text-destructive">{channelError}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="block-reason">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="block-reason"
              name="reason"
              rows={2}
              placeholder="e.g. Robocall — fake business listing"
              value={formik.values.reason}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.reason && formik.errors.reason && (
              <p className="text-xs text-destructive">{formik.errors.reason}</p>
            )}
          </div>

          {offerCloseConversation && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
              <Checkbox
                checked={formik.values.close_conversation}
                onCheckedChange={(v) =>
                  formik.setFieldValue("close_conversation", v === true)
                }
              />
              Also close this conversation
            </label>
          )}

          <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            Blocked calls hear a busy signal and never ring or leave voicemail.
            Blocked texts are discarded. Replies of STOP / START are still
            honored.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              Block number
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default BlockNumberDialog;
