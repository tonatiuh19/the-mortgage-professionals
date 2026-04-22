import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * Icon element rendered before the title.
   * Pass with your preferred size, e.g. `<Users className="h-7 w-7 text-primary" />`
   */
  icon?: React.ReactNode;

  /** Page title — can be a plain string or include inline badges / React nodes. */
  title: React.ReactNode;

  /** Subtitle shown beneath the title. */
  description?: React.ReactNode;

  /**
   * Right-side actions (buttons, search inputs, selects, etc.).
   *
   * **default variant** — rendered as-is; wrap your actions in a
   * `<div className="flex items-center gap-3">` yourself for the standard look.
   *
   * **toolbar variant** — automatically wrapped in
   * `<div className="flex items-center gap-1.5">` so you can pass a Fragment.
   */
  actions?: React.ReactNode;

  /**
   * Layout variant:
   * - `"default"` (default) — classic padded content header that lives inside
   *   a page container (`p-4 sm:p-6 lg:p-8`). Includes bottom margin.
   * - `"toolbar"` — top-pinned bar with `bg-card` + bottom border; used for
   *   full-screen split-panel pages like Conversations.
   */
  variant?: "default" | "toolbar";

  /**
   * **toolbar only** — callback for the mobile back-arrow that appears when
   * the user has navigated into a sub-panel.
   */
  mobileBack?: () => void;

  /** Extra classes merged onto the outermost element. */
  className?: string;
}

/**
 * Reusable admin page header.
 *
 * Usage (default):
 * ```tsx
 * <PageHeader
 *   icon={<Users className="h-7 w-7 text-primary" />}
 *   title="Clients"
 *   description="Manage your client relationships"
 *   actions={
 *     <div className="flex items-center gap-3">
 *       <Button>New Client</Button>
 *     </div>
 *   }
 * />
 * ```
 *
 * Usage (toolbar — full-screen panels):
 * ```tsx
 * <PageHeader
 *   variant="toolbar"
 *   icon={<MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
 *   title="Conversations"
 *   description="Manage client communications"
 *   mobileBack={() => setMobilePanel("list")}
 *   actions={<><Button>...</Button><Button>...</Button></>}
 * />
 * ```
 */
export function PageHeader({
  icon,
  title,
  description,
  actions,
  variant = "default",
  mobileBack,
  className,
}: PageHeaderProps) {
  /* ── Toolbar variant ─────────────────────────────────────────────────── */
  if (variant === "toolbar") {
    return (
      <div
        className={cn(
          "bg-card border-b border-border px-4 md:px-6 py-3 md:py-4 flex-shrink-0",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {mobileBack && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 flex-shrink-0"
                onClick={mobileBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground truncate">
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <span className="hidden sm:inline">{title}</span>
              </h1>
              {description && (
                <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-1.5">{actions}</div>
          )}
        </div>
      </div>
    );
  }

  /* ── Default variant ─────────────────────────────────────────────────── */
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions}
    </header>
  );
}

export default PageHeader;
