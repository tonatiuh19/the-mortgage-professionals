import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type DeviceStatus = "idle" | "connecting" | "registered" | "error";

export interface OutboundCallTarget {
  phone: string;
  clientName?: string | null;
  clientId?: number | null;
  applicationId?: number | null;
}

interface VoiceState {
  isAvailable: boolean;
  deviceStatus: DeviceStatus;
  /** When set, GlobalVoiceManager renders a persistent floating outbound call panel. */
  outboundCall: OutboundCallTarget | null;
}

const stored = localStorage.getItem("voice_available");

const initialState: VoiceState = {
  isAvailable: stored === null ? true : stored === "true",
  deviceStatus: "idle",
  outboundCall: null,
};

const voiceSlice = createSlice({
  name: "voice",
  initialState,
  reducers: {
    setVoiceAvailable(state, action: PayloadAction<boolean>) {
      state.isAvailable = action.payload;
      localStorage.setItem("voice_available", String(action.payload));
    },
    setDeviceStatus(state, action: PayloadAction<DeviceStatus>) {
      state.deviceStatus = action.payload;
    },
    startOutboundCall(state, action: PayloadAction<OutboundCallTarget>) {
      state.outboundCall = action.payload;
    },
    resolveOutboundCallName(
      state,
      action: PayloadAction<{
        clientName: string | null;
        clientId?: number | null;
      }>,
    ) {
      if (state.outboundCall) {
        state.outboundCall.clientName = action.payload.clientName;
        if (action.payload.clientId != null) {
          state.outboundCall.clientId = action.payload.clientId;
        }
      }
    },
    endOutboundCall(state) {
      state.outboundCall = null;
    },
  },
});

export const {
  setVoiceAvailable,
  setDeviceStatus,
  startOutboundCall,
  resolveOutboundCallName,
  endOutboundCall,
} = voiceSlice.actions;
export default voiceSlice.reducer;
