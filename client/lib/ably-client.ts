import * as AblyLib from "ably";
import axios from "axios";

/**
 * Shared Ably Realtime client singleton.
 *
 * Why: every Realtime instance opens its own websocket + counts toward the
 * Ably concurrent-connection quota. Consolidating into a single client per
 * browser tab keeps cost flat as we add more real-time features (bell,
 * conversations, voice). Existing components (GlobalVoiceManager,
 * Conversations) still create their own clients — they can migrate later
 * without breaking changes.
 */

let clientPromise: Promise<AblyLib.Realtime | null> | null = null;
let currentToken: string | null = null;

async function fetchToken(sessionToken: string): Promise<unknown> {
  const { data } = await axios.get("/api/conversations/ably-token", {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  return data;
}

export function getSharedAblyClient(
  sessionToken: string | null,
): Promise<AblyLib.Realtime | null> {
  if (!sessionToken) return Promise.resolve(null);

  // Re-create the client when the session token changes (e.g. after re-login).
  if (currentToken && currentToken !== sessionToken) {
    closeSharedAblyClient();
  }

  if (!clientPromise) {
    currentToken = sessionToken;
    clientPromise = (async () => {
      try {
        // Pre-fetch one token so the very first publish/subscribe doesn't
        // need to round-trip before connecting.
        const initial = await fetchToken(sessionToken);
        let firstUse = true;
        return new AblyLib.Realtime({
          authCallback: async (_tokenParams, cb) => {
            try {
              if (firstUse) {
                firstUse = false;
                cb(null, initial as any);
                return;
              }
              const fresh = await fetchToken(sessionToken);
              cb(null, fresh as any);
            } catch (err) {
              cb(err as any, null);
            }
          },
        });
      } catch {
        clientPromise = null;
        currentToken = null;
        return null;
      }
    })();
  }
  return clientPromise;
}

export function closeSharedAblyClient() {
  if (clientPromise) {
    clientPromise
      .then((c) => {
        try {
          c?.close();
        } catch {
          /* noop */
        }
      })
      .catch(() => {});
  }
  clientPromise = null;
  currentToken = null;
}
