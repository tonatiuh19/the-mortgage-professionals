import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetEmailTemplatesResponse,
  EmailTemplate,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  EmailTemplateResponse,
  GetSmsTemplatesResponse,
  SmsTemplate,
  CreateSmsTemplateRequest,
  UpdateSmsTemplateRequest,
  SmsTemplateResponse,
} from "@shared/api";

interface CommunicationTemplatesState {
  emailTemplates: EmailTemplate[];
  smsTemplates: SmsTemplate[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CommunicationTemplatesState = {
  emailTemplates: [],
  smsTemplates: [],
  isLoading: false,
  error: null,
};

// Email Templates Thunks
export const fetchEmailTemplates = createAsyncThunk(
  "communicationTemplates/fetchEmailTemplates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetEmailTemplatesResponse>(
        "/api/email-templates",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.templates;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch email templates",
      );
    }
  },
);

export const createEmailTemplate = createAsyncThunk(
  "communicationTemplates/createEmailTemplate",
  async (
    payload: CreateEmailTemplateRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<EmailTemplateResponse>(
        "/api/email-templates",
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.template;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create email template",
      );
    }
  },
);

export const updateEmailTemplate = createAsyncThunk(
  "communicationTemplates/updateEmailTemplate",
  async (
    { id, ...payload }: UpdateEmailTemplateRequest & { id: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<EmailTemplateResponse>(
        `/api/email-templates/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.template;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update email template",
      );
    }
  },
);

export const deleteEmailTemplate = createAsyncThunk(
  "communicationTemplates/deleteEmailTemplate",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/email-templates/${id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete email template",
      );
    }
  },
);

// SMS Templates Thunks
export const fetchSmsTemplates = createAsyncThunk(
  "communicationTemplates/fetchSmsTemplates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetSmsTemplatesResponse>(
        "/api/sms-templates",
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.templates;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch SMS templates",
      );
    }
  },
);

export const createSmsTemplate = createAsyncThunk(
  "communicationTemplates/createSmsTemplate",
  async (payload: CreateSmsTemplateRequest, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<SmsTemplateResponse>(
        "/api/sms-templates",
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.template;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create SMS template",
      );
    }
  },
);

export const updateSmsTemplate = createAsyncThunk(
  "communicationTemplates/updateSmsTemplate",
  async (
    { id, ...payload }: UpdateSmsTemplateRequest & { id: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<SmsTemplateResponse>(
        `/api/sms-templates/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.template;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update SMS template",
      );
    }
  },
);

export const deleteSmsTemplate = createAsyncThunk(
  "communicationTemplates/deleteSmsTemplate",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/sms-templates/${id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete SMS template",
      );
    }
  },
);

const communicationTemplatesSlice = createSlice({
  name: "communicationTemplates",
  initialState,
  reducers: {
    clearCommunicationTemplates: (state) => {
      state.emailTemplates = [];
      state.smsTemplates = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch email templates
      .addCase(fetchEmailTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmailTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.emailTemplates = action.payload;
      })
      .addCase(fetchEmailTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create email template
      .addCase(createEmailTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEmailTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.emailTemplates.unshift(action.payload);
      })
      .addCase(createEmailTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update email template
      .addCase(updateEmailTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEmailTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.emailTemplates.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (index !== -1) {
          state.emailTemplates[index] = action.payload;
        }
      })
      .addCase(updateEmailTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete email template
      .addCase(deleteEmailTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteEmailTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.emailTemplates = state.emailTemplates.filter(
          (t) => t.id !== action.payload,
        );
      })
      .addCase(deleteEmailTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch SMS templates
      .addCase(fetchSmsTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSmsTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.smsTemplates = action.payload;
      })
      .addCase(fetchSmsTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create SMS template
      .addCase(createSmsTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSmsTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.smsTemplates.unshift(action.payload);
      })
      .addCase(createSmsTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update SMS template
      .addCase(updateSmsTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSmsTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.smsTemplates.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (index !== -1) {
          state.smsTemplates[index] = action.payload;
        }
      })
      .addCase(updateSmsTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete SMS template
      .addCase(deleteSmsTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSmsTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.smsTemplates = state.smsTemplates.filter(
          (t) => t.id !== action.payload,
        );
      })
      .addCase(deleteSmsTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCommunicationTemplates } =
  communicationTemplatesSlice.actions;
export default communicationTemplatesSlice.reducer;
