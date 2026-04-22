import React from "react";
import { Mail } from "lucide-react";

interface EmailLinkProps {
  /** Email address */
  email: string;
  /** Extra className applied to the anchor */
  className?: string;
  /** When true, renders only the email text without the Mail icon prefix */
  noIcon?: boolean;
}

/**
 * Reusable email address widget.
 * Clicking opens the native email client via mailto:.
 */
const EmailLink: React.FC<EmailLinkProps> = ({
  email,
  className = "",
  noIcon = false,
}) => {
  return (
    <a
      href={`mailto:${email}`}
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-1.5 hover:text-primary hover:underline transition-colors ${className}`}
    >
      {!noIcon && <Mail className="h-3 w-3 shrink-0" />}
      <span className="truncate">{email}</span>
    </a>
  );
};

export default EmailLink;
