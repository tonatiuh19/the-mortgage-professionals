import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { MetaHelmet } from "@/components/MetaHelmet";
import { applicationPageMeta } from "@/lib/seo-helpers";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Home,
  User,
  Briefcase,
  ShieldCheck,
  Upload,
  FileUp,
  FileText,
  X,
  CreditCard,
  DollarSign,
  Building2,
  Lock as LockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Identity", icon: <User className="h-5 w-5" /> },
  { id: 2, title: "Property", icon: <Home className="h-5 w-5" /> },
  { id: 3, title: "Finances", icon: <DollarSign className="h-5 w-5" /> },
  { id: 4, title: "Employment", icon: <Briefcase className="h-5 w-5" /> },
  { id: 5, title: "Documents", icon: <Upload className="h-5 w-5" /> },
  { id: 6, title: "Finish", icon: <ShieldCheck className="h-5 w-5" /> },
];

const ApplicationWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const nextStep = () => {
    if (currentStep === STEPS.length) {
      navigate("/portal");
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background overflow-y-auto">
      {/* Immersive Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                NexusBroker
              </span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              Loan Application Wizard
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Progress
          value={(currentStep / STEPS.length) * 100}
          className="h-1 rounded-none bg-primary/10"
        />
      </header>

      <div className="flex-1 flex flex-col">
        <div className="container max-w-5xl py-12 md:py-20 flex-1 flex flex-col">
          <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
            {/* Sidebar Steps */}
            <aside className="hidden lg:block space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary/60">
                  Application Steps
                </h3>
                <p className="text-xs text-muted-foreground">
                  Please fill in all details accurately to ensure a smooth
                  processing of your loan.
                </p>
              </div>
              <nav className="space-y-4">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-4 transition-all",
                      currentStep === step.id ? "translate-x-2" : "opacity-60",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                        currentStep === step.id
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : currentStep > step.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted",
                      )}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        currentStep === step.id
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className="mb-2 text-primary border-primary/20 bg-primary/5"
                    >
                      Step {currentStep} of {STEPS.length}
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight">
                      {STEPS[currentStep - 1].title}
                    </h2>
                    <p className="text-muted-foreground">
                      Provide your details to continue the application.
                    </p>
                  </div>

                  <div className="rounded-3xl border bg-card p-8 md:p-12 shadow-sm">
                    {currentStep === 1 && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            placeholder="Jane"
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            placeholder="Doe"
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="jane@example.com"
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(555) 000-0000"
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address">Current Home Address</Label>
                          <Input
                            id="address"
                            placeholder="123 Main St, Apartment 4B"
                            className="h-12 rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="loanType">Loan Purpose</Label>
                          <select className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option>Home Purchase</option>
                            <option>Refinance</option>
                            <option>Home Equity</option>
                            <option>Investment Property</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">
                            Estimated Property Value
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="amount"
                              type="number"
                              placeholder="500,000"
                              className="h-12 rounded-xl pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="propertyType">Property Type</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              className="h-20 flex-col gap-2 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5"
                            >
                              <Home className="h-5 w-5" />
                              <span className="text-xs">Single Family</span>
                            </Button>
                            <Button
                              variant="outline"
                              className="h-20 flex-col gap-2 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5"
                            >
                              <Building2 className="h-5 w-5" />
                              <span className="text-xs">Multi Family</span>
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="downPayment">
                            Planned Down Payment
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="downPayment"
                              type="number"
                              placeholder="100,000"
                              className="h-12 rounded-xl pl-9"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="grid gap-6">
                        <div className="space-y-4">
                          <Label>Annual Household Income</Label>
                          <Input
                            type="range"
                            min="30000"
                            max="500000"
                            step="5000"
                            className="accent-primary"
                          />
                          <div className="flex justify-between text-xs font-bold text-primary">
                            <span>$30k</span>
                            <span>$500k+</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Credit Score Range</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {["740+", "680-739", "<680"].map((score) => (
                              <Button
                                key={score}
                                variant="outline"
                                className="h-12 rounded-xl border-2"
                              >
                                {score}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 5 && (
                      <div className="space-y-6">
                        <div className="rounded-3xl border-2 border-dashed border-primary/20 p-10 text-center transition-colors hover:bg-primary/5">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                            <FileUp className="h-8 w-8 text-primary" />
                          </div>
                          <h4 className="mb-2 text-lg font-bold">
                            Secure Document Upload
                          </h4>
                          <p className="text-sm text-muted-foreground mb-6">
                            Drag and drop files here, or click to browse. We
                            accept PDF, JPG, and PNG.
                          </p>
                          <Button size="lg" className="rounded-xl px-8">
                            Select Files
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            "W-2 Form (2023)",
                            "Bank Statement (Last 60 days)",
                            "Valid Government ID",
                          ].map((doc) => (
                            <div
                              key={doc}
                              className="flex items-center justify-between rounded-xl border bg-muted/30 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium">
                                  {doc}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-background text-[10px]"
                              >
                                Required
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Placeholder for other steps */}
                    {[4, 6].includes(currentStep) && (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-10">
                        <div className="rounded-full bg-primary/5 p-8 animate-pulse">
                          <div className="h-12 w-12 text-primary">
                            {STEPS[currentStep - 1].icon}
                          </div>
                        </div>
                        <div className="max-w-md">
                          <h3 className="text-2xl font-bold">
                            {STEPS[currentStep - 1].title}
                          </h3>
                          <p className="text-muted-foreground mt-4 leading-relaxed">
                            {currentStep === 6
                              ? "You're all set! Click submit to send your application to our brokers. We'll get back to you within 24 hours."
                              : "Continue prompting to refine the specific fields for this step. We're capturing every detail for a perfect loan application."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="rounded-xl text-muted-foreground"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </Button>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate("/")}
                        className="rounded-xl hidden sm:flex"
                      >
                        Save for later
                      </Button>
                      <Button
                        size="lg"
                        onClick={nextStep}
                        className="rounded-xl px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                      >
                        {currentStep === STEPS.length
                          ? "Submit Application"
                          : "Continue"}{" "}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        {/* Immersive Footer */}
        <footer className="border-t bg-muted/30 py-6">
          <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> SOC2
                Compliant
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <LockIcon className="h-3 w-3 text-emerald-500" /> 256-bit
                Encryption
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              © 2024 NexusBroker Financial Services
            </p>
          </div>
        </footer>
      </div>

      {/* Decorative Background Effects */}
      <div className="fixed top-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
    </div>
  );
};

export default ApplicationWizard;
