const { hostname } = window.location;

/**
 * True when running locally or on a Vercel preview deployment.
 * False on the real production domain.
 */
export const IS_DEV =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  (hostname.endsWith(".vercel.app") &&
    hostname !== "real-state-one-omega.vercel.app");

export const DOMAIN = IS_DEV
  ? `http://localhost:8080`
  : `https://real-state-one-omega.vercel.app`;
