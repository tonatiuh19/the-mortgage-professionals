import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

interface BrokerUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  tenant_id: number;
  status: "active" | "inactive" | "suspended";
  license_number?: string;
  specializations?: string[];
  email_verified: boolean;
  last_login?: string;
}

interface BrokerAuthState {
  user: BrokerUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Helper to get user from localStorage
const getSavedUser = (): BrokerUser | null => {
  try {
    const savedUser = localStorage.getItem("broker_user");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

const initialState: BrokerAuthState = {
  user: getSavedUser(),
  sessionToken: localStorage.getItem("broker_session"),
  isAuthenticated: !!localStorage.getItem("broker_session"),
  loading: false,
  error: null,
};

// Async thunks
export const sendVerificationCode = createAsyncThunk(
  "brokerAuth/sendCode",
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await axios.post("/api/admin/auth/send-code", { email });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send verification code",
      );
    }
  },
);

export const verifyCode = createAsyncThunk(
  "brokerAuth/verifyCode",
  async (
    { email, code }: { email: string; code: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await axios.post("/api/admin/auth/verify-code", {
        email,
        code,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Invalid verification code",
      );
    }
  },
);

export const validateSession = createAsyncThunk(
  "brokerAuth/validateSession",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { brokerAuth: BrokerAuthState };
      const token = state.brokerAuth.sessionToken;

      if (!token) {
        throw new Error("No session token");
      }

      const response = await axios.get("/api/admin/auth/validate", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Session validation failed",
      );
    }
  },
);

export const logout = createAsyncThunk(
  "brokerAuth/logout",
  async (_, { getState }) => {
    try {
      const state = getState() as { brokerAuth: BrokerAuthState };
      const token = state.brokerAuth.sessionToken;

      if (token) {
        await axios.post(
          "/api/admin/auth/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  },
);

const brokerAuthSlice = createSlice({
  name: "brokerAuth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<BrokerUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    // Send verification code
    builder
      .addCase(sendVerificationCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendVerificationCode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendVerificationCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Verify code
    builder
      .addCase(verifyCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.admin;
        state.sessionToken = action.payload.sessionToken;
        state.isAuthenticated = true;
        state.error = null;

        // Store in localStorage
        localStorage.setItem("broker_session", action.payload.sessionToken);
        localStorage.setItem(
          "broker_user",
          JSON.stringify(action.payload.admin),
        );
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Validate session
    builder
      .addCase(validateSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.admin;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(validateSession.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.sessionToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem("broker_session");
        localStorage.removeItem("broker_user");
      });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.sessionToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("broker_session");
      localStorage.removeItem("broker_user");
    });
  },
});

export const { clearError, setUser } = brokerAuthSlice.actions;
export default brokerAuthSlice.reducer;
