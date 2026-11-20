import { Link } from "react-router-dom";
import { LEGAL_DOC_META } from "@shared/legal";
import { cn } from "@/lib/utils";

/**
 * "Privacy Policy | Terms and Conditions" — required next to SMS consent and
 * shown in footers / login pages. Opens in a new tab inside forms so typed
 * answers are never lost.
 */
export function LegalLinks({
  className,
  linkClassName,
  newTab = false,
  separator = "|",
}: {
  className?: string;
  linkClassName?: string;
  newTab?: boolean;
  separator?: string;
}) {
  const target = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const link = cn("underline-offset-2 transition-colors hover:underline", linkClassName);
  return (
    <span className={cn("inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1", className)}>
      <Link to={LEGAL_DOC_META.privacy.path} className={link} {...target}>
        Privacy Policy
      </Link>
      <span aria-hidden className="opacity-60">{separator}</span>
      <Link to={LEGAL_DOC_META.terms.path} className={link} {...target}>
        Terms and Conditions
      </Link>
    </span>
  );
}

/** "By submitting, you agree to our Terms and Conditions and acknowledge our Privacy Policy." */
export function LegalAgreementNote({ action = "submitting", className }: { action?: string; className?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      By {action}, you agree to our{" "}
      <Link to={LEGAL_DOC_META.terms.path} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
        Terms and Conditions
      </Link>{" "}
      and acknowledge our{" "}
      <Link to={LEGAL_DOC_META.privacy.path} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

export default LegalLinks;
