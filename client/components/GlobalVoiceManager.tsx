import React, { useEffect, useRef, useCallback, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import * as AblyLib from "ably";
import { Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setDeviceStatus,
  endOutboundCall,
  resolveOutboundCallName,
} from "@/store/slices/voiceSlice";
import VoiceCallPanel from "@/components/VoiceCallPanel";
import { logger } from "@/lib/logger";

/**
 * GlobalVoiceManager — mounted once inside AdminLayout so the Twilio Device
 * stays alive on every admin page. Renders the ringing notification and active
 * call panel as fixed overlays.
 */
const GlobalVoiceManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessionToken } = useAppSelector((s) => s.brokerAuth);
  const isAvailable = useAppSelector((s) => s.voice.isAvailable);
  const outboundCall = useAppSelector((s) => s.voice.outboundCall);

  const deviceRef = useRef<Device | null>(null);
  // Prevents the [isAvailable] effect from calling register() before setup() completes.
  const deviceReadyRef = useRef(false);
  // Mirrors ringingCall state for use inside event listeners (no stale closure).
  const ringingCallRef = useRef<Call | null>(null);
  // Tracks the CallSid of the current ringing call so Ably dismissal can match it.
  const ringingCallSidRef = useRef<string | null>(null);

  const [ringingCall, setRingingCall] = useState<Call | null>(null);
  const [ringingPhone, setRingingPhone] = useState<string>("");
  const [ringingClientName, setRingingClientName] = useState<string | null>(
    null,
  );
  const [ringingClientId, setRingingClientId] = useState<number | null>(null);
  const [activeIncomingCall, setActiveIncomingCall] = useState<Call | null>(
    null,
  );
  // Tracks the Device's audio helper so inbound VoiceCallPanel can switch devices
  const [deviceAudio, setDeviceAudio] = useState<Device["audio"] | null>(null);

  // POST /api/voice/availability — called ONLY from registered/unregistered events.
  const reportAvailability = useCallback(
    (available: boolean) => {
      if (!sessionToken) return;
      fetch("/api/voice/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ available }),
      }).catch(() => {});
    },
    [sessionToken],
  );

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/voice/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) return null;
      const { token } = await res.json();
      return token || null;
    } catch {
      return null;
    }
  }, [sessionToken]);

  // When an outbound call is dispatched without a client name (e.g. from the dialpad),
  // look up the phone number so the panel shows the real name instead of the raw number.
  useEffect(() => {
    if (!outboundCall || outboundCall.clientName || !sessionToken) return;
    const { phone } = outboundCall;
    fetch(
      `/api/conversations/lookup-contact?phone=${encodeURIComponent(phone)}`,
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.found) {
          dispatch(
            resolveOutboundCallName({
              clientName: data.client_name ?? null,
              clientId: data.client_id ?? null,
            }),
          );
        }
      })
      .catch(() => {});
  }, [outboundCall?.phone, sessionToken, dispatch]);

  // Create the Device once per session token.
  useEffect(() => {
    if (!sessionToken) return;

    let device: Device | null = null;

    const setup = async () => {
      // Reset any stale DB availability from a previous session/tab before we start.
      reportAvailability(false);
      dispatch(setDeviceStatus("connecting"));

      const token = await fetchToken();
      if (!token) {
        logger.error("[GlobalVoiceManager] Failed to fetch voice token");
        dispatch(setDeviceStatus("error"));
        return;
      }

      device = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true,
        maxAverageBitrate: 40000,
        enableImprovedSignalingErrorPrecision: true,
        // Allow inbound ringing even while in an active call
        allowIncomingWhileBusy: true,
      } as ConstructorParameters<typeof Device>[1]);
      deviceRef.current = device;

      // Expose audio helper for device selection in inbound call panels
      setDeviceAudio(device.audio);
      // changes — never before register() / unregister() completes. This prevents
      // the race where DB says available but no Device endpoint is registered yet.
      device.on("registered", () => {
        logger.log("[GlobalVoiceManager] Device registered ✅");
        dispatch(setDeviceStatus("registered"));
        reportAvailability(true);
      });

      device.on("unregistered", () => {
        logger.log("[GlobalVoiceManager] Device unregistered");
        dispatch(setDeviceStatus("idle"));
        reportAvailability(false);
      });

      device.on("error", (err) => {
        logger.error("[GlobalVoiceManager] Device error:", err);
        dispatch(setDeviceStatus("error"));
      });

      device.on("tokenAboutToExpire", async () => {
        logger.log("[GlobalVoiceManager] Token about to expire — refreshing");
        const newToken = await fetchToken();
        if (newToken) device?.updateToken(newToken);
      });

      device.on("tokenExpired", async () => {
        logger.warn("[GlobalVoiceManager] Token expired — refreshing");
        const newToken = await fetchToken();
        if (newToken) device?.updateToken(newToken);
      });

      // ── Incoming call ─────────────────────────────────────────────
      device.on("incoming", (call: Call) => {
        // Guard: if already handling a call, reject the duplicate.
        // This can happen if a stale Device registration from a previous page
        // load causes Twilio to send incoming to two endpoints simultaneously.
        if (ringingCallRef.current) {
          logger.warn(
            "[GlobalVoiceManager] Already ringing — rejecting duplicate",
          );
          call.reject();
          return;
        }

        const from =
          call.parameters?.From || call.customParameters?.get("from") || "";
        logger.log("[GlobalVoiceManager] Incoming call from:", from);
        ringingCallRef.current = call;
        ringingCallSidRef.current = call.parameters?.CallSid ?? null;
        setRingingPhone(from);
        setRingingClientName(null);
        setRingingClientId(null);
        setRingingCall(call);

        // Look up the caller's client record by phone number
        if (from && sessionToken) {
          fetch(
            `/api/conversations/lookup-contact?phone=${encodeURIComponent(from)}`,
            { headers: { Authorization: `Bearer ${sessionToken}` } },
          )
            .then((r) => r.json())
            .then((data) => {
              if (data.found) {
                setRingingClientName(data.client_name ?? null);
                setRingingClientId(data.client_id ?? null);
              }
            })
            .catch(() => {});
        }

        const clearRinging = () => {
          ringingCallRef.current = null;
          ringingCallSidRef.current = null;
          setRingingCall(null);
          setRingingPhone("");
          setRingingClientName(null);
          setRingingClientId(null);
        };

        call.on("cancel", clearRinging);
        call.on("reject", clearRinging);
        call.on("disconnect", () => {
          ringingCallRef.current = null;
          setActiveIncomingCall(null);
        });
      });

      // ── Register based on current availability preference ─────────
      // Mark ready so the [isAvailable] toggle effect can take over from here.
      deviceReadyRef.current = true;
      if (isAvailable) {
        device.register().catch((err) => {
          logger.error("[GlobalVoiceManager] register() failed:", err);
          dispatch(setDeviceStatus("error"));
        });
      } else {
        dispatch(setDeviceStatus("idle"));
      }
    };

    setup();

    return () => {
      deviceReadyRef.current = false;
      device?.removeAllListeners();
      device?.destroy();
      deviceRef.current = null;
      setDeviceAudio(null);
      dispatch(setDeviceStatus("idle"));
      reportAvailability(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // Handle availability toggle.
  // On initial mount this fires too, but deviceReadyRef.current is false then
  // so the device operations are skipped until setup() completes.
  useEffect(() => {
    if (!deviceReadyRef.current || !deviceRef.current) return;
    const device = deviceRef.current;

    if (isAvailable) {
      dispatch(setDeviceStatus("connecting"));
      device.register().catch((err) => {
        logger.error("[GlobalVoiceManager] register() failed on toggle:", err);
        dispatch(setDeviceStatus("error"));
      });
    } else {
      device.unregister().catch(() => {});
      if (ringingCallRef.current) {
        ringingCallRef.current.reject();
        ringingCallRef.current = null;
        setRingingCall(null);
        setRingingPhone("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvailable]);

  // Subscribe to Ably voice:incoming so we hear when another broker accepts.
  // When that happens, immediately dismiss this broker's ringing notification
  // without waiting for the Twilio SDK cancel event (which may lag under load).
  useEffect(() => {
    if (!sessionToken) return;
    let ablyClient: AblyLib.Realtime | null = null;

    const connect = async () => {
      try {
        const res = await fetch("/api/conversations/ably-token", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) return;
        const tokenRequest = await res.json();

        ablyClient = new AblyLib.Realtime({
          authCallback: (_tokenParams, callback) =>
            callback(null, tokenRequest),
        });

        const channel = ablyClient.channels.get("voice:incoming");
        channel.subscribe("call-answered", (msg) => {
          const { callSid } = (msg.data ?? {}) as { callSid?: string };
          // Only act if we're currently showing a ringing notification AND
          // the announced SID matches our ringing call (or no SID to match against).
          if (
            ringingCallRef.current &&
            (!callSid || ringingCallSidRef.current === callSid)
          ) {
            logger.log(
              "[GlobalVoiceManager] Ably: call answered by another broker — dismissing ringing UI",
            );
            // Tell the Twilio SDK to close this leg so audio resources are freed.
            ringingCallRef.current.reject();
            ringingCallRef.current = null;
            ringingCallSidRef.current = null;
            setRingingCall(null);
            setRingingPhone("");
            setRingingClientName(null);
            setRingingClientId(null);
          }
        });
      } catch {
        // Graceful degradation — the Twilio SDK cancel event is the fallback
      }
    };

    connect();

    return () => {
      ablyClient?.close();
    };
  }, [sessionToken]);

  const handleAccept = () => {
    if (!ringingCall) return;
    // Grab SID before clearing refs
    const sid = ringingCallSidRef.current;
    // Pass rtcConstraints so echo-cancellation / noise-suppression / AGC apply
    // to the actual WebRTC audio track the recipient hears, not just the meter.
    ringingCall.accept({
      rtcConstraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
    });
    setActiveIncomingCall(ringingCall);
    ringingCallRef.current = null;
    ringingCallSidRef.current = null;
    setRingingCall(null);
    // Immediately notify all other online brokers via Ably to dismiss their ringing UI
    if (sid && sessionToken) {
      fetch("/api/voice/call-answered", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ callSid: sid }),
      }).catch(() => {});
    }
  };

  const handleDecline = () => {
    if (!ringingCall) return;
    ringingCall.reject();
    ringingCallRef.current = null;
    setRingingCall(null);
    setRingingPhone("");
    setRingingClientName(null);
    setRingingClientId(null);
  };

  const handleCloseActive = () => {
    setActiveIncomingCall(null);
    setRingingPhone("");
    setRingingClientName(null);
    setRingingClientId(null);
  };

  if (!sessionToken) return null;

  return (
    <>
      {/* Ringing notification */}
      {ringingCall && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card border border-green-300 shadow-2xl rounded-2xl p-4 w-80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="p-3 bg-green-100 rounded-full">
                  <PhoneIncoming className="h-5 w-5 text-green-600" />
                </div>
                <span className="absolute inset-0 rounded-full animate-ping bg-green-300 opacity-50" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Incoming Call
                </p>
                {ringingClientName ? (
                  <>
                    <p className="text-sm font-medium text-green-700 truncate">
                      {ringingClientName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ringingPhone || "Unknown number"}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">
                    {ringingPhone || "Unknown number"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-sm gap-1.5"
                onClick={handleAccept}
              >
                <Phone className="h-4 w-4" />
                Accept
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-9 text-sm gap-1.5"
                onClick={handleDecline}
              >
                <PhoneOff className="h-4 w-4" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active call panel after accepting */}
      {activeIncomingCall && (
        <div className="fixed bottom-6 left-6 z-50 w-80 animate-in slide-in-from-bottom-4 duration-300">
          <VoiceCallPanel
            phone={ringingPhone || "Unknown"}
            clientName={ringingClientName || ringingPhone || "Client"}
            clientId={ringingClientId ?? undefined}
            activeCall={activeIncomingCall}
            direction="inbound"
            deviceAudio={deviceAudio}
            onClose={handleCloseActive}
          />
        </div>
      )}

      {/* Persistent outbound call panel — rendered here so it survives page navigation */}
      {outboundCall && (
        <div className="fixed bottom-6 right-6 z-50 w-80 shadow-2xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <VoiceCallPanel
            phone={outboundCall.phone}
            clientName={outboundCall.clientName}
            clientId={outboundCall.clientId}
            applicationId={outboundCall.applicationId}
            onClose={() => dispatch(endOutboundCall())}
          />
        </div>
      )}
    </>
  );
};

export default GlobalVoiceManager;
