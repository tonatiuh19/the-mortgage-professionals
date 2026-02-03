/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Loan Application Types
 */
export interface CreateLoanRequest {
  client_email: string;
  client_first_name: string;
  client_last_name: string;
  client_phone: string;
  loan_type: string;
  loan_amount: string;
  property_value: string;
  down_payment: string;
  loan_purpose?: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_type: string;
  estimated_close_date?: string;
  notes?: string;
  tasks: Array<{
    title: string;
    description: string;
    task_type: string;
    priority: string;
    due_days: number;
  }>;
}

export interface CreateLoanResponse {
  success: boolean;
  application_id: number;
  application_number: string;
  client_id: number;
  tasks_created: number;
}

export interface LoanTask {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "pending_approval"
    | "approved"
    | "reopened"
    | "cancelled"
    | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LoanDetails {
  id: number;
  application_number: string;
  client_user_id: number;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone: string | null;
  broker_user_id: number | null;
  broker_first_name: string | null;
  broker_last_name: string | null;
  loan_type: string;
  loan_amount: number;
  property_value: number | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  property_type: string | null;
  down_payment: number | null;
  loan_purpose: string | null;
  status: string;
  current_step: number;
  total_steps: number;
  priority: "low" | "medium" | "high" | "urgent";
  estimated_close_date: string | null;
  actual_close_date: string | null;
  interest_rate: number | null;
  loan_term_months: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  tasks: LoanTask[];
}

export interface GetLoanDetailsResponse {
  success: boolean;
  loan: LoanDetails;
}

/**
 * Client Authentication Types
 */
export interface ClientSendCodeRequest {
  email: string;
}

export interface ClientSendCodeResponse {
  success: boolean;
  message: string;
  redirect?: string;
  debug_code?: number;
}

export interface ClientVerifyCodeRequest {
  email: string;
  code: string;
}

export interface ClientInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
}

export interface ClientVerifyCodeResponse {
  success: boolean;
  sessionToken?: string;
  client?: ClientInfo;
  message?: string;
}

export interface ClientValidateSessionResponse {
  success: boolean;
  client?: ClientInfo;
  message?: string;
}

export interface ClientLogoutResponse {
  success: boolean;
}

/**
 * Client Portal Types
 */
export interface ClientApplication {
  id: number;
  application_number: string;
  loan_type: string;
  loan_amount: number;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  status: string;
  current_step: number;
  total_steps: number;
  estimated_close_date: string | null;
  created_at: string;
  submitted_at: string | null;
  broker_first_name: string | null;
  broker_last_name: string | null;
  broker_phone: string | null;
  broker_email: string | null;
  completed_tasks: number;
  total_tasks: number;
}

export interface GetClientApplicationsResponse {
  success: boolean;
  applications: ClientApplication[];
}

export interface ClientTask {
  id: number;
  application_id: number;
  title: string;
  description: string | null;
  task_type: string;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "pending_approval"
    | "approved"
    | "reopened"
    | "cancelled"
    | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  application_number: string;
  loan_type: string;
  property_address: string | null;
  // New approval workflow fields
  approval_status?: "pending" | "approved" | "rejected" | null;
  approved_at?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
}

export interface GetClientTasksResponse {
  success: boolean;
  tasks: ClientTask[];
}

export interface UpdateClientTaskRequest {
  status: "in_progress" | "completed";
}

export interface UpdateClientTaskResponse {
  success: boolean;
  message: string;
}

export interface ClientProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  alternate_phone: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  employment_status: string | null;
  income_type: string;
  annual_income: number | null;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
}

export interface GetClientProfileResponse {
  success: boolean;
  profile: ClientProfile;
}

export interface UpdateClientProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  alternate_phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
}

export interface UpdateClientProfileResponse {
  success: boolean;
  profile: ClientProfile;
  message: string;
}

/**
 * Email Template Types
 */
export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  template_type:
    | "welcome"
    | "status_update"
    | "document_request"
    | "approval"
    | "denial"
    | "custom";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetEmailTemplatesResponse {
  success: boolean;
  templates: EmailTemplate[];
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  template_type: string;
  is_active?: boolean;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  template_type?: string;
  is_active?: boolean;
}

export interface EmailTemplateResponse {
  success: boolean;
  template: EmailTemplate;
  message?: string;
}

/**
 * SMS Template Types
 */
export interface SmsTemplate {
  id: number;
  name: string;
  body: string;
  template_type: "reminder" | "status_update" | "document_request" | "custom";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetSmsTemplatesResponse {
  success: boolean;
  templates: SmsTemplate[];
}

export interface CreateSmsTemplateRequest {
  name: string;
  body: string;
  template_type: string;
  is_active?: boolean;
}

export interface UpdateSmsTemplateRequest {
  name?: string;
  body?: string;
  template_type?: string;
  is_active?: boolean;
}

export interface SmsTemplateResponse {
  success: boolean;
  template: SmsTemplate;
  message?: string;
}

/**
 * Dashboard Statistics Types
 */
export interface DashboardStats {
  totalPipelineValue: number;
  activeApplications: number;
  avgClosingDays: number;
  closureRate: number;
  weeklyActivity: Array<{
    date: string;
    applications: number;
    closed: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}

export interface GetDashboardStatsResponse {
  success: boolean;
  stats: DashboardStats;
}

/**
 * Brokers Types
 */
export interface Broker {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: "broker" | "admin";
  status: "active" | "inactive" | "suspended";
  email_verified: boolean;
  last_login: string | null;
  license_number: string | null;
  specializations: string[] | null;
  created_at?: string;
}

export interface GetBrokersResponse {
  success: boolean;
  brokers: Broker[];
}

export interface CreateBrokerRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: "broker" | "admin";
  license_number?: string;
  specializations?: string[];
}

export interface UpdateBrokerRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: "broker" | "admin";
  status?: "active" | "inactive" | "suspended";
  license_number?: string;
  specializations?: string[];
}

