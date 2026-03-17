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
} from "@shared/api";
import type { RootState } from "../index";

interface BrokersState {
  brokers: Broker[];
  isLoading: boolean;
  error: string | null;
  /** Full profile details when admin edits a broker */
  selectedBrokerProfile: BrokerProfileDetails | null;
  profileLoading: boolean;
  /** Share link fetched for a specific broker */
  brokerShareLink: { public_token: string; share_url: string } | null;
  shareLinkLoading: boolean;
}

const initialState: BrokersState = {
  brokers: [],
  isLoading: false,
  error: null,
  selectedBrokerProfile: null,
  profileLoading: false,
  brokerShareLink: null,
  shareLinkLoading: false,
};

export const fetchBrokers = createAsyncThunk(
  "brokers/fetchBrokers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetBrokersResponse>("/api/brokers", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.brokers;
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
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
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
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
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

/** Admin: fetch full profile (bio, office, avatar) for any broker */
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

/** Admin: update profile fields for any broker */
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

/** Admin: upload avatar for any broker (uploads to CDN, then stores URL) */
export const uploadBrokerAvatarByAdmin = createAsyncThunk(
  "brokers/uploadBrokerAvatarByAdmin",
  async (
    { id, file }: { id: number; file: File },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const avatarUrl = await uploadAvatarToCDN(file, id);
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

/** Logged-in broker: fetch their own share link */
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

/** Admin: fetch share link for any broker */
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
        state.brokers = action.payload;
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
        if (index !== -1) {
          state.brokers[index] = action.payload;
        }
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
      });
  },
});

export const {
  clearBrokers,
  clearSelectedBrokerProfile,
  clearBrokerShareLink,
} = brokersSlice.actions;
export default brokersSlice.reducer;
