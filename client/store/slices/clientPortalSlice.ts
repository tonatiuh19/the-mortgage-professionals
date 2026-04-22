import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type {
  GetClientApplicationsResponse,
  GetClientTasksResponse,
  UpdateClientTaskRequest,
  UpdateClientTaskResponse,
  GetClientProfileResponse,
  UpdateClientProfileRequest,
  UpdateClientProfileResponse,
  ClientApplication,
  ClientTask,
  ClientProfile,
  TaskSignDocument,
  SignatureZone,
} from "@shared/api";
import { logger } from "@/lib/logger";

export interface ClientDocument {
  id: number;
  task_id: number;
  field_id: number | null;
  document_type: "pdf" | "image";
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  notes: string | null;
  task_title: string;
  task_type: string;
  task_status: string;
  application_number: string;
  loan_type: string;
  property_address: string;
  property_city?: string;
  property_state?: string;
}

export interface ClientMeeting {
  id: number;
  meeting_date: string; // "YYYY-MM-DD"
  meeting_time: string; // "HH:MM:SS"
  meeting_end_time: string;
  meeting_type: "phone" | "video";
  status: string;
  zoom_join_url: string | null;
  notes: string | null;
  booking_token: string;
  cancelled_reason: string | null;
  broker_name: string;
  broker_phone: string | null;
}

export interface TaskDetails {
  id: number;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  application_id: number;
  application_number: string;
  loan_type: string;
  property_address: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  loan_amount: number;
  formFields: Array<{
    id: number;
    field_name: string;
    field_type: string;
    field_label: string;
    /** Actual DB column: help_text */
    help_text?: string;
    placeholder?: string;
    /** Actual DB column: is_required */
    is_required: boolean;
    /** Actual DB column: field_options (JSON or comma-separated) */
    field_options?: any;
    order_index?: number;
  }>;
  requiredDocuments: Array<{
    id: number;
    document_type: string;
    description?: string;
    field_type?: string;
    is_required?: boolean;
    is_uploaded: boolean;
  }>;
  task_type?: string;
  sign_document?: TaskSignDocument | null;
  existing_signatures?: Array<{
    zone_id: string;
    signature_data: string;
    signed_at: string;
  }>;
}

export interface TaskFormDraft {
  taskId: number;
  formData: Record<string, any>;
  currentStep: "form" | "documents" | "complete";
  timestamp: number;
}

interface ClientPortalState {
  applications: ClientApplication[];
  tasks: ClientTask[];
  profile: ClientProfile | null;
  taskDetails: TaskDetails | null;
  taskFormDrafts: Record<number, TaskFormDraft>; // Keyed by taskId
  clientDocuments: ClientDocument[];
  meetings: ClientMeeting[];
  loading: boolean;
  tasksLoading: boolean;
  profileLoading: boolean;
  taskDetailsLoading: boolean;
  documentsLoading: boolean;
  meetingsLoading: boolean;
  error: string | null;
}

const initialState: ClientPortalState = {
  applications: [],
  tasks: [],
  profile: null,
  taskDetails: null,
  taskFormDrafts: {},
  clientDocuments: [],
  meetings: [],
  loading: false,
  tasksLoading: false,
  profileLoading: false,
  taskDetailsLoading: false,
  documentsLoading: false,
  meetingsLoading: false,
  error: null,
};

/**
 * Fetch all documents uploaded by the client across all tasks
 */
export const fetchClientDocuments = createAsyncThunk(
  "clientPortal/fetchDocuments",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.get<{
        success: boolean;
        documents: ClientDocument[];
      }>("/api/client/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.documents;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch documents",
      );
    }
  },
);

/**
 * Fetch client's loan applications
 */
export const fetchClientApplications = createAsyncThunk(
  "clientPortal/fetchApplications",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.get<GetClientApplicationsResponse>(
        "/api/client/applications",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data.applications;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch applications",
      );
    }
  },
);

/**
 * Fetch client's tasks
 */
export const fetchClientTasks = createAsyncThunk(
  "clientPortal/fetchTasks",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.get<GetClientTasksResponse>(
        "/api/client/tasks",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data.tasks;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch tasks",
      );
    }
  },
);

/**
 * Update task status
 */
export const updateClientTask = createAsyncThunk(
  "clientPortal/updateTask",
  async (
    { taskId, status }: { taskId: number; status: "in_progress" | "completed" },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.patch<UpdateClientTaskResponse>(
        `/api/client/tasks/${taskId}`,
        { status } as UpdateClientTaskRequest,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return { taskId, status };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update task",
      );
    }
  },
);

/**
 * Fetch client profile
 */
export const fetchClientProfile = createAsyncThunk(
  "clientPortal/fetchProfile",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.get<GetClientProfileResponse>(
        "/api/client/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data.profile;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch profile",
      );
    }
  },
);

/**
 * Update client profile
 */
export const updateClientProfile = createAsyncThunk(
  "clientPortal/updateProfile",
  async (data: UpdateClientProfileRequest, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.put<UpdateClientProfileResponse>(
        "/api/client/profile",
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data.profile;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update profile",
      );
    }
  },
);

