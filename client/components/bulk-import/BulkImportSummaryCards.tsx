import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  className?: string;
  delay?: number;
}

function AnimatedStat({ label, value, className, delay = 0 }: StatCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const duration = 600;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const timeout = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay / 1000 }}
    >
      <Card className={cn("border-0 shadow-sm", className)}>
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{display}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface BulkImportSummaryCardsProps {
  willCreate: number;
  skipped: number;
  errors: number;
  total: number;
}

export default function BulkImportSummaryCards({
  willCreate,
  skipped,
  errors,
  total,
}: BulkImportSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <AnimatedStat
        label="Ready to import"
        value={willCreate}
        className="bg-emerald-500/10 ring-1 ring-emerald-500/20"
        delay={0}
      />
      <AnimatedStat
        label="Skipped"
        value={skipped}
        className="bg-amber-500/10 ring-1 ring-amber-500/20"
        delay={80}
      />
      <AnimatedStat
        label="Errors"
        value={errors}
        className="bg-red-500/10 ring-1 ring-red-500/20"
        delay={160}
      />
      <AnimatedStat
        label="Total rows"
        value={total}
        className="bg-muted/60 ring-1 ring-border"
        delay={240}
      />
    </div>
  );
}
