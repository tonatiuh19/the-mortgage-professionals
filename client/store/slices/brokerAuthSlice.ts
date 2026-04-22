import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { logger } from "@/lib/logger";
import { uploadAvatarToCDN } from "@/lib/cdn-upload";
import type {
  AdminInitResponse,
  GetBrokerProfileResponse,
  UpdateBrokerProfileRequest,
  UpdateBrokerProfileResponse,
} from "@shared/api";

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
  public_token?: string | null;
  timezone?: string;
  // profile fields
  avatar_url?: string | null;
  bio?: string | null;
  office_address?: string | null;
  office_city?: string | null;
  office_state?: string | null;
  office_zip?: string | null;
  years_experience?: number | null;
  total_loans_closed?: number;
}

interface BrokerAuthState {
  user: BrokerUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  profileLoading: boolean;
  profileSaving: boolean;
  avatarUploading: boolean;
  error: string | null;
  profileError: string | null;
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
  profileLoading: false,
  profileSaving: false,
  avatarUploading: false,
  error: null,
  profileError: null,
};

// Async thunks
export const sendVerificationCode = createAsyncThunk(
  "brokerAuth/sendCode",
  async (
    {
      email,
      delivery_method = "email",
    }: { email: string; delivery_method?: "email" | "sms" | "call" | "call" },
    { rejectWithValue },
  ) => {
    try {
      const response = await axios.post("/api/admin/auth/send-code", {
        email,
        delivery_method,
      });
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
      logger.error("Logout error:", error);
    }
  },
);

/** Single bootstrap call — replaces validateSession + fetchBrokerProfile + fetchAdminSectionControls */
export const initAdminSession = createAsyncThunk(
  "brokerAuth/init",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { brokerAuth: BrokerAuthState };
      const token = state.brokerAuth.sessionToken;
      const { data } = await axios.get<AdminInitResponse>("/api/admin/init", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to initialise admin session",
      );
    }
  },
);

export const fetchBrokerProfile = createAsyncThunk(
  "brokerAuth/fetchProfile",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { brokerAuth: BrokerAuthState };
      const token = state.brokerAuth.sessionToken;
      const { data } = await axios.get<GetBrokerProfileResponse>(
        "/api/admin/profile",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load profile",
      );
    }
  },
);

export const updateBrokerProfile = createAsyncThunk(
  "brokerAuth/updateProfile",
  async (
    payload: UpdateBrokerProfileRequest,
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as { brokerAuth: BrokerAuthState };
      const token = state.brokerAuth.sessionToken;
      const { data } = await axios.put<UpdateBrokerProfileResponse>(
        "/api/admin/profile",
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update profile",
      );
    }
  },
);

export const uploadBrokerAvatar = createAsyncThunk(
  "brokerAuth/uploadAvatar",
  async (file: File, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { brokerAuth: BrokerAuthState };
      const brokerId = state.brokerAuth.user?.id!;
      const token = state.brokerAuth.sessionToken;

      // Step 1 — Upload image to CDN
      const avatarUrl = await uploadAvatarToCDN(file, brokerId);

      // Step 2 — Save CDN URL to our DB
      await axios.put(
        "/api/admin/profile/avatar",
        { avatar_url: avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      return avatarUrl;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.message ||
          "Failed to upload avatar",
      );
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
    clearProfileError: (state) => {
      state.profileError = null;
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
        // Persist refreshed user (including avatar_url) so next load has it
        localStorage.setItem(
          "broker_user",
          JSON.stringify(action.payload.admin),
        );
      })
      .addCase(validateSession.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.sessionToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem("broker_session");
        localStorage.removeItem("broker_user");
      });

    // Init admin session (merged bootstrap)
    builder
      .addCase(initAdminSession.pending, (state) => {
        state.profileLoading = true;
      })
      .addCase(initAdminSession.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.user = { ...state.user, ...action.payload.profile } as BrokerUser;
        state.isAuthenticated = true;
        state.error = null;
        localStorage.setItem("broker_user", JSON.stringify(state.user));
      })
      .addCase(initAdminSession.rejected, (state, action) => {
        state.profileLoading = false;
        // session invalid — clear everything
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

    // Fetch broker profile
    builder
      .addCase(fetchBrokerProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchBrokerProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.user = { ...state.user, ...action.payload } as BrokerUser;
        localStorage.setItem("broker_user", JSON.stringify(state.user));
      })
      .addCase(fetchBrokerProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload as string;
      });

    // Update broker profile
    builder
      .addCase(updateBrokerProfile.pending, (state) => {
        state.profileSaving = true;
        state.profileError = null;
      })
      .addCase(updateBrokerProfile.fulfilled, (state, action) => {
        state.profileSaving = false;
        state.user = { ...state.user, ...action.payload } as BrokerUser;
        localStorage.setItem("broker_user", JSON.stringify(state.user));
      })
      .addCase(updateBrokerProfile.rejected, (state, action) => {
        state.profileSaving = false;
        state.profileError = action.payload as string;
      });

    // Upload broker avatar
    builder
      .addCase(uploadBrokerAvatar.pending, (state) => {
        state.avatarUploading = true;
        state.profileError = null;
      })
      .addCase(uploadBrokerAvatar.fulfilled, (state, action) => {
        state.avatarUploading = false;
        if (state.user) {
          state.user.avatar_url = action.payload;
          localStorage.setItem("broker_user", JSON.stringify(state.user));
        }
      })
      .addCase(uploadBrokerAvatar.rejected, (state, action) => {
        state.avatarUploading = false;
        state.profileError = action.payload as string;
      });
  },
});

export const { clearError, clearProfileError, setUser } =
  brokerAuthSlice.actions;
export default brokerAuthSlice.reducer;