/**
 * Fetch task details with form fields and documents
 */
export const fetchTaskDetails = createAsyncThunk(
  "clientPortal/fetchTaskDetails",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.get(`/api/client/tasks/${taskId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Return the task details directly, not the wrapper
      const { success, ...taskDetails } = response.data;
      return taskDetails as TaskDetails;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch task details",
      );
    }
  },
);

/**
 * Submit task form responses
 */
export const submitTaskForm = createAsyncThunk(
  "clientPortal/submitTaskForm",
  async (
    {
      taskId,
      responses,
    }: {
      taskId: number;
      responses: Array<{ field_id: number; response_value: string }>;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.post(
        `/api/client/tasks/${taskId}/submit-form`,
        { responses },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit form",
      );
    }
  },
);

/**
 * Upload task document
 */
export const uploadTaskDocument = createAsyncThunk(
  "clientPortal/uploadDocument",
  async (
    {
      taskId,
      formData,
      fileType,
    }: { taskId: number; formData: FormData; fileType: "pdf" | "image" },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      // Route to correct API based on file type
      const apiUrl =
        fileType === "pdf"
          ? "https://disruptinglabs.com/data/api/uploadPDFs.php"
          : "https://disruptinglabs.com/data/api/uploadImages.php";

      const response = await axios.post(apiUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to upload document",
      );
    }
  },
);

/**
 * Complete task
 */
export const completeTask = createAsyncThunk(
  "clientPortal/completeTask",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.patch(
        `/api/client/tasks/${taskId}`,
        { status: "pending_approval" },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return { taskId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to complete task",
      );
    }
  },
);

/**
 * Fetch task documents from database
 */
export const fetchTaskDocuments = createAsyncThunk(
  "clientPortal/fetchTaskDocuments",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token =
        state.brokerAuth.sessionToken || state.clientAuth.sessionToken;

      const response = await axios.get(`/api/tasks/${taskId}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Transform database response to match expected format
      const documents = response.data.documents || [];
      const BASE = "https://disruptinglabs.com/data/api";
      const fullUrl = (p: string) =>
        p ? (p.startsWith("http") ? p : `${BASE}${p}`) : "";
      const pdfs = documents.filter((doc: any) => doc.document_type === "pdf");
      const images = documents.filter(
        (doc: any) => doc.document_type === "image",
      );

      return {
        taskId,
        pdfs: pdfs.map((doc: any) => ({
          filename: doc.original_filename || doc.filename,
          path: fullUrl(doc.file_path),
          size: doc.file_size,
          uploaded_at: doc.uploaded_at,
        })),
        images: {
          main: images[0]
            ? {
                filename: images[0].original_filename || images[0].filename,
                path: fullUrl(images[0].file_path),
              }
            : null,
          extra: images.slice(1).map((doc: any) => ({
            filename: doc.original_filename || doc.filename,
            path: fullUrl(doc.file_path),
          })),
        },
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch documents",
      );
    }
  },
);

/**
 * Save document metadata to database after external upload
 */
export const saveTaskDocumentMetadata = createAsyncThunk(
  "clientPortal/saveTaskDocumentMetadata",
  async (
    {
      taskId,
      documentType,
      files,
    }: { taskId: number; documentType: "pdf" | "image"; files: any[] },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const uploadPromises = files.map((file) =>
        axios.post(
          `/api/client/tasks/${taskId}/documents`,
          {
            task_id: taskId,
            field_id: file.fieldId || null,
            document_type: documentType,
            filename: file.filename,
            original_filename: file.original_name || file.filename,
            file_path: file.path,
            file_size: file.size,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      await Promise.all(uploadPromises);
      return { taskId, documentType, count: files.length };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to save document metadata",
      );
    }
  },
);

/**
 * Fetch sign document for a client task (uses task instance → template)
 */
export const fetchClientSignDocument = createAsyncThunk(
  "clientPortal/fetchSignDocument",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.get(
        `/api/client/tasks/${taskId}/sign-document`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data.sign_document as TaskSignDocument | null;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch sign document",
      );
    }
  },
);

/**
 * Submit client signatures for a signing task
 */
export const submitTaskSignatures = createAsyncThunk(
  "clientPortal/submitSignatures",
  async (
    {
      taskId,
      signatures,
    }: {
      taskId: number;
      signatures: Array<{ zone_id: string; signature_data: string }>;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;

      const response = await axios.post(
        `/api/client/tasks/${taskId}/signatures`,
        { signatures },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return { taskId, ...response.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit signatures",
      );
    }
  },
);

export const fetchClientMeetings = createAsyncThunk(
  "clientPortal/fetchMeetings",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.clientAuth.sessionToken;
      const { data } = await axios.get<{
        success: boolean;
        meetings: ClientMeeting[];
      }>("/api/client/meetings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.meetings;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch meetings",
      );
    }
  },
);

