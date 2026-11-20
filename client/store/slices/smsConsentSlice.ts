import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { PublicSmsConsentConfigResponse } from "@shared/api";
import {
  buildSmsConsentTexts,
  SMS_CONSENT_DEFAULT_BUSINESS_NAME,
  SMS_CONSENT_VERSION,
  type SmsConsentTexts,
} from "@shared/sms-consent";
import type { RootState } from "../index";

interface SmsConsentState {
  businessName: string;
  version: string;
  texts: SmsConsentTexts;
  status: "idle" | "loading" | "loaded" | "failed";
}

// Render the default wording immediately so forms never wait on the network;
// the server copy (tenant-branded) replaces it once loaded.
const initialState: SmsConsentState = {
  businessName: SMS_CONSENT_DEFAULT_BUSINESS_NAME,
  version: SMS_CONSENT_VERSION,
  texts: buildSmsConsentTexts(),
  status: "idle",
};

export const fetchSmsConsentConfig = createAsyncThunk(
  "smsConsent/fetchConfig",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<PublicSmsConsentConfigResponse>(
        "/api/public/sms-consent",
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.error || "Failed to load SMS consent text",
      );
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = (getState() as RootState).smsConsent;
      return status === "idle" || status === "failed";
    },
  },
);

const smsConsentSlice = createSlice({
  name: "smsConsent",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSmsConsentConfig.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSmsConsentConfig.fulfilled, (state, action) => {
        state.status = "loaded";
        state.businessName = action.payload.business_name;
        state.version = action.payload.version;
        state.texts = action.payload.texts;
      })
      .addCase(fetchSmsConsentConfig.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default smsConsentSlice.reducer;
