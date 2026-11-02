import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  className?: string;
  label?: string;
};

export function BillingConfigLoading({
  id,
  className,
  label = "Loading billing…",
}: Props) {
  return (
    <div
      id={id}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 py-10 text-sm text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
