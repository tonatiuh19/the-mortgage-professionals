import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Home,
  X,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
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
  selectIsClientAuthenticated,
} from "@/store/slices/clientAuthSlice";

const ClientLogin = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const error = useAppSelector(selectClientAuthError);
  const shouldRedirect = useAppSelector(selectShouldRedirectToWizard);
  const isAuthenticated = useAppSelector(selectIsClientAuthenticated);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  // Redirect authenticated users to portal
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/portal");
    }
  }, [isAuthenticated, navigate]);

  // Handle redirect to wizard when client not found
  useEffect(() => {
    if (shouldRedirect) {
      dispatch(clearRedirectFlag());
      navigate("/wizard");
    }
  }, [shouldRedirect, navigate, dispatch]);

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
        navigate("/portal");
      }
    },
  });

  const handleBackToEmail = () => {
    setStep("email");
    codeFormik.resetForm();
    dispatch(clearClientError());
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Image/Brand */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop"
            alt="Modern home"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-20 left-20 h-96 w-96 rounded-full bg-white blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-white blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 group transition-transform hover:scale-105"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
                <Crown className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">
                The Mortgage Professionals
              </span>
            </button>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl font-bold leading-tight">
                Welcome Back to
                <br />
                Your Portal
              </h1>
              <p className="text-xl text-white/80 max-w-md leading-relaxed">
                Track your loan applications, complete tasks, and stay connected
                with your dedicated loan officer—all in one place.
              </p>
            </motion.div>

            {/* Feature Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-4 max-w-md"
            >
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                <div className="rounded-xl bg-white/20 p-2.5">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Bank-Level</p>
                  <p className="text-xs text-white/70">Security</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                <div className="rounded-xl bg-white/20 p-2.5">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Real-Time</p>
                  <p className="text-xs text-white/70">Updates</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                <div className="rounded-xl bg-white/20 p-2.5">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Easy</p>
                  <p className="text-xs text-white/70">Document Upload</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                <div className="rounded-xl bg-white/20 p-2.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Progress</p>
                  <p className="text-xs text-white/70">Tracking</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-8"
          >
            <div>
              <p className="text-3xl font-bold">2,500+</p>
              <p className="text-sm text-white/70">Happy Clients</p>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div>
              <p className="text-3xl font-bold">$500M+</p>
              <p className="text-sm text-white/70">Loans Funded</p>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div>
              <p className="text-3xl font-bold">4.9/5</p>
              <p className="text-sm text-white/70">Client Rating</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-black/[0.02] [mask-image:radial-gradient(white,transparent_85%)]" />

        {/* Floating Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 right-20 h-64 w-64 rounded-full bg-primary blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-20 left-20 h-64 w-64 rounded-full bg-primary blur-3xl"
        />

        {/* Back to Home Button */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-8 left-8 lg:hidden flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-4 shadow-lg shadow-primary/25 mb-6"
            >
              <Crown className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">
              {step === "email" ? "Client Portal Access" : "Verify Your Email"}
            </h2>
            <p className="text-muted-foreground">
              {step === "email"
                ? "Enter your email to access your loan applications"
                : "We've sent a code to protect your account"}
            </p>

            {/* Feature Pills */}
            {step === "email" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mt-6"
              >
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">Secure</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">Fast</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20">
                  <FileText className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">Track Progress</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Forms */}
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
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="relative pl-12 h-14 bg-background border-2 border-border/50 focus:border-primary/50 transition-all rounded-xl text-base"
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
                    onClick={() => navigate("/wizard")}
                  >
                    <TrendingUp className="mr-2 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    Get Pre-Approved in Minutes
                  </Button>
                </motion.div>

                {/* Trust Indicators */}
                <div className="flex items-center justify-center gap-6 pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span>Bank-level Security</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>No Hidden Fees</span>
                  </div>
                </div>
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
                  <div className="flex items-start gap-3">
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
                      className="relative h-20 text-center text-4xl font-mono font-bold tracking-[0.5em] bg-background border-2 border-border/50 focus:border-primary/50 transition-all rounded-2xl"
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
                  <div className="text-center pt-2">
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
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientLogin;
