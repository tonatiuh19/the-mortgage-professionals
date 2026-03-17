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
  GetWhatsappTemplatesResponse,
  WhatsappTemplate,
  CreateWhatsappTemplateRequest,
  UpdateWhatsappTemplateRequest,
  WhatsappTemplateResponse,
  PipelineStepTemplate,
  GetPipelineStepTemplatesResponse,
  UpsertPipelineStepTemplateRequest,
  UpsertPipelineStepTemplateResponse,
} from "@shared/api";

interface CommunicationTemplatesState {
  emailTemplates: EmailTemplate[];
  smsTemplates: SmsTemplate[];
  whatsappTemplates: WhatsappTemplate[];
  pipelineStepTemplates: PipelineStepTemplate[];
  isLoading: boolean;
  pipelineLoading: boolean;
  error: string | null;
}

const initialState: CommunicationTemplatesState = {
  emailTemplates: [],
  smsTemplates: [],
  whatsappTemplates: [],
  pipelineStepTemplates: [],
  isLoading: false,
  pipelineLoading: false,
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

// WhatsApp Templates Thunks
export const fetchWhatsappTemplates = createAsyncThunk(
  "communicationTemplates/fetchWhatsappTemplates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetWhatsappTemplatesResponse>(
        "/api/whatsapp-templates",
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.templates;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch WhatsApp templates",
      );
    }
  },
);

export const createWhatsappTemplate = createAsyncThunk(
  "communicationTemplates/createWhatsappTemplate",
  async (
    payload: CreateWhatsappTemplateRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post<WhatsappTemplateResponse>(
        "/api/whatsapp-templates",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.template;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create WhatsApp template",
      );
    }
  },
);

export const updateWhatsappTemplate = createAsyncThunk(
  "communicationTemplates/updateWhatsappTemplate",
  async (
    { id, ...payload }: UpdateWhatsappTemplateRequest & { id: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<WhatsappTemplateResponse>(
        `/api/whatsapp-templates/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.template;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update WhatsApp template",
      );
    }
  },
);

export const deleteWhatsappTemplate = createAsyncThunk(
  "communicationTemplates/deleteWhatsappTemplate",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/whatsapp-templates/${id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete WhatsApp template",
      );
    }
  },
);

// Pipeline Step Templates Thunks
export const fetchPipelineStepTemplates = createAsyncThunk(
  "communicationTemplates/fetchPipelineStepTemplates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetPipelineStepTemplatesResponse>(
        "/api/pipeline-step-templates",
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.assignments;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          "Failed to fetch pipeline step templates",
      );
    }
  },
);

export const upsertPipelineStepTemplate = createAsyncThunk(
  "communicationTemplates/upsertPipelineStepTemplate",
  async (
    payload: UpsertPipelineStepTemplateRequest,
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.put<UpsertPipelineStepTemplateResponse>(
        "/api/pipeline-step-templates",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.assignment;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to save pipeline step template",
      );
    }
  },
);

export const deletePipelineStepTemplate = createAsyncThunk(
  "communicationTemplates/deletePipelineStepTemplate",
  async (
    { step, channel }: { step: string; channel: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/pipeline-step-templates/${step}/${channel}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return { step, channel };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          "Failed to delete pipeline step template",
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
      state.whatsappTemplates = [];
      state.pipelineStepTemplates = [];
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
      })
      // Fetch WhatsApp templates
      .addCase(fetchWhatsappTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWhatsappTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.whatsappTemplates = action.payload;
      })
      .addCase(fetchWhatsappTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create WhatsApp template
      .addCase(createWhatsappTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWhatsappTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.whatsappTemplates.unshift(action.payload);
      })
      .addCase(createWhatsappTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update WhatsApp template
      .addCase(updateWhatsappTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWhatsappTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.whatsappTemplates.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (index !== -1) state.whatsappTemplates[index] = action.payload;
      })
      .addCase(updateWhatsappTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete WhatsApp template
      .addCase(deleteWhatsappTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteWhatsappTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.whatsappTemplates = state.whatsappTemplates.filter(
          (t) => t.id !== action.payload,
        );
      })
      .addCase(deleteWhatsappTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch pipeline step templates
      .addCase(fetchPipelineStepTemplates.pending, (state) => {
        state.pipelineLoading = true;
        state.error = null;
      })
      .addCase(fetchPipelineStepTemplates.fulfilled, (state, action) => {
        state.pipelineLoading = false;
        state.pipelineStepTemplates = action.payload;
      })
      .addCase(fetchPipelineStepTemplates.rejected, (state, action) => {
        state.pipelineLoading = false;
        state.error = action.payload as string;
      })
      // Upsert pipeline step template
      .addCase(upsertPipelineStepTemplate.pending, (state) => {
        state.pipelineLoading = true;
        state.error = null;
      })
      .addCase(upsertPipelineStepTemplate.fulfilled, (state, action) => {
        state.pipelineLoading = false;
        const idx = state.pipelineStepTemplates.findIndex(
          (a) =>
            a.pipeline_step === action.payload.pipeline_step &&
            a.communication_type === action.payload.communication_type,
        );
        if (idx !== -1) {
          state.pipelineStepTemplates[idx] = action.payload;
        } else {
          state.pipelineStepTemplates.push(action.payload);
        }
      })
      .addCase(upsertPipelineStepTemplate.rejected, (state, action) => {
        state.pipelineLoading = false;
        state.error = action.payload as string;
      })
      // Delete pipeline step template
      .addCase(deletePipelineStepTemplate.pending, (state) => {
        state.pipelineLoading = true;
        state.error = null;
      })
      .addCase(deletePipelineStepTemplate.fulfilled, (state, action) => {
        state.pipelineLoading = false;
        state.pipelineStepTemplates = state.pipelineStepTemplates.filter(
          (a) =>
            !(
              a.pipeline_step === action.payload.step &&
              a.communication_type === action.payload.channel
            ),
        );
      })
      .addCase(deletePipelineStepTemplate.rejected, (state, action) => {
        state.pipelineLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCommunicationTemplates } =
  communicationTemplatesSlice.actions;
export default communicationTemplatesSlice.reducer;
