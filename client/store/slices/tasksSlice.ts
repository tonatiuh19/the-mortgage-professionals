import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type { GetTasksResponse, TaskFormFieldType } from "@shared/api";

interface FormField {
  id?: number;
  field_name: string;
  field_label: string;
  field_type: TaskFormFieldType;
  field_options?: string[];
  is_required: boolean;
  placeholder?: string;
  help_text?: string;
  order_index: number;
}

interface TaskTemplateDraft {
  formData: {
    title: string;
    description: string;
    task_type: string;
    priority: string;
    default_due_days: number | null;
    is_active: boolean;
    requires_documents: boolean;
    document_instructions: string;
    has_custom_form: boolean;
  };
  formFields: FormField[];
  activeTab: string;
  savedAt: string;
}

interface TasksState {
  tasks: GetTasksResponse["tasks"];
  isLoading: boolean;
  error: string | null;
  taskTemplateDraft: TaskTemplateDraft | null;
}

const initialState: TasksState = {
  tasks: [],
  isLoading: false,
  error: null,
  taskTemplateDraft: null,
};

export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get<GetTasksResponse>("/api/tasks", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.tasks;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch tasks",
      );
    }
  },
);

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async (
    {
      taskId,
      status,
      comment,
    }: { taskId: number; status: string; comment?: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.patch(
        `/api/tasks/${taskId}`,
        { status, comment },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return { taskId, status };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update task",
      );
    }
  },
);

export const createTask = createAsyncThunk(
  "tasks/create",
  async (
    taskData: {
      title: string;
      description?: string;
      task_type: string;
      priority: string;
      default_due_days?: number | null;
      is_active?: boolean;
      requires_documents?: boolean;
      document_instructions?: string;
      min_documents?: number | null;
      max_documents?: number | null;
      has_custom_form?: boolean;
      application_id?: number | null;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post("/api/tasks", taskData, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return data.task;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create task",
      );
    }
  },
);

export const updateTask = createAsyncThunk(
  "tasks/update",
  async (
    taskData: {
      id: number;
      title?: string;
      description?: string;
      task_type?: string;
      priority?: string;
      default_due_days?: number | null;
      is_active?: boolean;
      requires_documents?: boolean;
      document_instructions?: string;
      min_documents?: number | null;
      max_documents?: number | null;
      has_custom_form?: boolean;
      application_id?: number | null;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      console.log("🔄 Redux: updateTask called with data:", taskData);
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { id, ...updates } = taskData;
      console.log("🔄 Redux: Sending PUT request to", `/api/tasks/${id}`);
      console.log("🔄 Redux: Updates payload:", updates);

      const { data } = await axios.put(`/api/tasks/${id}`, updates, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      console.log("✅ Redux: API response:", data);
      return data.task;
    } catch (error: any) {
      console.error(
        "❌ Redux: updateTask error:",
        error.response?.data || error,
      );
      return rejectWithValue(
        error.response?.data?.error || "Failed to update task",
      );
    }
  },
);

export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return taskId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete task",
      );
    }
  },
);

export const deleteTaskInstance = createAsyncThunk(
  "tasks/deleteInstance",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.delete(`/api/tasks/instance/${taskId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return { taskId, details: data.details };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete task instance",
      );
    }
  },
);

export const uploadTaskDocument = createAsyncThunk(
  "tasks/uploadDocument",
  async (
    {
      taskId,
      documentData,
    }: {
      taskId: number;
      documentData: {
        task_id: number;
        field_id?: number;
        document_type: "pdf" | "image";
        filename: string;
        original_filename: string;
        file_path: string;
        file_size?: number;
        notes?: string;
      };
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post(
        `/api/tasks/${taskId}/documents`,
        documentData,
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return data.document;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to upload document",
      );
    }
  },
);

export const fetchTaskDocuments = createAsyncThunk(
  "tasks/fetchDocuments",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get(`/api/tasks/${taskId}/documents`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return { taskId, documents: data.documents };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch documents",
      );
    }
  },
);

export const deleteTaskDocument = createAsyncThunk(
  "tasks/deleteDocument",
  async (documentId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      await axios.delete(`/api/tasks/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return documentId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete document",
      );
    }
  },
);

export const createTaskFormFields = createAsyncThunk(
  "tasks/createFormFields",
  async (
    {
      taskId,
      form_fields,
    }: {
      taskId: number;
      form_fields: Array<{
        field_name: string;
        field_label: string;
        field_type: string;
        field_options?: string[];
        is_required?: boolean;
        placeholder?: string;
        validation_rules?: Record<string, any>;
        order_index?: number;
        help_text?: string;
      }>;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      console.log("🔄 Redux: createTaskFormFields called");
      console.log("🔄 Redux: Task ID:", taskId);
      console.log("🔄 Redux: Form fields:", form_fields);

      const { sessionToken } = (getState() as RootState).brokerAuth;
      console.log("🔄 Redux: Session token exists:", !!sessionToken);

      const { data } = await axios.post(
        `/api/tasks/${taskId}/form-fields`,
        { form_fields },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );

      console.log("✅ Redux: Form fields created successfully:", data);
      return { taskId, fields: data.fields };
    } catch (error: any) {
      console.error("❌ Redux: Failed to create form fields:", error);
      console.error("❌ Redux: Error response:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.error || "Failed to create form fields",
      );
      return rejectWithValue(
        error.response?.data?.error || "Failed to create form fields",
      );
    }
  },
);

export const fetchTaskFormFields = createAsyncThunk(
  "tasks/fetchFormFields",
  async (taskId: number, { getState, rejectWithValue }) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.get(`/api/tasks/${taskId}/form-fields`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      return { taskId, fields: data.fields };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch form fields",
      );
    }
  },
);

export const submitTaskForm = createAsyncThunk(
  "tasks/submitForm",
  async (
    {
      taskId,
      responses,
    }: {
      taskId: number;
      responses: Array<{ field_id: number; field_value: string }>;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const { sessionToken } = (getState() as RootState).brokerAuth;
      const { data } = await axios.post(
        `/api/tasks/${taskId}/submit-form`,
        { responses },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );
      return { taskId, message: data.message };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit form",
      );
    }
  },
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    clearTasks: (state) => {
      state.tasks = [];
      state.error = null;
    },
    saveTaskTemplateDraft: (
      state,
      action: PayloadAction<TaskTemplateDraft>,
    ) => {
      state.taskTemplateDraft = action.payload;
    },
    clearTaskTemplateDraft: (state) => {
      state.taskTemplateDraft = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      });
  },
});

export const { clearTasks, saveTaskTemplateDraft, clearTaskTemplateDraft } =
  tasksSlice.actions;
export default tasksSlice.reducer;
