import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Shield,
  FileText,
  TrendingUp,
  Zap,
  Crown,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  sendClientCode,
  verifyClientCode,
  clearClientError,
  clearRedirectFlag,
  selectClientAuthError,
  selectShouldRedirectToWizard,
} from "@/store/slices/clientAuthSlice";

interface ClientLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClientLoginModal: React.FC<ClientLoginModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const error = useAppSelector(selectClientAuthError);
  const shouldRedirect = useAppSelector(selectShouldRedirectToWizard);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  // Handle redirect to wizard when client not found
  useEffect(() => {
    if (shouldRedirect) {
      onClose();
      dispatch(clearRedirectFlag());
      navigate("/wizard");
    }
  }, [shouldRedirect, navigate, onClose, dispatch]);

  // Email form validation
  const emailFormik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
    }),
    onSubmit: async (values) => {
      setEmail(values.email);
      const result = await dispatch(sendClientCode({ email: values.email }));

      if (sendClientCode.fulfilled.match(result)) {
        // If not redirecting to wizard, show code input
        if (!shouldRedirect) {
          setStep("code");
        }
      }
    },
  });

  // Code verification form validation
  const codeFormik = useFormik({
    initialValues: {
      code: "",
    },
    validationSchema: Yup.object({
      code: Yup.string()
        .matches(/^\d{6}$/, "Code must be 6 digits")
        .required("Verification code is required"),
    }),
    onSubmit: async (values) => {
      const result = await dispatch(
        verifyClientCode({ email, code: values.code }),
      );

      if (verifyClientCode.fulfilled.match(result)) {
        onClose();
        navigate("/portal");
      }
    },
  });

  const handleClose = () => {
    setStep("email");
    emailFormik.resetForm();
    codeFormik.resetForm();
    dispatch(clearClientError());
    onClose();
  };

  const handleBackToEmail = () => {
    setStep("email");
    codeFormik.resetForm();
    dispatch(clearClientError());
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-none bg-gradient-to-br from-background via-primary/5 to-background">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:radial-gradient(white,transparent_85%)]" />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 pb-6">
            <div className="absolute inset-0 bg-grid-white/5" />

            {/* Floating particles */}
            <motion.div
              animate={{
                y: [-10, 10],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-6 right-20"
            >
              <Sparkles className="h-4 w-4 text-primary/40" />
            </motion.div>

            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-2 transition-all hover:bg-white/10 hover:rotate-90 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative space-y-3">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-3 shadow-lg shadow-primary/20"
                >
                  <Crown className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    My Applications
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Secure Client Portal Access
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {step === "email"
                  ? "Access your personalized dashboard to track loan applications, complete tasks, and connect with your loan officer."
                  : "We've sent a secure verification code to protect your account."}
              </p>

              {/* Feature Pills */}
              {step === "email" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap gap-2 pt-2"
                >
                  <div className="flex items-center gap-1.5 rounded-full bg-background/50 backdrop-blur-sm px-3 py-1 border border-primary/10">
                    <Shield className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-background/50 backdrop-blur-sm px-3 py-1 border border-primary/10">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Fast Access</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-background/50 backdrop-blur-sm px-3 py-1 border border-primary/10">
                    <FileText className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Track Progress</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="relative p-8 pt-6">
            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={emailFormik.handleSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4 text-primary" />
                      Email Address
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity" />
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="relative pl-12 h-14 bg-background/60 backdrop-blur-md border-2 border-border/50 focus:border-primary/50 transition-all rounded-xl text-base"
                        {...emailFormik.getFieldProps("email")}
                      />
                    </div>
                    {emailFormik.touched.email && emailFormik.errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive flex items-center gap-1.5"
                      >
                        <div className="h-1 w-1 rounded-full bg-destructive" />
                        {emailFormik.errors.email}
                      </motion.p>
                    )}
                  </div>

                  {error && !shouldRedirect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Alert
                        variant="destructive"
                        className="border-destructive/50 bg-destructive/10"
                      >
                        <AlertDescription className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                          {error}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all text-base font-semibold"
                      disabled={emailFormik.isSubmitting}
                    >
                      {emailFormik.isSubmitting ? (
                        <>
                          <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Sending secure code...
                        </>
                      ) : (
                        <>
                          Continue to Portal
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-4 text-muted-foreground font-medium">
                        New to The Mortgage Professionals?
                      </span>
                    </div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-14 border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all group text-base font-semibold"
                      onClick={() => {
                        handleClose();
                        navigate("/wizard");
                      }}
                    >
                      <TrendingUp className="mr-2 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                      Get Pre-Approved in Minutes
                    </Button>
                  </motion.div>

                  {/* Trust Indicators */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-6 pt-2"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span>Bank-level Security</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>No Hidden Fees</span>
                    </div>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form
                  key="code-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={codeFormik.handleSubmit}
                  className="space-y-6"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/20"
                  >
                    <div className="absolute inset-0 bg-grid-white/5" />
                    <div className="relative flex items-start gap-3">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="rounded-xl bg-gradient-to-br from-primary to-primary/60 p-2.5 shadow-lg shadow-primary/20"
                      >
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </motion.div>
                      <div className="space-y-1.5 text-sm flex-1">
                        <p className="font-bold text-foreground flex items-center gap-2">
                          Code Sent Successfully!
                          <Sparkles className="h-4 w-4 text-primary" />
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                          We sent a 6-digit verification code to{" "}
                          <span className="font-semibold text-foreground px-1.5 py-0.5 rounded bg-primary/10">
                            {email}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                          <Lock className="h-3 w-3" />
                          Expires in 10 minutes
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="code"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4 text-primary" />
                      Enter Verification Code
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/30 to-primary/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="• • • • • •"
                        maxLength={6}
                        className="relative h-20 text-center text-4xl font-mono font-bold tracking-[0.5em] bg-background/60 backdrop-blur-md border-2 border-border/50 focus:border-primary/50 transition-all rounded-2xl"
                        {...codeFormik.getFieldProps("code")}
                      />
                    </div>
                    {codeFormik.touched.code && codeFormik.errors.code && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive flex items-center gap-1.5"
                      >
                        <div className="h-1 w-1 rounded-full bg-destructive" />
                        {codeFormik.errors.code}
                      </motion.p>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Alert
                        variant="destructive"
                        className="border-destructive/50 bg-destructive/10"
                      >
                        <AlertDescription className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                          {error}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className="w-full h-16 bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all text-lg font-bold"
                        disabled={codeFormik.isSubmitting}
                      >
                        {codeFormik.isSubmitting ? (
                          <>
                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                            Verifying your code...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-5 w-5" />
                            Access My Portal
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </motion.div>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-12 hover:bg-primary/5 text-base"
                      onClick={handleBackToEmail}
                    >
                      ← Back to Email
                    </Button>

                    {/* Resend Code */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-center pt-2"
                    >
                      <p className="text-xs text-muted-foreground">
                        Didn't receive the code?{" "}
                        <button
                          type="button"
                          onClick={() => emailFormik.handleSubmit()}
                          className="text-primary hover:underline font-semibold"
                        >
                          Resend Code
                        </button>
                      </p>
                    </motion.div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientLoginModal;