export interface BrokerResponse {
  success: boolean;
  broker: Broker;
  message?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  default_due_days?: number | null;
  is_active?: boolean;
}

export interface CreateTaskResponse {
  success: boolean;
  task: TaskTemplate;
  message: string;
}

export interface LoanApplication {
  id: number;
  application_number: string;
  client_user_id: number;
  broker_user_id: number | null;
  loan_type: string;
  loan_amount: number;
  property_value: number | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  property_type: string | null;
  down_payment: number | null;
  loan_purpose: string | null;
  status: string;
  current_step: number;
  total_steps: number;
  priority: string;
  estimated_close_date: string | null;
  actual_close_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  order_index: number;
  default_due_days: number | null;
  is_active: boolean;
  requires_documents?: boolean;
  document_instructions?: string | null;
  has_custom_form?: boolean;
  created_at: string;
  updated_at: string;
  form_fields?: TaskFormField[];
}

export interface Task {
  id: number;
  application_id: number;
  template_id: number | null;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority: string;
  order_index: number;
  assigned_to_user_id: number | null;
  assigned_to_broker_id: number | null;
  due_date: string | null;
  completed_at: string | null;
  form_completed?: boolean;
  form_completed_at?: string | null;
  documents_uploaded?: boolean;
  documents_verified?: boolean;
  // New approval workflow fields
  approval_status?: "pending" | "approved" | "rejected" | null;
  approved_by_broker_id?: number | null;
  approved_at?: string | null;
  reopened_by_broker_id?: number | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
  created_at: string;
  updated_at: string;
  application_number?: string;
  loan_amount?: number;
  client_first_name?: string;
  client_last_name?: string;
  form_fields?: TaskFormField[];
  documents?: TaskDocument[];
}

export interface GetLoansResponse {
  success: boolean;
  loans: Array<{
    id: number;
    application_number: string;
    loan_type: string;
    loan_amount: number;
    status: string;
    priority: string;
    estimated_close_date: string | null;
    created_at: string;
    client_first_name: string;
    client_last_name: string;
    client_email: string;
    broker_first_name: string | null;
    broker_last_name: string | null;
    next_task: string | null;
    completed_tasks: number;
    total_tasks: number;
  }>;
}

export interface GetClientsResponse {
  success: boolean;
  clients: Array<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    status: string;
    created_at: string;
    total_applications: number;
    active_applications: number;
  }>;
}

export interface GetTasksResponse {
  success: boolean;
  tasks: TaskTemplate[];
}

/**
 * Task Form Fields and Documents Types
 */
export type TaskFormFieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "textarea"
  | "file_pdf"
  | "file_image"
  | "select"
  | "checkbox";

export interface TaskFormField {
  id: number;
  task_template_id: number;
  field_name: string;
  field_label: string;
  field_type: TaskFormFieldType;
  field_options?: string[] | null;
  is_required: boolean;
  placeholder?: string | null;
  validation_rules?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  } | null;
  order_index: number;
  help_text?: string | null;
  created_at: string;
}

export interface CreateTaskFormFieldRequest {
  field_name: string;
  field_label: string;
  field_type: TaskFormFieldType;
  field_options?: string[];
  is_required?: boolean;
  placeholder?: string;
  validation_rules?: Record<string, any>;
  order_index?: number;
  help_text?: string;
}

export interface TaskFormResponse {
  id: number;
  task_id: number;
  field_id: number;
  field_value: string | null;
  submitted_by_user_id?: number | null;
  submitted_by_broker_id?: number | null;
  submitted_at: string;
  updated_at: string;
}

export interface TaskDocument {
  id: number;
  task_id: number;
  field_id?: number | null;
  document_type: "pdf" | "image";
  filename: string;
  original_filename: string;
  file_path: string;
  file_size?: number | null;
  uploaded_by_user_id?: number | null;
  uploaded_by_broker_id?: number | null;
  uploaded_at: string;
  notes?: string | null;
}

export interface UploadTaskDocumentRequest {
  task_id: number;
  field_id?: number;
  document_type: "pdf" | "image";
  notes?: string;
}

export interface UploadTaskDocumentResponse {
  success: boolean;
  document: TaskDocument;
  message: string;
}

export interface GetTaskDocumentsResponse {
  success: boolean;
  documents: TaskDocument[];
}

export interface SubmitTaskFormRequest {
  task_id: number;
  responses: Array<{
    field_id: number;
    field_value: string;
  }>;
}

export interface SubmitTaskFormResponse {
  success: boolean;
  message: string;
  task_id: number;
}

export interface UpdateTaskTemplateRequest extends CreateTaskRequest {
  requires_documents?: boolean;
  document_instructions?: string;
  has_custom_form?: boolean;
  form_fields?: CreateTaskFormFieldRequest[];
}
