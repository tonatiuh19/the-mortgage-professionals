import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Heart,
  Users,
  Award,
  Home,
  Star,
  ArrowRight,
  Mail,
  Shield,
  TrendingUp,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MetaHelmet } from "@/components/MetaHelmet";

// Stats are hidden until the company confirms them.
const SHOW_UNVERIFIED_COMPANY_CONTENT = false;

const VALUES = [
  {
    icon: Heart,
    title: "Community First",
    description:
      "We are deeply committed to serving the communities around us. Every family we help is a neighbor.",
  },
  {
    icon: Shield,
    title: "Transparency",
    description:
      "No hidden fees, no confusing jargon. We walk you through every step so you always know exactly where you stand.",
  },
  {
    icon: TrendingUp,
    title: "Results-Driven",
    description:
      "Our goal is to close your loan on time, at the best rate available — period. We measure our success by yours.",
  },
  {
    icon: Handshake,
    title: "Personalized Service",
    description:
      "You'll work directly with a mortgage banker — not a call center. Your loan officer knows your name and your story.",
  },
];

const STATS = [
  { value: "24+", label: "Years of Experience" },
  { value: "$2B+", label: "Loans Funded" },
  { value: "30", label: "Day Avg. Closing" },
  { value: "5★", label: "Client Rating" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const About: React.FC = () => {
  return (
    <div className="flex flex-col">
      <MetaHelmet
        title="About Us | The Mortgage Professionals"
        description="Learn about The Mortgage Professionals's story, our team of experienced mortgage bankers, and our mission to make homeownership accessible to every family."
        keywords="The Mortgage Professionals, about us, mortgage banker, home loans team"
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 md:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
                <Users className="mr-2 h-4 w-4" />
                Our Story
              </Badge>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl mb-6">
                Built for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  Your Community
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                The story of The Mortgage Professionals begins with a
                simple idea: represent and serve the communities our clients call
                home. Our goal has always been to build on the dream of
                homeownership — making it accessible, understandable, and
                achievable for every family.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Today, The Mortgage Professionals serves clients across California and
                nationwide, with a team of dedicated mortgage bankers who take
                the time to understand your situation and find the loan that
                truly fits.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/wizard">
                  <Button size="lg" className="gap-2">
                    Get Pre-Approved <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline">
                    Contact Our Team
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Stats panel */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {(SHOW_UNVERIFIED_COMPANY_CONTENT ? STATS : []).map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm"
                >
                  <div className="text-4xl font-black text-primary mb-1">
                    {s.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Home className="h-10 w-10 mx-auto mb-4 opacity-80" />
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-xl text-primary-foreground/90 leading-relaxed">
              "To provide every family — regardless of background or credit
              history — with the tools, knowledge, and financing they need to
              achieve sustainable homeownership and build generational wealth."
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
              What We Stand For
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our values shape every interaction, every loan, every family we
              serve.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full text-center p-2 hover:shadow-lg transition-all">
                  <CardContent className="pt-6 flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <v.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-base font-bold">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {v.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="rounded-3xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-14 text-center">
            <h2 className="text-3xl font-bold mb-3">
              Ready to Start Your Journey?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
              The biggest decision of your life deserves a team that truly
              cares. Let's find the mortgage that fits your life.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/wizard">
                <Button size="lg" variant="secondary" className="gap-2">
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="secondary" className="gap-2">Contact Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
