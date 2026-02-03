import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  ClientSendCodeRequest,
  ClientSendCodeResponse,
  ClientVerifyCodeRequest,
  ClientVerifyCodeResponse,
  ClientValidateSessionResponse,
  ClientInfo,
} from "@shared/api";

interface ClientAuthState {
  sessionToken: string | null;
  client: ClientInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  sendCodeLoading: boolean;
  verifyCodeLoading: boolean;
  shouldRedirectToWizard: boolean;
}

const initialState: ClientAuthState = {
  sessionToken: localStorage.getItem("client_session_token"),
  client: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  sendCodeLoading: false,
  verifyCodeLoading: false,
  shouldRedirectToWizard: false,
};

/**
 * Send verification code to client email
 */
export const sendClientCode = createAsyncThunk(
  "clientAuth/sendCode",
  async (data: ClientSendCodeRequest, { rejectWithValue }) => {
    try {
      const response = await axios.post<ClientSendCodeResponse>(
        "/api/client/auth/send-code",
        data,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to send verification code" },
      );
    }
  },
);

/**
 * Verify code and login client
 */
export const verifyClientCode = createAsyncThunk(
  "clientAuth/verifyCode",
  async (data: ClientVerifyCodeRequest, { rejectWithValue }) => {
    try {
      const response = await axios.post<ClientVerifyCodeResponse>(
        "/api/client/auth/verify-code",
        data,
      );
      if (response.data.success && response.data.sessionToken) {
        localStorage.setItem(
          "client_session_token",
          response.data.sessionToken,
        );
      }
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to verify code",
      );
    }
  },
);

/**
 * Validate existing session
 */
export const validateClientSession = createAsyncThunk(
  "clientAuth/validate",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      if (!token) {
        return rejectWithValue("No session token found");
      }

      const response = await axios.get<ClientValidateSessionResponse>(
        "/api/client/auth/validate",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      localStorage.removeItem("client_session_token");
      return rejectWithValue(
        error.response?.data?.message || "Session validation failed",
      );
    }
  },
);

/**
 * Logout client
 */
export const logoutClient = createAsyncThunk(
  "clientAuth/logout",
  async (_, { getState }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      if (token) {
        await axios.post(
          "/api/client/auth/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      localStorage.removeItem("client_session_token");
      return true;
    } catch (error) {
      localStorage.removeItem("client_session_token");
      return true;
    }
  },
);

const clientAuthSlice = createSlice({
  name: "clientAuth",
  initialState,
  reducers: {
    clearClientError: (state) => {
      state.error = null;
    },
    clearRedirectFlag: (state) => {
      state.shouldRedirectToWizard = false;
    },
  },
  extraReducers: (builder) => {
    // Send code
    builder
      .addCase(sendClientCode.pending, (state) => {
        state.sendCodeLoading = true;
        state.error = null;
        state.shouldRedirectToWizard = false;
      })
      .addCase(sendClientCode.fulfilled, (state, action) => {
        state.sendCodeLoading = false;
        // Check if client not found and should redirect to wizard
        if (action.payload.redirect === "/wizard") {
          state.shouldRedirectToWizard = true;
          state.error = "Client not found. Please create an application first.";
        }
      })
      .addCase(sendClientCode.rejected, (state, action: any) => {
        state.sendCodeLoading = false;
        const payload = action.payload;
        if (
          payload?.message === "client_not_found" ||
          payload?.redirect === "/wizard"
        ) {
          state.shouldRedirectToWizard = true;
          state.error = "No account found. Let's get you pre-approved!";
        } else {
          state.error = payload?.message || (action.payload as string);
        }
      });

    // Verify code
    builder
      .addCase(verifyClientCode.pending, (state) => {
        state.verifyCodeLoading = true;
        state.error = null;
      })
      .addCase(verifyClientCode.fulfilled, (state, action) => {
        state.verifyCodeLoading = false;
        if (action.payload.sessionToken && action.payload.client) {
          state.sessionToken = action.payload.sessionToken;
          state.client = action.payload.client;
          state.isAuthenticated = true;
        }
      })
      .addCase(verifyClientCode.rejected, (state, action) => {
        state.verifyCodeLoading = false;
        state.error = action.payload as string;
      });

    // Validate session
    builder
      .addCase(validateClientSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateClientSession.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.client) {
          state.client = action.payload.client;
          state.isAuthenticated = true;
        }
      })
      .addCase(validateClientSession.rejected, (state, action) => {
        state.loading = false;
        state.sessionToken = null;
        state.client = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutClient.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutClient.fulfilled, (state) => {
        state.loading = false;
        state.sessionToken = null;
        state.client = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutClient.rejected, (state) => {
        state.loading = false;
        state.sessionToken = null;
        state.client = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearClientError, clearRedirectFlag } = clientAuthSlice.actions;

// Selectors
export const selectClientAuth = (state: RootState) => state.clientAuth;
export const selectClient = (state: RootState) => state.clientAuth.client;
export const selectIsClientAuthenticated = (state: RootState) =>
  state.clientAuth.isAuthenticated;
export const selectClientAuthLoading = (state: RootState) =>
  state.clientAuth.loading;
export const selectClientAuthError = (state: RootState) =>
  state.clientAuth.error;
export const selectShouldRedirectToWizard = (state: RootState) =>
  state.clientAuth.shouldRedirectToWizard;

export default clientAuthSlice.reducer;
