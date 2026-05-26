import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetaHelmet } from "@/components/MetaHelmet";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I apply for a mortgage with The Mortgage Professionals?",
        a: "You can start your application online in minutes by clicking 'Apply Now'. Our wizard will guide you step-by-step through the process. You can also call us at (562) 337-0000 to speak with a loan officer directly.",
      },
      {
        q: "What documents do I need to get pre-approved?",
        a: "Typically you'll need: government-issued ID, recent pay stubs (last 30 days), W-2s or tax returns (last 2 years), bank statements (last 2-3 months), and employment information. Your loan officer will provide a personalized checklist.",
      },
      {
        q: "How long does the pre-approval process take?",
        a: "Our pre-approval process is fast — most clients receive a decision within 24–48 hours after submitting their complete application and documents.",
      },
    ],
  },
  {
    category: "Loan Types",
    questions: [
      {
        q: "What types of home loans do you offer?",
        a: "We offer a wide range of loan products including Conventional, FHA, VA, USDA, Jumbo, Reverse Mortgages, and Non-QM loans. We'll help you find the best fit for your financial situation.",
      },
      {
        q: "What is the difference between a fixed-rate and adjustable-rate mortgage?",
        a: "A fixed-rate mortgage keeps the same interest rate for the life of the loan, giving you predictable monthly payments. An adjustable-rate mortgage (ARM) starts with a lower rate that may change periodically based on market conditions — it can be a good option if you plan to sell or refinance within a few years.",
      },
      {
        q: "Can I refinance my existing mortgage?",
        a: "Yes! Refinancing can help lower your monthly payment, reduce your interest rate, shorten your loan term, or tap into your home's equity. Contact us to get a custom refinance quote.",
      },
    ],
  },
  {
    category: "Rates & Costs",
    questions: [
      {
        q: "How are mortgage interest rates determined?",
        a: "Rates depend on several factors including your credit score, loan-to-value ratio, loan type, loan term, property type, and current market conditions. We shop multiple lenders to find you the most competitive rate.",
      },
      {
        q: "What are closing costs and how much should I expect?",
        a: "Closing costs typically range from 2–5% of the loan amount and include lender fees, title insurance, appraisal, and prepaid items like taxes and insurance. We'll provide a detailed Loan Estimate so you know exactly what to expect.",
      },
      {
        q: "Is there a minimum credit score required?",
        a: "It depends on the loan type. FHA loans can go as low as 580, while conventional loans typically require 620 or higher. VA and USDA loans have flexible requirements. Our team can help even if your credit isn't perfect.",
      },
    ],
  },
  {
    category: "The Process",
    questions: [
      {
        q: "How long does it take to close on a home loan?",
        a: "We target a 30-day closing timeline. The timeline can vary depending on the loan type, property appraisal, title search, and how quickly documents are submitted. We keep you updated every step of the way through your client portal.",
      },
      {
        q: "How do I track my loan application status?",
        a: "Once you apply, you'll have access to your secure Client Portal where you can track your application progress, complete tasks, upload documents, and communicate with your loan officer — all in one place.",
      },
      {
        q: "What happens after I submit my application?",
        a: "Your loan officer will review your file, order an appraisal, and submit to underwriting. You may be asked for additional documents (called conditions). Once all conditions are cleared, you'll receive a clear-to-close and we'll schedule your closing date.",
      },
    ],
  },
];

export default function FAQ() {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? faqs
        .map((cat) => ({
          ...cat,
          questions: cat.questions.filter(
            (item) =>
              item.q.toLowerCase().includes(search.toLowerCase()) ||
              item.a.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.questions.length > 0)
    : faqs;

  return (
    <>
      <MetaHelmet
        title="FAQ | The Mortgage Professionals"
        description="Frequently asked questions about home loans, mortgage rates, the application process, and more."
      />
      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 py-20 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-700" />
          </div>
          <div className="container relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <HelpCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Help Center</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
                Everything you need to know about the mortgage process, loan
                types, and working with The Mortgage Professionals.
              </p>
              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16">
          <div className="container max-w-3xl">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No results found for "{search}"</p>
                <p className="text-sm mt-2">
                  Try different keywords or{" "}
                  <button
                    onClick={() => setSearch("")}
                    className="text-primary underline"
                  >
                    clear search
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {filtered.map((category, ci) => (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.1 }}
                  >
                    <h2 className="text-xl font-bold mb-4 text-primary">
                      {category.category}
                    </h2>
                    <div className="space-y-3">
                      {category.questions.map((item, qi) => {
                        const key = `${ci}-${qi}`;
                        const isOpen = openItem === key;
                        return (
                          <div
                            key={qi}
                            className="border border-border/50 rounded-xl overflow-hidden bg-card"
                          >
                            <button
                              onClick={() => setOpenItem(isOpen ? null : key)}
                              className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                            >
                              <span className="font-medium text-base">
                                {item.q}
                              </span>
                              <motion.div
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="shrink-0"
                              >
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              </motion.div>
                            </button>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                >
                                  <div className="px-6 pb-5 text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                                    {item.a}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-16 rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center"
            >
              <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-6">
                Our loan officers are ready to help. Call us or start your
                application today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="tel:(562)337-0000">
                  <Button variant="outline" className="w-full sm:w-auto">
                    (562) 337-0000
                  </Button>
                </a>
                <Link to="/wizard">
                  <Button className="w-full sm:w-auto">Apply Now</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
