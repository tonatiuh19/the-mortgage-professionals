import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, FileText, ListOrdered, Printer, ShieldCheck } from "lucide-react";
import type { LegalDocKey } from "@shared/legal";
import { LEGAL_DOC_META, formatLegalDate } from "@shared/legal";
import { LegalMarkdown, legalHeadings } from "@/components/LegalMarkdown";
import { MetaHelmet } from "@/components/MetaHelmet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPublicLegalDoc } from "@/store/slices/legalSlice";

const DESCRIPTIONS: Record<LegalDocKey, string> = {
  privacy: "How The Mortgage Professionals collects, uses, shares and protects your personal information, including SMS consent.",
  terms: "Terms for using The Mortgage Professionals website, online services and SMS messaging programs.",
};

/** Public Privacy Policy / Terms page rendered from the published Markdown. */
export default function LegalPage({ docKey }: { docKey: LegalDocKey }) {
  const dispatch = useAppDispatch();
  const doc = useAppSelector((s) => s.legal.publicDocs[docKey]);
  const status = useAppSelector((s) => s.legal.publicStatus[docKey]);
  const [tocOpen, setTocOpen] = useState(false);
  const meta = LEGAL_DOC_META[docKey];
  const other: LegalDocKey = docKey === "privacy" ? "terms" : "privacy";

  useEffect(() => {
    if (!doc) dispatch(fetchPublicLegalDoc(docKey));
  }, [dispatch, docKey, doc]);

  // The hero shows the title, so drop the document's leading "# Title" line.
  const body = useMemo(() => (doc?.markdown ?? "").replace(/^\s*#\s+[^\n]*\n+/, ""), [doc?.markdown]);
  const headings = useMemo(() => legalHeadings(body), [body]);

  return (
    <div className="flex flex-col">
      <MetaHelmet
        title={`${meta.title} | The Mortgage Professionals`}
        description={DESCRIPTIONS[docKey]}
        keywords={`${meta.title.toLowerCase()}, SMS consent, mortgage, The Mortgage Professionals`}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-14 md:py-20 print:py-4">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl print:hidden" />
        <div className="container relative max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {docKey === "privacy" ? <ShieldCheck className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            Legal
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            {meta.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {doc ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Effective {formatLegalDate(doc.effective_date)}
              </span>
            ) : status !== "failed" ? (
              <Skeleton className="h-4 w-40" />
            ) : null}
            <Button variant="ghost" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container grid max-w-5xl gap-8 lg:grid-cols-[220px_1fr]">
          {/* Table of contents */}
          {headings.length > 0 && (
            <nav className="print:hidden lg:sticky lg:top-24 lg:self-start" aria-label="On this page">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold lg:hidden"
                onClick={() => setTocOpen((v) => !v)}
                aria-expanded={tocOpen}
              >
                <span className="inline-flex items-center gap-2"><ListOrdered className="h-4 w-4" /> On this page</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", tocOpen && "rotate-180")} />
              </button>
              <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
                On this page
              </p>
              <ol className={cn("mt-2 space-y-1 border-l pl-3 text-sm lg:mt-0 lg:block", tocOpen ? "block" : "hidden")}>
                {headings.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={() => setTocOpen(false)}
                      className="block py-0.5 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <article className={cn("min-w-0", headings.length === 0 && "lg:col-span-2")}>
            {doc ? (
              <LegalMarkdown markdown={body} className="animate-in fade-in duration-500" />
            ) : status === "failed" ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p>We couldn't load this page right now.</p>
                <Button className="mt-4" variant="outline" onClick={() => dispatch(fetchPublicLegalDoc(docKey))}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className={cn("h-4", i % 3 === 0 ? "w-1/2" : "w-full")} />
                ))}
              </div>
            )}

            <div className="mt-12 rounded-xl border bg-muted/30 p-5 text-sm print:hidden">
              See also our{" "}
              <Link to={LEGAL_DOC_META[other].path} className="font-semibold text-primary hover:underline">
                {LEGAL_DOC_META[other].title}
              </Link>
              .
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