const clientPortalSlice = createSlice({
  name: "clientPortal",
  initialState,
  reducers: {
    clearPortalError: (state) => {
      state.error = null;
    },
    saveTaskFormDraft: (state, action: PayloadAction<TaskFormDraft>) => {
      state.taskFormDrafts[action.payload.taskId] = action.payload;
    },
    clearTaskFormDraft: (state, action: PayloadAction<number>) => {
      delete state.taskFormDrafts[action.payload];
    },
    clearAllTaskFormDrafts: (state) => {
      state.taskFormDrafts = {};
    },
  },
  extraReducers: (builder) => {
    // Fetch applications
    builder
      .addCase(fetchClientApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload;
      })
      .addCase(fetchClientApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch tasks
    builder
      .addCase(fetchClientTasks.pending, (state) => {
        state.tasksLoading = true;
        state.error = null;
      })
      .addCase(fetchClientTasks.fulfilled, (state, action) => {
        state.tasksLoading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchClientTasks.rejected, (state, action) => {
        state.tasksLoading = false;
        state.error = action.payload as string;
      });

    // Update task
    builder
      .addCase(updateClientTask.pending, (state) => {
        state.error = null;
      })
      .addCase(updateClientTask.fulfilled, (state, action) => {
        const { taskId, status } = action.payload;
        const task = state.tasks.find((t) => t.id === taskId);
        if (task) {
          logger.log(
            `✅ Task ${taskId} status updated: ${task.status} → ${status}`,
          );
          task.status = status;
          if (status === "completed") {
            task.completed_at = new Date().toISOString();
          }
        }
      })
      .addCase(updateClientTask.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch profile
    builder
      .addCase(fetchClientProfile.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
      })
      .addCase(fetchClientProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchClientProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload as string;
      });

    // Update profile
    builder
      .addCase(updateClientProfile.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
      })
      .addCase(updateClientProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateClientProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload as string;
      });

    // Fetch task details
    builder
      .addCase(fetchTaskDetails.pending, (state) => {
        state.taskDetailsLoading = true;
        state.error = null;
      })
      .addCase(fetchTaskDetails.fulfilled, (state, action) => {
        state.taskDetailsLoading = false;
        state.taskDetails = action.payload;
      })
      .addCase(fetchTaskDetails.rejected, (state, action) => {
        state.taskDetailsLoading = false;
        state.error = action.payload as string;
      });

    // Complete task
    builder.addCase(completeTask.fulfilled, (state, action) => {
      const task = state.tasks.find((t) => t.id === action.payload.taskId);
      if (task) {
        logger.log(`🎉 Task ${action.payload.taskId} submitted for approval!`);
        task.status = "pending_approval";
        task.completed_at = new Date().toISOString();
      }
      state.taskDetails = null;
      // Clear draft when task is submitted
      delete state.taskFormDrafts[action.payload.taskId];
    });

    // Fetch client documents
    builder
      .addCase(fetchClientDocuments.pending, (state) => {
        state.documentsLoading = true;
        state.error = null;
      })
      .addCase(fetchClientDocuments.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.clientDocuments = action.payload;
      })
      .addCase(fetchClientDocuments.rejected, (state, action) => {
        state.documentsLoading = false;
        state.error = action.payload as string;
      });

    // Submit signatures
    builder.addCase(submitTaskSignatures.fulfilled, (state, action) => {
      const task = state.tasks.find((t) => t.id === action.payload.taskId);
      if (task) {
        task.status = "pending_approval";
        task.completed_at = new Date().toISOString();
      }
      state.taskDetails = null;
      delete state.taskFormDrafts[action.payload.taskId];
    });

    // Fetch meetings
    builder
      .addCase(fetchClientMeetings.pending, (state) => {
        state.meetingsLoading = true;
      })
      .addCase(fetchClientMeetings.fulfilled, (state, action) => {
        state.meetingsLoading = false;
        state.meetings = action.payload;
      })
      .addCase(fetchClientMeetings.rejected, (state) => {
        state.meetingsLoading = false;
      });
  },
});

export const {
  clearPortalError,
  saveTaskFormDraft,
  clearTaskFormDraft,
  clearAllTaskFormDrafts,
} = clientPortalSlice.actions;

// Selectors
export const selectClientApplications = (state: RootState) =>
  state.clientPortal.applications;
export const selectClientTasks = (state: RootState) => state.clientPortal.tasks;
export const selectClientProfile = (state: RootState) =>
  state.clientPortal.profile;
export const selectTaskFormDraft = (taskId: number) => (state: RootState) =>
  state.clientPortal.taskFormDrafts[taskId];
export const selectPortalLoading = (state: RootState) =>
  state.clientPortal.loading;
export const selectTasksLoading = (state: RootState) =>
  state.clientPortal.tasksLoading;
export const selectProfileLoading = (state: RootState) =>
  state.clientPortal.profileLoading;
export const selectPortalError = (state: RootState) => state.clientPortal.error;
export const selectClientDocuments = (state: RootState) =>
  state.clientPortal.clientDocuments;
export const selectDocumentsLoading = (state: RootState) =>
  state.clientPortal.documentsLoading;
export const selectClientMeetings = (state: RootState) =>
  state.clientPortal.meetings;
export const selectMeetingsLoading = (state: RootState) =>
  state.clientPortal.meetingsLoading;

export default clientPortalSlice.reducer;
