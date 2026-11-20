import { useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { MessageSquareText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSmsConsentConfig } from "@/store/slices/smsConsentSlice";

export interface SmsConsentValue {
  sms_consent_transactional: boolean;
  sms_consent_marketing: boolean;
}

export const EMPTY_SMS_CONSENT: SmsConsentValue = {
  sms_consent_transactional: false,
  sms_consent_marketing: false,
};

interface SmsConsentCheckboxesProps {
  value: SmsConsentValue;
  onChange: (next: SmsConsentValue) => void;
  /** "light" for white/gray cards, "dark" for navy backgrounds. */
  tone?: "light" | "dark";
  className?: string;
  disabled?: boolean;
}

/**
 * A2P 10DLC / TCPA opt-in checkboxes. Both boxes are optional and start
 * unchecked: SMS consent can never be a condition of submitting a form.
 * The wording comes from the server so what is shown matches what is stored.
 */
export function SmsConsentCheckboxes({
  value,
  onChange,
  tone = "light",
  className,
  disabled,
}: SmsConsentCheckboxesProps) {
  const dispatch = useAppDispatch();
  const { texts } = useAppSelector((state) => state.smsConsent);
  const baseId = useId();

  useEffect(() => {
    dispatch(fetchSmsConsentConfig());
  }, [dispatch]);

  const dark = tone === "dark";
  const rows: { key: keyof SmsConsentValue; text: string }[] = [
    { key: "sms_consent_transactional", text: texts.transactional },
    { key: "sms_consent_marketing", text: texts.marketing },
  ];

  return (
    <fieldset
      className={cn(
        "rounded-xl border p-3 sm:p-4 space-y-3 transition-colors",
        dark ? "border-white/20 bg-white/5" : "border-border bg-muted/40",
        className,
      )}
    >
      <legend
        className={cn(
          "flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider",
          dark ? "text-white/80" : "text-muted-foreground",
        )}
      >
        <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
        Text message preferences (optional)
      </legend>

      {rows.map(({ key, text }) => {
        const id = `${baseId}-${key}`;
        const checked = value[key];
        return (
          <label
            key={key}
            htmlFor={id}
            className={cn(
              "flex items-start gap-3 rounded-lg p-2 -m-1 cursor-pointer transition-colors",
              dark ? "hover:bg-white/10" : "hover:bg-background",
              checked && (dark ? "bg-white/10" : "bg-background"),
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <Checkbox
              id={id}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(state) =>
                onChange({ ...value, [key]: state === true })
              }
              className={cn("mt-0.5 shrink-0", dark && "border-white/60")}
            />
            <span
              className={cn(
                "text-xs leading-relaxed",
                dark ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {text}
            </span>
          </label>
        );
      })}

      <p
        className={cn(
          "pt-1 text-center text-xs",
          dark ? "text-white/70" : "text-muted-foreground",
        )}
      >
        <Link
          to="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-medium underline underline-offset-2 transition-colors",
            dark ? "hover:text-white" : "text-primary hover:text-primary/80",
          )}
        >
          Privacy Policy
        </Link>
      </p>
    </fieldset>
  );
}

export default SmsConsentCheckboxes;
