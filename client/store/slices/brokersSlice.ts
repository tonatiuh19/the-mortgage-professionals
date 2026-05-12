import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { uploadAvatarToCDN } from "@/lib/cdn-upload";
import type {
  GetBrokersResponse,
  Broker,
  CreateBrokerRequest,
  UpdateBrokerRequest,
  BrokerResponse,
  BrokerProfileDetails,
  GetBrokerProfileResponse,
  UpdateBrokerProfileRequest,
  UpdateBrokerProfileResponse,
  AdminBrokerShareLinkResponse,
  ConvertBrokerToClientRequest,
  ConvertBrokerToClientResponse,
  PaginationInfo,
} from "@shared/api";
import type { RootState } from "../index";

interface BrokersState {
  brokers: Broker[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  // Mortgage Bankers (admin-role) list for dropdowns
  mortgageBankers: Broker[];
  mortgageBankersLoading: boolean;
  // Selected broker profile (for admin editing)
  selectedBrokerProfile: BrokerProfileDetails | null;
  profileLoading: boolean;
  // Share link for a specific broker (admin view)
  brokerShareLink: { public_token: string; share_url: string } | null;
  shareLinkLoading: boolean;
}

const initialState: BrokersState = {
  brokers: [],
  pagination: null,
  isLoading: false,
  error: null,
  mortgageBankers: [],
  mortgageBankersLoading: false,
  selectedBrokerProfile: null,
  profileLoading: false,
  brokerShareLink: null,
  shareLinkLoading: false,
};

interface FetchBrokersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
}

export const fetchBrokers = createAsyncThunk(
  "brokers/fetchBrokers",
  async (params: FetchBrokersParams | void, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetBrokersResponse>("/api/brokers", {
        headers: { Authorization: `Bearer ${sessionToken}` },
        params: params ?? {},
      });
      return { brokers: data.brokers, pagination: data.pagination };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch brokers",
      );
    }
  },
);

export const createBroker = createAsyncThunk(
  "brokers/createBroker",
  async (payload: CreateBrokerRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<BrokerResponse>(
        "/api/brokers",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.broker;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create broker",
      );
    }
  },
);

