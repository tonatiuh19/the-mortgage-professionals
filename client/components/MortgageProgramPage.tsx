import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetaHelmet } from "@/components/MetaHelmet";

interface MortgageProgramPageProps {
  title: string;
  summary: string;
  descriptionParagraphs: string[];
  highlights: string[];
  slug: "conventional-loan" | "fha-loan" | "va-loan";
}

const MortgageProgramPage: React.FC<MortgageProgramPageProps> = ({
  title,
  summary,
  descriptionParagraphs,
  highlights,
  slug,
}) => {
  return (
    <div className="flex flex-col">
      <MetaHelmet
        title={`${title} | The Mortgage Professionals`}
        description={summary}
        keywords={`${title}, The Mortgage Professionals, mortgage programs, home loan options`}
      />

      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-14 md:py-20">
        <div className="container relative z-10 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
            Mortgage Programs
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            {summary}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container grid gap-8 lg:grid-cols-3">
          <article className="space-y-5 lg:col-span-2">
            {descriptionParagraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-base leading-7 text-foreground/90"
              >
                {paragraph}
              </p>
            ))}
          </article>

          <aside>
            <Card className="sticky top-28 border-primary/20 bg-primary/[0.03]">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold">
                  What&apos;s the Next Step?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Take the first step toward the right mortgage and receive
                  expert recommendations from our team.
                </p>
                <ul className="mt-5 space-y-2">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-2">
                  <Link to="/contact-us" className="block">
                    <Button className="w-full gap-2">
                      Get Pre-Qualified <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a
                    href="https://2302276.my1003app.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      Apply Online
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-8">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            Explore other mortgage programs:
          </p>
          <div className="flex flex-wrap gap-3">
            {slug !== "conventional-loan" && (
              <Link
                to="/conventional-loan"
                className="font-semibold text-primary hover:underline"
              >
                Conventional Loan
              </Link>
            )}
            {slug !== "fha-loan" && (
              <Link
                to="/fha-loan"
                className="font-semibold text-primary hover:underline"
              >
                FHA Loan
              </Link>
            )}
            {slug !== "va-loan" && (
              <Link
                to="/va-loan"
                className="font-semibold text-primary hover:underline"
              >
                VA Loan
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MortgageProgramPage;
