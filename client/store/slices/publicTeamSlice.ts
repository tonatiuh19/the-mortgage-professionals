import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type {
  MyPublicProfileStatus,
  PublicProfileReviewAction,
  PublicProfileReviewItem,
  PublicTeamMember,
  PublicTeamResponse,
  RolePublicListingSetting,
} from "@shared/api";
import type { RootState } from "../index";

interface PublicTeamState {
  members: PublicTeamMember[];
  membersStatus: "idle" | "loading" | "loaded" | "failed";
  myProfile: MyPublicProfileStatus | null;
  myProfileLoading: boolean;
  mySubmitting: boolean;
  reviewPeople: PublicProfileReviewItem[];
  roles: RolePublicListingSetting[];
  reviewLoading: boolean;
  reviewSavingId: number | null;
  rolesSaving: boolean;
  error: string | null;
}

const initialState: PublicTeamState = {
  members: [],
  membersStatus: "idle",
  myProfile: null,
  myProfileLoading: false,
  mySubmitting: false,
  reviewPeople: [],
  roles: [],
  reviewLoading: false,
  reviewSavingId: null,
  rolesSaving: false,
  error: null,
};

const authHeaders = (getState: () => unknown) => ({
  headers: {
    Authorization: `Bearer ${(getState() as RootState).brokerAuth.sessionToken}`,
  },
});

const errorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error || error?.response?.data?.message || fallback;

// ─── Public ────────────────────────────────────────────────────────────────

export const fetchPublicTeam = createAsyncThunk(
  "publicTeam/fetchPublic",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<PublicTeamResponse>("/api/public/team");
      return data.members;
    } catch (error: any) {
      return rejectWithValue(errorMessage(error, "Failed to load team"));
    }
  },
);

// ─── Signed-in team member ─────────────────────────────────────────────────

export const fetchMyPublicProfile = createAsyncThunk(
  "publicTeam/fetchMine",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<{ profile: MyPublicProfileStatus }>(
        "/api/broker/public-profile",
        authHeaders(getState),
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(errorMessage(error, "Failed to load website listing"));
    }
  },
);

export const requestPublicProfile = createAsyncThunk(
  "publicTeam/request",
  async (payload: { public_title?: string }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<{ profile: MyPublicProfileStatus }>(
        "/api/broker/public-profile/request",
        payload,
        authHeaders(getState),
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(errorMessage(error, "Failed to submit request"));
    }
  },
);

export const withdrawPublicProfile = createAsyncThunk(
  "publicTeam/withdraw",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<{ profile: MyPublicProfileStatus }>(
        "/api/broker/public-profile/withdraw",
        {},
        authHeaders(getState),
      );
      return data.profile;
    } catch (error: any) {
      return rejectWithValue(errorMessage(error, "Failed to update listing"));
    }
  },
);

// ─── Platform owner ────────────────────────────────────────────────────────

export const fetchPublicProfileReviews = createAsyncThunk(
  "publicTeam/fetchReviews",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<{
        people: PublicProfileReviewItem[];
        roles: RolePublicListingSetting[];
      }>("/api/admin/public-profiles", authHeaders(getState));
      return data;
    } catch (error: any) {
      return rejectWithValue(errorMessage(error, "Failed to load website team"));
    }
  },
);

export const reviewPublicProfile = createAsyncThunk(
  "publicTeam/review",
  async (
    payload: {
      brokerId: number;
      action: PublicProfileReviewAction;
      reason?: string;
      public_title?: string;
      public_display_order?: number;
    },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const { brokerId, ...body } = payload;
      await axios.post(
        `/api/admin/public-profiles/${brokerId}/review`,
        body,
        authHeaders(getState),
      );
      await dispatch(fetchPublicProfileReviews());
      return brokerId;
    } catch (error: any) {
      return rejectWithValue(errorMessage(error, "Failed to update listing"));
    }
  },
);

export const updatePublicListingRoles = createAsyncThunk(
  "publicTeam/updateRoles",
  async (roles: RolePublicListingSetting[], { getState, dispatch, rejectWithValue }) => {
    try {
      const { data } = await axios.put<{ roles: RolePublicListingSetting[] }>(
        "/api/admin/public-profiles/roles",
        { roles },
        authHeaders(getState),
      );
      // Role changes alter each person's readiness checklist.
      dispatch(fetchPublicProfileReviews());
      return data.roles;
    } catch (error: any) {
      // Undo the optimistic switch by reloading the saved settings.
      dispatch(fetchPublicProfileReviews());
      return rejectWithValue(errorMessage(error, "Failed to update roles"));
    }
  },
);

const publicTeamSlice = createSlice({
  name: "publicTeam",
  initialState,
  reducers: {
    clearPublicTeamError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicTeam.pending, (state) => {
        state.membersStatus = "loading";
      })
      .addCase(fetchPublicTeam.fulfilled, (state, action) => {
        state.membersStatus = "loaded";
        state.members = action.payload;
      })
      .addCase(fetchPublicTeam.rejected, (state) => {
        state.membersStatus = "failed";
      })
      .addCase(fetchMyPublicProfile.pending, (state) => {
        state.myProfileLoading = true;
      })
      .addCase(fetchMyPublicProfile.fulfilled, (state, action) => {
        state.myProfileLoading = false;
        state.myProfile = action.payload;
      })
      .addCase(fetchMyPublicProfile.rejected, (state, action) => {
        state.myProfileLoading = false;
        state.error = action.payload as string;
      });

    for (const thunk of [requestPublicProfile, withdrawPublicProfile]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.mySubmitting = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mySubmitting = false;
          state.myProfile = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mySubmitting = false;
          state.error = action.payload as string;
        });
    }

    builder
      .addCase(fetchPublicProfileReviews.pending, (state) => {
        state.reviewLoading = state.reviewPeople.length === 0;
      })
      .addCase(fetchPublicProfileReviews.fulfilled, (state, action) => {
        state.reviewLoading = false;
        state.reviewPeople = action.payload.people;
        state.roles = action.payload.roles;
      })
      .addCase(fetchPublicProfileReviews.rejected, (state, action) => {
        state.reviewLoading = false;
        state.error = action.payload as string;
      })
      .addCase(reviewPublicProfile.pending, (state, action) => {
        state.reviewSavingId = action.meta.arg.brokerId;
        state.error = null;
      })
      .addCase(reviewPublicProfile.fulfilled, (state) => {
        state.reviewSavingId = null;
      })
      .addCase(reviewPublicProfile.rejected, (state, action) => {
        state.reviewSavingId = null;
        state.error = action.payload as string;
      })
      .addCase(updatePublicListingRoles.pending, (state, action) => {
        state.rolesSaving = true;
        state.roles = action.meta.arg; // optimistic
      })
      .addCase(updatePublicListingRoles.fulfilled, (state, action) => {
        state.rolesSaving = false;
        state.roles = action.payload;
      })
      .addCase(updatePublicListingRoles.rejected, (state, action) => {
        state.rolesSaving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPublicTeamError } = publicTeamSlice.actions;
export default publicTeamSlice.reducer;