export const updateBroker = createAsyncThunk(
  "brokers/updateBroker",
  async (
    { id, ...payload }: UpdateBrokerRequest & { id: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<BrokerResponse>(
        `/api/brokers/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.broker;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update broker",
      );
    }
  },
);

export const deleteBroker = createAsyncThunk(
  "brokers/deleteBroker",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/brokers/${id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete broker",
      );
    }
  },
);

/** Admin: fetch full profile (inc. bio, office, avatar) for any broker */
export const fetchBrokerProfileForEdit = createAsyncThunk(
  "brokers/fetchBrokerProfileForEdit",
  async (brokerId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetBrokerProfileResponse>(
        `/api/brokers/${brokerId}/profile`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch broker profile",
      );
    }
  },
);

/** Admin: update profile fields (bio, office, years_experience) for any broker */
export const updateBrokerProfileByAdmin = createAsyncThunk(
  "brokers/updateBrokerProfileByAdmin",
  async (
    { id, ...payload }: UpdateBrokerProfileRequest & { id: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<UpdateBrokerProfileResponse>(
        `/api/brokers/${id}/profile`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update broker profile",
      );
    }
  },
);

/** Admin: upload avatar for any broker (uploads to CDN, then stores CDN URL) */
export const uploadBrokerAvatarByAdmin = createAsyncThunk(
  "brokers/uploadBrokerAvatarByAdmin",
  async (
    { id, file }: { id: number; file: File },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;

      // Step 1 — Upload image to CDN (same helper used by own-profile upload)
      const avatarUrl = await uploadAvatarToCDN(file, id);

      // Step 2 — Save CDN URL to our DB
      const { data } = await axios.put<{
        success: boolean;
        avatar_url: string;
      }>(
        `/api/brokers/${id}/avatar`,
        { avatar_url: avatarUrl },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { id, avatar_url: data.avatar_url };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.message ||
          "Failed to upload avatar",
      );
    }
  },
);

/** Fetch all active Mortgage Bankers (role=admin) for dropdowns — stored separately from the main paginated list */
export const fetchMortgageBankers = createAsyncThunk(
  "brokers/fetchMortgageBankers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetBrokersResponse>("/api/brokers", {
        headers: { Authorization: `Bearer ${sessionToken}` },
        params: { role: "admin", limit: 100 },
      });
      return data.brokers;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch mortgage bankers",
      );
    }
  },
);

/** Admin: get share link for any broker */
/** Self-service: fetch the logged-in broker's own share link */
export const fetchMyShareLink = createAsyncThunk(
  "brokers/fetchMyShareLink",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<AdminBrokerShareLinkResponse>(
        `/api/brokers/my-share-link`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch share link",
      );
    }
  },
);

export const fetchBrokerShareLink = createAsyncThunk(
  "brokers/fetchBrokerShareLink",
  async (brokerId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<AdminBrokerShareLinkResponse>(
        `/api/brokers/${brokerId}/share-link`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch share link",
      );
    }
  },
);

export const convertBrokerToClient = createAsyncThunk(
  "brokers/convertBrokerToClient",
  async (
    {
      brokerId,
      payload,
    }: { brokerId: number; payload: ConvertBrokerToClientRequest },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<ConvertBrokerToClientResponse>(
        `/api/brokers/${brokerId}/convert-to-client`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { brokerId, ...data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to convert broker to client",
      );
    }
  },
);

const brokersSlice = createSlice({
  name: "brokers",
  initialState,
  reducers: {
    clearBrokers: (state) => {
      state.brokers = [];
      state.error = null;
    },
    clearSelectedBrokerProfile: (state) => {
      state.selectedBrokerProfile = null;
    },
    clearBrokerShareLink: (state) => {
      state.brokerShareLink = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch brokers
      .addCase(fetchBrokers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBrokers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brokers = action.payload.brokers;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBrokers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create broker
      .addCase(createBroker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBroker.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brokers.push(action.payload);
      })
      .addCase(createBroker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update broker
      .addCase(updateBroker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBroker.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.brokers.findIndex(
          (b) => b.id === action.payload.id,
        );
        if (index !== -1) state.brokers[index] = action.payload;
      })
      .addCase(updateBroker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete broker
      .addCase(deleteBroker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBroker.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brokers = state.brokers.filter((b) => b.id !== action.payload);
      })
      .addCase(deleteBroker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch mortgage bankers
      .addCase(fetchMortgageBankers.pending, (state) => {
        state.mortgageBankersLoading = true;
      })
      .addCase(fetchMortgageBankers.fulfilled, (state, action) => {
        state.mortgageBankersLoading = false;
        state.mortgageBankers = action.payload;
      })
      .addCase(fetchMortgageBankers.rejected, (state) => {
        state.mortgageBankersLoading = false;
      })
      // Fetch broker profile for edit
      .addCase(fetchBrokerProfileForEdit.pending, (state) => {
        state.profileLoading = true;
        state.selectedBrokerProfile = null;
      })
      .addCase(fetchBrokerProfileForEdit.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.selectedBrokerProfile = action.payload;
      })
      .addCase(fetchBrokerProfileForEdit.rejected, (state) => {
        state.profileLoading = false;
      })
      // Update broker profile by admin
      .addCase(updateBrokerProfileByAdmin.fulfilled, (state, action) => {
        state.selectedBrokerProfile = action.payload;
      })
      // Upload broker avatar by admin
      .addCase(uploadBrokerAvatarByAdmin.fulfilled, (state, action) => {
        if (
          state.selectedBrokerProfile &&
          state.selectedBrokerProfile.id === action.payload.id
        ) {
          state.selectedBrokerProfile.avatar_url = action.payload.avatar_url;
        }
      })
      // Fetch broker share link (admin)
      .addCase(fetchBrokerShareLink.pending, (state) => {
        state.shareLinkLoading = true;
        state.brokerShareLink = null;
      })
      .addCase(fetchBrokerShareLink.fulfilled, (state, action) => {
        state.shareLinkLoading = false;
        state.brokerShareLink = {
          public_token: action.payload.public_token,
          share_url: action.payload.share_url,
        };
      })
      .addCase(fetchBrokerShareLink.rejected, (state) => {
        state.shareLinkLoading = false;
      })
      // Fetch own share link (partner self-service)
      .addCase(fetchMyShareLink.pending, (state) => {
        state.shareLinkLoading = true;
        state.brokerShareLink = null;
      })
      .addCase(fetchMyShareLink.fulfilled, (state, action) => {
        state.shareLinkLoading = false;
        state.brokerShareLink = {
          public_token: action.payload.public_token,
          share_url: action.payload.share_url,
        };
      })
      .addCase(fetchMyShareLink.rejected, (state) => {
        state.shareLinkLoading = false;
      })
      // Convert broker to client
      .addCase(convertBrokerToClient.fulfilled, (state, action) => {
        // Remove the converted (now inactive) broker from the list
        state.brokers = state.brokers.filter(
          (b) => b.id !== action.payload.brokerId,
        );
        if (state.selectedBrokerProfile?.id === action.payload.brokerId) {
          state.selectedBrokerProfile = null;
        }
      });
  },
});

export const {
  clearBrokers,
  clearSelectedBrokerProfile,
  clearBrokerShareLink,
} = brokersSlice.actions;
export default brokersSlice.reducer;
