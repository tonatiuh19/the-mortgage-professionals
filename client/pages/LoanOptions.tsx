import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Home,
  RefreshCw,
  Shield,
  Star,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BadgePercent,
  Building2,
  Landmark,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaHelmet } from "@/components/MetaHelmet";
import { cn } from "@/lib/utils";

// ─── Data ────────────────────────────────────────────────────────────────────

const LOAN_TYPES = [
  {
    id: "conventional-30",
    icon: Home,
    name: "30-Year Fixed",
    badge: "Most Popular",
    badgeVariant: "primary" as const,
    tagline: "Stability for the long haul",
    description:
      "The most popular mortgage program. Enjoy a low, locked-in interest rate with fixed monthly payments that never change. Quick approval and closing within 30 days.",
    highlights: [
      "Fixed rate — never changes",
      "Lowest monthly payment across fixed terms",
      "30-day closing available",
      "Ideal for primary and investment properties",
    ],
    requirements: [
      "Min. 620 credit score",
      "3%–20% down payment",
      "Debt-to-income ratio ≤ 45%",
      "Stable 2-year employment history",
    ],
    bestFor:
      "First-time buyers and long-term homeowners who want predictable payments.",
    color: "primary",
  },
  {
    id: "conventional-15",
    icon: TrendingDown,
    name: "15-Year Fixed",
    badge: "Save Thousands",
    badgeVariant: "emerald" as const,
    tagline: "Build equity faster",
    description:
      "Pay off your home and save thousands of dollars over the life of the loan. Enjoy a lower interest rate than the 30-year fixed with full equity in half the time.",
    highlights: [
      "Lower total interest cost",
      "Build equity twice as fast",
      "Typically lower rate than 30yr",
      "Great for buyers with higher income",
    ],
    requirements: [
      "Min. 620 credit score",
      "5%–20% down payment",
      "Higher monthly income to qualify",
      "Debt-to-income ratio ≤ 43%",
    ],
    bestFor:
      "Borrowers who can afford a higher payment and want to minimize total interest paid.",
    color: "emerald",
  },
  {
    id: "fha",
    icon: Shield,
    name: "FHA Loans",
    badge: "Low Down Payment",
    badgeVariant: "sky" as const,
    tagline: "Your path to homeownership",
    description:
      "Backed by the Federal Housing Administration. Qualify with a down payment as low as 3.5%, worry-free loan qualification, and marginal credit is acceptable.",
    highlights: [
      "As low as 3.5% down payment",
      "Credit scores down to 580",
      "More flexible debt ratios",
      "Gift funds allowed for down payment",
    ],
    requirements: [
      "Min. 580 credit score (3.5% down)",
      "500–579 credit with 10% down",
      "Primary residence only",
      "MIP required (mortgage insurance)",
    ],
    bestFor:
      "First-time buyers with limited savings or less-than-perfect credit.",
    color: "sky",
  },
  {
    id: "va",
    icon: Star,
    name: "VA Loans",
    badge: "For Veterans",
    badgeVariant: "amber" as const,
    tagline: "A benefit you've earned",
    description:
      "$0 down payment required. No monthly mortgage insurance, low rates, and worry-free approval for qualifying veterans and active-duty service members.",
    highlights: [
      "$0 down payment required",
      "No private mortgage insurance (PMI)",
      "Competitive interest rates",
      "No prepayment penalties",
    ],
    requirements: [
      "VA Certificate of Eligibility",
      "Honorable discharge or active duty",
      "Min. 620 credit score (lender overlay)",
      "Primary residence only",
    ],
    bestFor:
      "Veterans, active-duty service members, and eligible surviving spouses.",
    color: "amber",
  },
  {
    id: "jumbo",
    icon: Building2,
    name: "JUMBO Loans",
    badge: "High Value",
    badgeVariant: "violet" as const,
    tagline: "For luxury and high-cost markets",
    description:
      "For loan amounts exceeding the conforming loan limit. 5% and 10% down payment options with low rates for both fixed and adjustable terms.",
    highlights: [
      "Loan amounts above conforming limits",
      "5% down option available",
      "Fixed and adjustable rates",
      "Available on primary, second homes",
    ],
    requirements: [
      "Min. 700+ credit score",
      "5%–20% down payment",
      "Cash reserves of 6–12 months",
      "Strong income documentation",
    ],
    bestFor: "Buyers purchasing in high-cost markets or luxury properties.",
    color: "violet",
  },
  {
    id: "nonqm",
    icon: Zap,
    name: "Non-QM Loans",
    badge: "Self-Employed",
    badgeVariant: "orange" as const,
    tagline: "When your income doesn't fit the mold",
    description:
      "Non-Qualified Mortgage loans for borrowers with unique income qualifying circumstances — bank statement programs, asset depletion, ITIN, and more.",
    highlights: [
      "Bank statement income qualification",
      "Asset depletion programs",
      "ITIN borrowers welcome",
      "No traditional income docs needed",
    ],
    requirements: [
      "Min. 620 credit score",
      "10%–30% down payment",
      "12–24 months bank statements",
      "Various product-specific requirements",
    ],
    bestFor:
      "Self-employed borrowers, business owners, investors, and ITIN holders.",
    color: "orange",
  },
  {
    id: "arm",
    icon: BadgePercent,
    name: "ARM Loans",
    badge: "Low Initial Rate",
    badgeVariant: "rose" as const,
    tagline: "Smart for short-term homeowners",
    description:
      "Adjustable-rate mortgages ideal if you plan to stay in your home fewer than ten years. Enjoy a lower initial rate fixed for a 5, 7, or 10-year period.",
    highlights: [
      "Lower initial rate than 30yr fixed",
      "5/1, 7/1, and 10/1 ARM options",
      "Rate caps protect against large jumps",
      "Ideal if you'll sell or refi in <10 years",
    ],
    requirements: [
      "Min. 620 credit score",
      "5%–20% down payment",
      "Understand rate adjustment terms",
      "Qualify at the fully-indexed rate",
    ],
    bestFor:
      "Buyers who plan to sell or refinance before the fixed period ends.",
    color: "rose",
  },
  {
    id: "refinance",
    icon: RefreshCw,
    name: "Refinance",
    badge: "Lower Your Rate",
    badgeVariant: "teal" as const,
    tagline: "Rethink your current mortgage",
    description:
      "Whether you're looking to lower your monthly payment, shorten your term, or get cash out to consolidate debt — we'll help you find the right refinance strategy.",
    highlights: [
      "Rate & term refinance",
      "Cash-out refinance",
      "FHA/VA streamline available",
      "Skip-a-payment options",
    ],
    requirements: [
      "Min. 620 credit score",
      "20%+ equity for cash-out",
      "Recent payment history (no 30-day lates)",
      "Existing mortgage in good standing",
    ],
    bestFor:
      "Homeowners looking to save money, access equity, or pay off their home sooner.",
    color: "teal",
  },
];

