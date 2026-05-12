import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetaHelmet } from "@/components/MetaHelmet";
import { ArrowRight, Building2, Phone, Mail, MapPin } from "lucide-react";

const About: React.FC = () => {
  return (
    <div className="flex flex-col">
      <MetaHelmet
        title="About Us | The Mortgage Professionals"
        description="Learn about The Mortgage Professionals, our mission, and our commitment to helping families with home financing solutions."
        keywords="about us, The Mortgage Professionals, Raul Oseguera, mortgage company, Bellflower CA"
      />

      <section className="bg-gradient-to-b from-primary/5 to-background py-14 md:py-20">
        <div className="container max-w-5xl">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            About the Company
          </Badge>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            The Mortgage Professionals, Inc.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            We were founded by Raul Oseguera, a mortgage professional with over
            20 years in the industry. He assembled a team committed to
            delivering trusted advising, dependability, compassion, empathy,
            and a 100% commitment to clients.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container grid gap-8 lg:grid-cols-3">
          <article className="space-y-5 lg:col-span-2">
            <p className="leading-7 text-foreground/90">
              Our staff is comprised of seasoned professionals, each with deep
              experience in the mortgage industry. We honor our clients by
              providing trustworthy, honest work with integrity.
            </p>
            <p className="leading-7 text-foreground/90">
              We are proactive, not reactive, helping families avoid unnecessary
              headaches during the loan process. We focus on efficient escrows,
              strong communication, and a personalized experience from start to
              finish.
            </p>
            <p className="leading-7 text-foreground/90">
              Whether you need financing to purchase a home or refinance for a
              better rate, we are here to help you review your unique situation
              and move forward with confidence.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="https://2302276.my1003app.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="gap-2">
                  Apply Online <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link to="/our-team">
                <Button variant="outline">Meet the Team</Button>
              </Link>
            </div>
          </article>

          <aside>
            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Building2 className="h-4 w-4" />
                  Get in touch with us
                </div>
                <p className="text-sm text-foreground/90 flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  16901 Bellflower Blvd, Bellflower, CA 90706
                </p>
                <a
                  href="tel:(562)665-4132"
                  className="text-sm text-foreground/90 hover:text-primary inline-flex items-center gap-2"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  (562) 665-4132
                </a>
                <a
                  href="mailto:raul@theosegueragroup.com"
                  className="text-sm break-all text-foreground/90 hover:text-primary inline-flex items-center gap-2"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  raul@theosegueragroup.com
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default About;
