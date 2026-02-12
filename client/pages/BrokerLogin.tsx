import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  ArrowRight,
  Lock,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  sendVerificationCode,
  verifyCode,
  clearError,
} from "@/store/slices/brokerAuthSlice";
import { MetaHelmet } from "@/components/MetaHelmet";
import { authPageMeta } from "@/lib/seo-helpers";

export default function BrokerLogin() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(
    (state) => state.brokerAuth,
  );

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin");
    }
  }, [isAuthenticated, navigate]);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setEmailError("");

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    const result = await dispatch(sendVerificationCode(trimmedEmail));

    if (sendVerificationCode.fulfilled.match(result)) {
      setSuccess("Verification code sent to your email");
      setStep("code");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await dispatch(
      verifyCode({ email: email.trim().toLowerCase(), code: code.trim() }),
    );

    if (verifyCode.fulfilled.match(result)) {
      navigate("/admin");
    }
  };

  return (
    <>
      <MetaHelmet {...authPageMeta("Broker Login")} />
      <div className="h-screen w-full flex overflow-hidden">
        {/* Left Column - Colored Background with Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-700"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-16 py-12 text-primary-foreground">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-6">
                <img
                  src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
                  alt="The Mortgage Professionals CRM"
                  className="h-16 w-auto filter brightness-0 invert"
                />
              </div>

              <p className="text-xl text-primary-foreground/90 mb-12 leading-relaxed">
                Your powerful dashboard to manage clients, track applications,
                and close deals faster.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4 group">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Bank-Level Security
                  </h3>
                  <p className="text-primary-foreground/80">
                    Passwordless authentication with end-to-end encryption
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Real-Time Insights
                  </h3>
                  <p className="text-primary-foreground/80">
                    Track your pipeline and performance metrics instantly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Quick Access</h3>
                  <p className="text-primary-foreground/80">
                    Sign in with just your email - no passwords needed
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Column - White Background with Form */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            {/* Logo for mobile */}
            <div className="lg:hidden mb-8 text-center">
              <img
                src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
                alt="The Mortgage Professionals CRM"
                className="h-12 w-auto mx-auto mb-2"
              />
              <p className="text-muted-foreground mt-2">Broker Portal</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {step === "email" ? "Sign In" : "Verify Code"}
              </h2>
              <p className="text-gray-600">
                {step === "email"
                  ? "Enter your broker email to get started"
                  : "Check your email for the verification code"}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email Validation Error */}
            {emailError && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{emailError}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="mb-6 bg-green-50 text-green-900 border-green-200">
                <AlertDescription className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {step === "email" ? (
              <form onSubmit={handleSendCode} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="broker@themortgageprofessionals.net"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      className="pl-11 h-12 text-base"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base shadow-lg transition-all duration-300"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>

                <p className="text-sm text-gray-500 text-center pt-4">
                  Don't have access?{" "}
                  <a
                    href="/"
                    className="text-primary hover:text-primary/80 font-semibold hover:underline"
                  >
                    Contact Support
                  </a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="code"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Verification Code
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="code"
                      type="text"
                      placeholder="000000"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="pl-11 h-16 text-3xl font-bold tracking-[0.5em] text-center"
                      required
                      disabled={loading}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center pt-1">
                    Code sent to{" "}
                    <span className="font-semibold text-gray-700">{email}</span>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base shadow-lg transition-all duration-300"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-12 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    dispatch(clearError());
                    setSuccess("");
                  }}
                  disabled={loading}
                >
                  ← Use different email
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
