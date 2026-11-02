/** Shared Stripe Payment Element appearance — matches app theme. */
export const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#e8192c",
    colorBackground: "hsl(var(--card))",
    colorText: "hsl(var(--foreground))",
    colorDanger: "hsl(var(--destructive))",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid hsl(var(--border))", boxShadow: "none" },
    ".Tab": { border: "1px solid hsl(var(--border))" },
    ".Tab--selected": { borderColor: "#e8192c" },
  },
};

/** Card-only checkout — no Link, wallets, redirect methods, or mandate copy in the form. */
export const STRIPE_PAYMENT_ELEMENT_OPTIONS = {
  layout: "accordion" as const,
  terms: {
    card: "never" as const,
  },
  wallets: {
    link: "never" as const,
    applePay: "never" as const,
    googlePay: "never" as const,
  },
  paymentMethodOrder: ["card"],
};

export function stripeElementsLoaderOptions(clientSecret: string) {
  return {
    clientSecret,
    appearance: STRIPE_APPEARANCE,
  };
}
