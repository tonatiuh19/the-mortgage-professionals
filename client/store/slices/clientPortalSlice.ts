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
} from "@shared/api";

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
    field_type: string;
    field_label: string;
    field_description?: string;
    placeholder?: string;
    required: boolean;
    options?: string;
  }>;
  requiredDocuments: Array<{
    id: number;
    document_type: string;
    description?: string;
    is_uploaded: boolean;
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
  loading: boolean;
  tasksLoading: boolean;
  profileLoading: boolean;
  taskDetailsLoading: boolean;
  error: string | null;
}

const initialState: ClientPortalState = {
  applications: [],
  tasks: [],
  profile: null,
  taskDetails: null,
  taskFormDrafts: {},
  loading: false,
  tasksLoading: false,
  profileLoading: false,
  taskDetailsLoading: false,
  error: null,
};

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
        { status: "completed" },
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
      const pdfs = documents.filter((doc: any) => doc.document_type === "pdf");
      const images = documents.filter(
        (doc: any) => doc.document_type === "image",
      );

      return {
        taskId,
        pdfs: pdfs.map((doc: any) => ({
          filename: doc.filename,
          path: doc.file_path,
          size: doc.file_size,
          uploaded_at: doc.uploaded_at,
        })),
        images: {
          main: images[0]
            ? {
                filename: images[0].filename,
                path: images[0].file_path,
              }
            : null,
          extra: images.slice(1).map((doc: any) => ({
            filename: doc.filename,
            path: doc.file_path,
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
          console.log(
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
        console.log(`🎉 Task ${action.payload.taskId} completed!`);
        task.status = "completed";
        task.completed_at = new Date().toISOString();
      }
      state.taskDetails = null;
      // Clear draft when task is completed
      delete state.taskFormDrafts[action.payload.taskId];
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

export default clientPortalSlice.reducer;
