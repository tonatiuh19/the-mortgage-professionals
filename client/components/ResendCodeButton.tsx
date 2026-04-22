import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Clock } from "lucide-react";

const COOLDOWN_SECONDS = 90; // 1 minute 30 seconds

interface ResendCodeButtonProps {
  onResend: () => Promise<void> | void;
  /** Set to true while the parent is submitting the resend request */
  loading?: boolean;
  className?: string;
}

export function ResendCodeButton({
  onResend,
  loading = false,
  className = "",
}: ResendCodeButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setSecondsLeft(COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  // Start countdown on mount (code was just sent)
  useEffect(() => {
    startCountdown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = async () => {
    setIsSending(true);
    try {
      await onResend();
      startCountdown();
    } finally {
      setIsSending(false);
    }
  };

  const canResend = secondsLeft === 0 && !isSending && !loading;
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdownLabel = `${minutes}:${String(secs).padStart(2, "0")}`;

  return (
    <AnimatePresence mode="wait">
      {secondsLeft > 0 ? (
        <motion.div
          key="countdown"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`flex items-center justify-center gap-2 text-sm text-muted-foreground select-none ${className}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Resend available in{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {countdownLabel}
            </span>
          </span>
        </motion.div>
      ) : (
        <motion.button
          key="resend-btn"
          type="button"
          onClick={handleClick}
          disabled={!canResend}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${className}`}
        >
          {isSending || loading ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Resend Code
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