const BADGE_CLASSES: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  emerald:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400",
  amber:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
  violet:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400",
  orange:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400",
  teal: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400",
};

const ICON_CLASSES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  orange:
    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
};

// ─── Component ───────────────────────────────────────────────────────────────

function LoanCard({ loan }: { loan: (typeof LOAN_TYPES)[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = loan.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                ICON_CLASSES[loan.color],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold shrink-0 mt-1",
                BADGE_CLASSES[loan.color],
              )}
            >
              {loan.badge}
            </Badge>
          </div>
          <CardTitle className="text-lg mt-3">{loan.name}</CardTitle>
          <p className="text-xs text-muted-foreground font-medium -mt-1">
            {loan.tagline}
          </p>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {loan.description}
          </p>

          {/* Highlights */}
          <ul className="space-y-1.5">
            {loan.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {/* Expandable requirements */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline self-start"
          >
            {expanded ? "Hide" : "Show"} requirements
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg bg-muted/60 p-3 space-y-1.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Requirements
              </p>
              {loan.requirements.map((r) => (
                <div
                  key={r}
                  className="flex items-start gap-2 text-xs text-foreground/80"
                >
                  <span className="text-primary mt-0.5">•</span>
                  {r}
                </div>
              ))}
            </motion.div>
          )}

          <div className="mt-auto pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground italic mb-3">
              <span className="font-semibold not-italic text-foreground">
                Best for:
              </span>{" "}
              {loan.bestFor}
            </p>
            <Link to="/wizard">
              <Button size="sm" className="w-full gap-2 group/btn">
                Apply for this Loan
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LoanOptions: React.FC = () => {
  return (
    <div className="flex flex-col">
      <MetaHelmet
        title="Loan Options | The Mortgage Professionals"
        description="Explore our full range of mortgage loan options including Conventional, FHA, VA, Jumbo, Non-QM, ARM, and refinance programs. Find the right loan for your situation."
        keywords="loan options, FHA, VA loans, conventional mortgage, jumbo loan, ARM, Non-QM, refinance, The Mortgage Professionals"
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
              <Landmark className="mr-2 h-4 w-4" />
              Mortgage Programs
            </Badge>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl mb-4">
              Find Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-600">
                Perfect Loan
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              No two loans are alike. We offer a full range of mortgage programs
              to match your unique financial situation, goals, and timeline.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/wizard">
                <Button size="lg" className="gap-2">
                  Get Pre-Approved <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="gap-2">
                  Talk to a Loan Officer
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y bg-muted/40 py-6">
        <div className="container">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            {[
              { icon: Clock, label: "30-Day Closing", value: "Available" },
              {
                icon: DollarSign,
                label: "Down Payment",
                value: "As Low as 0%",
              },
              { icon: Shield, label: "Credit Score", value: "From 500" },
              { icon: Star, label: "Loan Programs", value: "8+" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <s.icon className="h-5 w-5 text-primary mb-1" />
                <span className="text-xl font-extrabold">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan cards grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
              All Loan Programs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Click "Show requirements" on any card to see qualification
              details.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {LOAN_TYPES.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-3">
            Not sure which loan is right for you?
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
            Our experienced loan officers will walk you through your options and
            find the best fit for your goals — at no cost to you.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/contact">
              <Button size="lg" variant="secondary" className="gap-2">
                Talk to an Expert <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/wizard">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-white/30 text-white hover:bg-white/10"
              >
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoanOptions;
