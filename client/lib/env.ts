const { hostname } = window.location;

/**
 * True when running locally or on a Vercel preview deployment.
 * False on the real production domain.
 */
export const IS_DEV =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.endsWith(".vercel.app");

