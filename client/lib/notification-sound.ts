/**
 * Notification chime — a short, distinctive synthesized bell that's
 * deliberately different from any call/ring sound used elsewhere.
 *
 * Design:
 *   - Two short triangle-wave "ting" tones at C6 (1046.5 Hz) and E6 (1318.5 Hz),
 *     ~70 ms apart, each with a fast attack + exponential decay envelope so
 *     it sounds like a tiny crystal bell rather than a phone ring.
 *   - A soft sine sub-tone at the perfect fifth (G6) layered under the
 *     second hit gives it the "cool / sparkly" character.
 *   - Total duration ≈ 380 ms. Quiet by design (peak gain 0.18) so it never
 *     competes with the user's other audio.
 *
 * No external assets — synthesized live so it works offline, ships nothing,
 * and never collides with browser audio caching.
 */

const STORAGE_KEY = "notification_sound_muted";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  durationSec: number,
  type: OscillatorType,
  peakGain: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);

  // Fast attack (8 ms), then exponential decay to silence.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startAt + Math.max(0.05, durationSec),
  );

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function isNotificationSoundMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* noop */
  }
}

/**
 * Play the notification chime once. Safe to call repeatedly — short-circuits
 * when the user has muted notification sounds, when the browser blocks audio
 * before any user interaction, or when WebAudio is unavailable.
 */
export function playNotificationChime() {
  if (isNotificationSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Browsers suspend AudioContext until a user gesture. resume() is a no-op
  // if already running and rejects silently if blocked.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (ctx.state !== "running") return;

  const now = ctx.currentTime;
  // Bell ting #1 — C6 triangle
  playTone(ctx, 1046.5, now, 0.18, "triangle", 0.18);
  // Bell ting #2 — E6 triangle, 70 ms later
  playTone(ctx, 1318.51, now + 0.07, 0.22, "triangle", 0.16);
  // Sparkle layer — G6 sine, soft, slightly delayed
  playTone(ctx, 1567.98, now + 0.09, 0.28, "sine", 0.08);
}
