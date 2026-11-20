import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Same-site links stay in the SPA; external ones open in a new tab. */
function SmartLink({ href = "", children }: { href?: string; children?: React.ReactNode }) {
  let internal: string | null = null;
  try {
    const url = new URL(href, window.location.origin);
    const sameHost = url.host === window.location.host || /themortgageprofessionals\.net$/i.test(url.host);
    if (sameHost && /^\/(privacy-policy|terms-and-conditions|contact|contact-us|apply)/.test(url.pathname)) {
      internal = url.pathname.replace(/\/+$/, "") + url.hash;
    }
  } catch {
    internal = null;
  }
  if (internal) return <Link to={internal}>{children}</Link>;
  const safe = /^(https?:|mailto:|tel:)/i.test(href) ? href : undefined;
  return (
    <a href={safe} target={safe?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Renders legal Markdown. Raw HTML is not rendered (react-markdown default), so
 * editor content can never inject scripts. Single newlines become line breaks.
 */
export function LegalMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-h1:text-3xl md:prose-h1:text-4xl prose-h2:mt-10 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-a:text-primary prose-a:break-words prose-li:my-1 prose-strong:text-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => <SmartLink href={href}>{children}</SmartLink>,
          h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/** Plain text of rendered children (handles <strong>, <a>, … inside headings). */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** "## 3. SMS Communications" headings → table of contents entries. */
export function legalHeadings(markdown: string): { id: string; text: string }[] {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1].replace(/[*_`]/g, "").trim();
    return { id: slugify(text), text };
  });
}

export default LegalMarkdown;
