import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Link2,
  Copy,
  CheckCheck,
  Mail,
  Loader2,
  AlertCircle,
  ExternalLink,
  Share2,
  RefreshCw,
  Send,
  ChevronRight,
  User,
  PenLine,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMyShareLink,
  regenerateShareLink,
  sendShareLinkEmail,
  clearShareLinkError,
} from "@/store/slices/applicationWizardSlice";

interface ShareLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "link" | "email";

const emailSchema = Yup.object({
  client_email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  client_name: Yup.string(),
  message: Yup.string().max(500, "Message too long (max 500 characters)"),
});

export default function ShareLinkModal({
  open,
  onOpenChange,
}: ShareLinkModalProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const {
    shareLink,
    shareToken,
    shareLinkLoading,
    shareLinkError,
    sendingShareEmail,
    sendShareEmailError,
  } = useAppSelector((state) => state.applicationWizard);

  const [activeTab, setActiveTab] = useState<TabType>("link");
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Fetch share link on open
  useEffect(() => {
    if (open) {
      dispatch(fetchMyShareLink());
      setActiveTab("link");
      setEmailSent(false);
    }
  }, [open, dispatch]);

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    setShowRegenerateConfirm(false);
    const result = await dispatch(regenerateShareLink());
    if (regenerateShareLink.fulfilled.match(result)) {
      toast({
        title: "Link regenerated",
        description:
          "Your new share link is ready. The old link is now invalid.",
      });
    }
  };

  const emailFormik = useFormik({
    initialValues: {
      client_email: "",
      client_name: "",
      message: "",
    },
    validationSchema: emailSchema,
    onSubmit: async (values, { resetForm }) => {
      const result = await dispatch(
        sendShareLinkEmail({
          client_email: values.client_email,
          client_name: values.client_name || undefined,
          message: values.message || undefined,
        }),
      );
      if (sendShareLinkEmail.fulfilled.match(result)) {
        setEmailSent(true);
        toast({
          title: "Email sent!",
          description: `Share link sent to ${values.client_email}`,
        });
        setTimeout(() => {
          setEmailSent(false);
          resetForm();
        }, 3000);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to send",
          description: sendShareEmailError || "Could not send email",
        });
      }
    },
  });

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: "link",
      label: "Copy & Share",
      icon: <Link2 className="h-4 w-4" />,
    },
    {
      id: "email",
      label: "Send via Email",
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[520px] p-0 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        {/* ── Accent top bar ── */}
        <div className="h-1 w-full bg-primary rounded-t-2xl" />

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Share2 className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-gray-900 leading-tight">
                  Your Application Link
                </DialogTitle>
                <DialogDescription className="text-[11px] text-gray-400 mt-0.5">
                  Clients apply via this link — no sign-up needed
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* ── Tab switcher ── */}
          <div className="flex gap-0 border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 pb-3 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-gray-400 hover:text-gray-600",
                )}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tabline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 overflow-x-hidden">
          <AnimatePresence mode="wait">
            {/* ── Copy & Share Tab ── */}
            {activeTab === "link" && (
              <motion.div
                key="link"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {shareLinkLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <p className="text-xs text-gray-400">Loading your link…</p>
                  </div>
                ) : shareLinkError ? (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {shareLinkError}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Link card */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      {/* URL row */}
                      <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-3 border-b border-gray-200">
                        <Link2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="flex-1 text-[11px] text-gray-500 font-mono truncate">
                          {shareLink}
                        </span>
                      </div>
                      {/* Action row */}
                      <div className="flex divide-x divide-gray-100 bg-white">
                        <button
                          onClick={handleCopy}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all",
                            copied
                              ? "bg-green-500 text-white"
                              : "text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          {copied ? (
                            <>
                              <CheckCheck className="h-3.5 w-3.5" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Copy Link
                            </>
                          )}
                        </button>
                        <a
                          href={shareLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Preview
                        </a>
                        <button
                          onClick={() => setShowRegenerateConfirm(true)}
                          disabled={shareLinkLoading}
                          title="Regenerate link"
                          className="flex items-center justify-center px-4 py-2.5 text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Regenerate confirmation */}
                    <AnimatePresence>
                      {showRegenerateConfirm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                            <p className="text-xs font-semibold text-amber-800 mb-1">
                              ⚠️ Replace your current link?
                            </p>
                            <p className="text-xs text-amber-700 mb-3">
                              The old link will stop working immediately.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => setShowRegenerateConfirm(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-amber-600 hover:bg-amber-700"
                                onClick={handleRegenerate}
                                disabled={shareLinkLoading}
                              >
                                {shareLinkLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Yes, regenerate"
                                )}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* How it works — horizontal flow */}
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
                      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-3">
                        How it works
                      </p>
                      {/* 2×2 grid on mobile, single row on sm+ */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4 sm:gap-y-0 sm:relative">
                        <div className="hidden sm:block absolute top-3 left-[12px] right-[12px] h-px bg-gray-200" />
                        {(
                          [
                            {
                              icon: <Link2 className="h-3 w-3" />,
                              text: "Client opens your link",
                            },
                            {
                              icon: <User className="h-3 w-3" />,
                              text: "Sees your profile",
                            },
                            {
                              icon: <PenLine className="h-3 w-3" />,
                              text: "Fills out wizard",
                            },
                            {
                              icon: <Inbox className="h-3 w-3" />,
                              text: "Lands in pipeline",
                            },
                          ] as { icon: React.ReactNode; text: string }[]
                        ).map((step, i) => (
                          <div
                            key={i}
                            className="relative z-10 flex flex-col items-center gap-1.5 text-center"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-primary">
                              {step.icon}
                            </div>
                            <p className="text-[10px] text-gray-400 leading-tight px-1">
                              {step.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Email CTA */}
                    <button
                      onClick={() => setActiveTab("email")}
                      className="w-full flex items-center justify-between rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-3 hover:bg-primary/[0.06] hover:border-primary/40 transition-colors group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-gray-700">
                            Send directly to a client
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            We'll email the link on your behalf
                          </p>
                        </div>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Email Tab ── */}
            {activeTab === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <AnimatePresence mode="wait">
                  {emailSent ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12 gap-3 text-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
                        <CheckCheck className="h-7 w-7 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Email sent!
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Share link delivered to{" "}
                          <span className="font-medium text-gray-700">
                            {emailFormik.values.client_email}
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onSubmit={emailFormik.handleSubmit}
                      className="space-y-3.5"
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="client_email"
                          className="text-xs font-semibold text-gray-600"
                        >
                          Client Email <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="client_email"
                          type="email"
                          placeholder="client@example.com"
                          {...emailFormik.getFieldProps("client_email")}
                          className={cn(
                            "h-9 text-sm",
                            emailFormik.touched.client_email &&
                              emailFormik.errors.client_email
                              ? "border-red-400 focus-visible:ring-red-400"
                              : "",
                          )}
                        />
                        {emailFormik.touched.client_email &&
                          emailFormik.errors.client_email && (
                            <p className="text-xs text-red-500">
                              {emailFormik.errors.client_email}
                            </p>
                          )}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="client_name"
                          className="text-xs font-semibold text-gray-600"
                        >
                          Client Name{" "}
                          <span className="text-gray-400 font-normal">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          id="client_name"
                          placeholder="John Doe"
                          className="h-9 text-sm"
                          {...emailFormik.getFieldProps("client_name")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="message"
                          className="text-xs font-semibold text-gray-600"
                        >
                          Personal Message{" "}
                          <span className="text-gray-400 font-normal">
                            (optional)
                          </span>
                        </Label>

                        {/* Suggestion chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Hi! I've set up a quick application link for you. Feel free to fill it out at your convenience.",
                            "Ready to get started? Click the link to begin your mortgage application — it only takes a few minutes.",
                            "I'd love to help you secure the best rate. Use this link to submit your details and I'll be in touch shortly.",
                            "Great chatting with you! Here's your personalized application link to get the process started.",
                          ].map((suggestion, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                emailFormik.setFieldValue("message", suggestion)
                              }
                              className={cn(
                                "text-[10px] px-2.5 py-1 rounded-full border transition-all",
                                emailFormik.values.message === suggestion
                                  ? "bg-primary text-white border-primary"
                                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                              )}
                            >
                              #{i + 1} Suggestion
                            </button>
                          ))}
                        </div>

                        <Textarea
                          id="message"
                          placeholder="Write your own message or pick a suggestion above…"
                          rows={3}
                          {...emailFormik.getFieldProps("message")}
                          className={cn(
                            "resize-none text-sm",
                            emailFormik.touched.message &&
                              emailFormik.errors.message
                              ? "border-red-400 focus-visible:ring-red-400"
                              : "",
                          )}
                        />
                        {emailFormik.touched.message &&
                          emailFormik.errors.message && (
                            <p className="text-xs text-red-500">
                              {emailFormik.errors.message}
                            </p>
                          )}
                        <p className="text-[10px] text-gray-400 text-right">
                          {emailFormik.values.message.length}/500
                        </p>
                      </div>

                      {sendShareEmailError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {sendShareEmailError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full gap-2 h-9"
                        disabled={
                          sendingShareEmail ||
                          !emailFormik.isValid ||
                          !emailFormik.dirty
                        }
                      >
                        {sendingShareEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" /> Send Share Link
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
