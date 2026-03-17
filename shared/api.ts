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
  status_change_reason?: string | null;
  status_changed_by_broker_id?: number | null;
  status_changed_at?: string | null;
}

export interface UpdateTaskRequest {
  status?: string;
  comment?: string;
}

export interface UpdateTaskResponse {
  success: boolean;
  message: string;
  audit: {
    status_changed: boolean;
    comment_added: boolean;
  };
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
  broker_avatar_url: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  partner_phone: string | null;
  partner_email: string | null;
  partner_avatar_url: string | null;
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
  // Partner assignment fields
  partner_broker_id?: number | null;
  partner_first_name?: string | null;
  partner_last_name?: string | null;
  loan_broker_role?: string | null;
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
  has_signing?: boolean;
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: {
    status?: string;
    priority?: string;
    loanType?: string;
    dateRange?: string;
    search?: string;
  };
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

/**
 * Conversation & Communication Types
 */
export interface ConversationThread {
  id: number;
  conversation_id: string;
  application_id?: number | null;
  lead_id?: number | null;
  client_id?: number | null;
  broker_id: number;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  last_message_at: string;
  last_message_preview?: string | null;
  last_message_type: "email" | "sms" | "whatsapp" | "call" | "internal_note";
  message_count: number;
  unread_count: number;
  priority: "low" | "normal" | "high" | "urgent";
  status: "active" | "archived" | "closed";
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Communication {
  id: number;
  application_id?: number | null;
  lead_id?: number | null;
  from_user_id?: number | null;
  from_broker_id?: number | null;
  to_user_id?: number | null;
  to_broker_id?: number | null;
  communication_type: "email" | "sms" | "whatsapp" | "call" | "internal_note";
  direction: "inbound" | "outbound";
  subject?: string | null;
  body: string;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  external_id?: string | null;
  conversation_id?: string | null;
  thread_id?: string | null;
  reply_to_id?: number | null;
  message_type: "text" | "image" | "document" | "audio" | "video" | "template";
  template_id?: number | null;
  delivery_status:
    | "pending"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "rejected";
  delivery_timestamp?: string | null;
  read_timestamp?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  cost?: number | null;
  provider_response?: any | null;
  metadata?: any | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface GetConversationThreadsRequest {
  page?: number;
  limit?: number;
  status?: "active" | "archived" | "closed" | "all";
  priority?: "low" | "normal" | "high" | "urgent";
  search?: string;
}

export interface GetConversationThreadsResponse {
  success: boolean;
  threads: ConversationThread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetConversationMessagesRequest {
  conversation_id: string;
  page?: number;
  limit?: number;
}

export interface GetConversationMessagesResponse {
  success: boolean;
  messages: Communication[];
  thread: ConversationThread;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendMessageRequest {
  conversation_id?: string;
  application_id?: number;
  lead_id?: number;
  client_id?: number;
  communication_type: "email" | "sms" | "whatsapp";
  recipient_phone?: string;
  recipient_email?: string;
  subject?: string;
  body: string;
  template_id?: number;
  message_type?: "text" | "template";
  scheduled_at?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  communication_id: number;
  conversation_id: string;
  external_id?: string;
  cost?: number;
}

export interface UpdateConversationRequest {
  conversation_id: string;
  status?: "active" | "archived" | "closed";
  priority?: "low" | "normal" | "high" | "urgent";
  tags?: string[];
}

export interface UpdateConversationResponse {
  success: boolean;
  thread: ConversationThread;
}

export interface ConversationTemplate {
  id: number;
  name: string;
  template_type: "email" | "sms" | "whatsapp";
  subject?: string;
  body: string;
  body_html?: string;
  body_text?: string;
  category:
    | "welcome"
    | "reminder"
    | "update"
    | "follow_up"
    | "marketing"
    | "system";
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetConversationTemplatesResponse {
  success: boolean;
  templates: ConversationTemplate[];
}

export interface ConversationStats {
  total_conversations: number;
  active_conversations: number;
  unread_messages: number;
  today_messages: number;
  response_time_avg: number;
  channels: {
    email: number;
    sms: number;
    whatsapp: number;
  };
  by_priority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
}

export interface GetConversationStatsResponse {
  success: boolean;
  stats: ConversationStats;
}

/**
 * Analytics Dashboard Types
 */
export interface MonthlySnapshot {
  month: number;
  leads: number;
  credit_pulls: number;
  pre_approvals: number;
  closings: number;
  lead_to_credit_pct: number;
  credit_to_preapp_pct: number;
  lead_to_closing_pct: number;
  leads_goal: number;
  closings_goal: number;
}

export interface QuarterSummary {
  quarter: number;
  leads: number;
  credit_pulls: number;
  pre_approvals: number;
  closings: number;
  avg_lead_to_credit_pct: number;
  avg_credit_to_preapp_pct: number;
  avg_lead_to_closing_pct: number;
}

export interface AnnualMetrics {
  year: number;
  months: MonthlySnapshot[];
  quarters: QuarterSummary[];
  annual_leads: number;
  annual_credit_pulls: number;
  annual_pre_approvals: number;
  annual_closings: number;
  avg_lead_to_credit_pct: number;
  avg_credit_to_preapp_pct: number;
  avg_lead_to_closing_pct: number;
  lead_sources_annual: { category: LeadSourceCategory; count: number }[];
}

export interface GetAnnualMetricsResponse {
  success: boolean;
  annual: AnnualMetrics;
}

// =============================================================
// PUBLIC BROKER INFO (share link / application wizard)
// =============================================================

export interface MortgageBankerPublicInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  license_number: string | null;
  bio: string | null;
  avatar_url: string | null;
  office_address: string | null;
  office_city: string | null;
  office_state: string | null;
  office_zip: string | null;
  years_experience: number | null;
  total_loans_closed: number;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
}

export interface BrokerPublicProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: "broker" | "admin";
  license_number: string | null;
  specializations: string[] | null;
  public_token: string;
  bio: string | null;
  avatar_url: string | null;
  office_address: string | null;
  office_city: string | null;
  office_state: string | null;
  office_zip: string | null;
  years_experience: number | null;
  total_loans_closed: number;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  mortgage_banker: MortgageBankerPublicInfo | null;
}

export interface BrokerPublicInfoResponse {
  success: boolean;
  broker: BrokerPublicProfile;
}

export interface MyShareLinkResponse {
  success: boolean;
  public_token: string;
  share_url: string;
}

export interface RegenerateShareLinkResponse {
  success: boolean;
  public_token: string;
  share_url: string;
  message: string;
}

export interface SendShareLinkEmailRequest {
  client_email: string;
  client_name?: string;
  message?: string;
}

export interface SendShareLinkEmailResponse {
  success: boolean;
  message: string;
}

// =============================================================
// BROKER PROFILE
// =============================================================

export interface BrokerProfileDetails {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  license_number: string | null;
  specializations: string[] | null;
  bio: string | null;
  avatar_url: string | null;
  office_address: string | null;
  office_city: string | null;
  office_state: string | null;
  office_zip: string | null;
  years_experience: number | null;
  total_loans_closed: number;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
}

export interface GetBrokerProfileResponse {
  success: boolean;
  profile: BrokerProfileDetails;
}

export interface UpdateBrokerProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  license_number?: string;
  specializations?: string[];
  bio?: string;
  office_address?: string;
  office_city?: string;
  office_state?: string;
  office_zip?: string;
  years_experience?: number | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;
}

export interface UpdateBrokerProfileResponse {
  success: boolean;
  profile: BrokerProfileDetails;
}

export interface UpdateBrokerAvatarResponse {
  success: boolean;
  avatar_url: string;
}

export interface AdminBrokerShareLinkResponse {
  success: boolean;
  public_token: string;
  share_url: string;
}

// =============================================================
// PRE-APPROVAL LETTER TYPES
// =============================================================

export interface PreApprovalLetter {
  id: number;
  tenant_id: number;
  application_id: number;
  approved_amount: number;
  max_approved_amount: number;
  html_content: string;
  letter_date: string;
  expires_at: string | null;
  loan_type: string | null;
  fico_score: number | null;
  is_active: boolean;
  created_by_broker_id: number;
  updated_by_broker_id: number | null;
  created_at: string;
  updated_at: string;
  // Joined broker fields
  broker_first_name: string | null;
  broker_last_name: string | null;
  broker_email: string | null;
  broker_phone: string | null;
  broker_license_number: string | null;
  broker_photo_url: string | null;
  // Partner fields
  loan_broker_role: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  partner_email: string | null;
  partner_phone: string | null;
  partner_license_number: string | null;
  partner_photo_url: string | null;
  // Client / loan fields
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  application_number: string | null;
  company_logo_url: string | null;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_nmls: string | null;
}

export interface GetPreApprovalLetterResponse {
  success: boolean;
  letter: PreApprovalLetter | null;
}

export interface CreatePreApprovalLetterRequest {
  max_approved_amount: number;
  approved_amount: number;
  html_content: string;
  letter_date: string;
  expires_at?: string | null;
  loan_type?: string;
  fico_score?: number | null;
}

export interface CreatePreApprovalLetterResponse {
  success: boolean;
  letter: PreApprovalLetter;
  message: string;
}

export interface UpdatePreApprovalLetterRequest {
  approved_amount?: number;
  html_content?: string;
  letter_date?: string;
  expires_at?: string | null;
  is_active?: boolean;
  max_approved_amount?: number;
}

export interface UpdatePreApprovalLetterResponse {
  success: boolean;
  letter: PreApprovalLetter;
  message: string;
}

export interface SendPreApprovalLetterEmailRequest {
  subject?: string;
  custom_message?: string;
  template_id?: number | null;
}

export interface SendPreApprovalLetterEmailResponse {
  success: boolean;
  message: string;
  external_id?: string;
}

// =============================================================
// REMINDER FLOWS
// =============================================================

export type ReminderTriggerEvent =
  | "app_sent"
  | "application_created"
  | "application_received"
  | "prequalified"
  | "preapproved"
  | "under_contract_loan_setup"
  | "submitted_to_underwriting"
  | "approved_with_conditions"
  | "loan_approved"
  | "loan_documents_pending"
  | "clear_to_close"
  | "docs_out"
  | "loan_funded"
  | "task_pending"
  | "task_in_progress"
  | "task_overdue"
  | "no_activity"
  | "manual";

export type ReminderStepType =
  | "trigger"
  | "wait"
  | "wait_until_date"
  | "send_notification"
  | "send_email"
  | "send_sms"
  | "send_whatsapp"
  | "condition"
  | "branch"
  | "wait_for_response"
  | "end";

export type FlowEdgeType =
  | "default"
  | "condition_yes"
  | "condition_no"
  | "loan_type_purchase"
  | "loan_type_refinance"
  | "no_response"
  | "responded";

export interface ReminderFlowStepConfig {
  delay_days?: number;
  delay_hours?: number;
  delay_minutes?: number;
  response_timeout_hours?: number;
  response_timeout_minutes?: number;
  message?: string;
  subject?: string;
  template_id?: number;
  condition_type?:
    | "loan_type"
    | "task_completed"
    | "task_pending"
    | "inactivity_days"
    | "loan_status"
    | "loan_status_ne"
    | "field_not_empty"
    | "field_empty";
  condition_value?: string;
  field_name?: string;
  date_field?: string;
}

export interface ReminderFlowStep {
  id: number;
  flow_id: number;
  step_key: string;
  step_type: ReminderStepType;
  label: string;
  description: string | null;
  config: ReminderFlowStepConfig | null;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface ReminderFlowConnection {
  id: number;
  flow_id: number;
  edge_key: string;
  source_step_key: string;
  target_step_key: string;
  label: string | null;
  edge_type: FlowEdgeType;
  created_at: string;
}

export interface ReminderFlow {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  trigger_event: ReminderTriggerEvent;
  trigger_delay_days: number;
  is_active: boolean;
  apply_to_all_loans: boolean;
  loan_type_filter: "all" | "purchase" | "refinance";
  created_by_broker_id: number | null;
  created_at: string;
  updated_at: string;
  steps?: ReminderFlowStep[];
  connections?: ReminderFlowConnection[];
  active_executions_count?: number;
}

export interface ReminderFlowExecution {
  id: number;
  flow_id: number;
  flow_name: string;
  loan_application_id: number | null;
  client_id: number | null;
  client_name: string | null;
  application_number: string | null;
  current_step_key: string | null;
  status: "active" | "paused" | "completed" | "cancelled" | "failed";
  next_execution_at: string | null;
  completed_steps: string[] | null;
  context_data: Record<string, unknown> | null;
  last_step_started_at: string | null;
  responded_at: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface GetReminderFlowsResponse {
  success: boolean;
  flows: ReminderFlow[];
}

export interface GetReminderFlowResponse {
  success: boolean;
  flow: ReminderFlow;
}

export interface CreateReminderFlowRequest {
  name: string;
  description?: string;
  trigger_event: ReminderTriggerEvent;
  trigger_delay_days?: number;
  is_active?: boolean;
  apply_to_all_loans?: boolean;
  loan_type_filter?: "all" | "purchase" | "refinance";
}

export interface UpdateReminderFlowRequest {
  name?: string;
  description?: string;
  trigger_event?: ReminderTriggerEvent;
  trigger_delay_days?: number;
  is_active?: boolean;
  apply_to_all_loans?: boolean;
  loan_type_filter?: "all" | "purchase" | "refinance";
  steps?: SaveReminderFlowStep[];
  connections?: SaveReminderFlowConnection[];
}

export interface SaveReminderFlowStep {
  step_key: string;
  step_type: ReminderStepType;
  label: string;
  description?: string;
  config?: ReminderFlowStepConfig;
  position_x: number;
  position_y: number;
}

export interface SaveReminderFlowConnection {
  edge_key: string;
  source_step_key: string;
  target_step_key: string;
  label?: string;
  edge_type?: FlowEdgeType;
}

export interface SaveReminderFlowRequest {
  name: string;
  description?: string;
  trigger_event: ReminderTriggerEvent;
  trigger_delay_days?: number;
  is_active?: boolean;
  apply_to_all_loans?: boolean;
  loan_type_filter?: "all" | "purchase" | "refinance";
  steps: SaveReminderFlowStep[];
  connections: SaveReminderFlowConnection[];
}

export interface SaveReminderFlowResponse {
  success: boolean;
  message: string;
  flow_id: number;
}

export interface DeleteReminderFlowResponse {
  success: boolean;
  message: string;
}

export interface GetReminderFlowExecutionsResponse {
  success: boolean;
  executions: ReminderFlowExecution[];
  total: number;
}

export interface ToggleReminderFlowResponse {
  success: boolean;
  message: string;
  is_active: boolean;
}

export interface MarkFlowExecutionRespondedResponse {
  success: boolean;
  message: string;
}

export interface ProcessReminderFlowsResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: string[];
}

/**
 * Broker Monthly Metrics Types
 */
export type LeadSourceCategory =
  | "current_client_referral"
  | "past_client"
  | "past_client_referral"
  | "personal_friend"
  | "realtor"
  | "advertisement"
  | "business_partner"
  | "builder"
  | "other";

export interface BrokerMonthlyMetrics {
  year: number;
  month: number;
  lead_to_credit_goal: number;
  credit_to_preapp_goal: number;
  lead_to_closing_goal: number;
  leads_goal: number;
  credit_pulls_goal: number;
  closings_goal: number;
  leads_actual: number;
  credit_pulls_actual: number;
  pre_approvals_actual: number;
  closings_actual: number;
  prev_year_leads: number | null;
  prev_year_closings: number | null;
  lead_sources: { category: LeadSourceCategory; count: number }[];
}

export interface GetBrokerMetricsResponse {
  success: boolean;
  metrics: BrokerMonthlyMetrics;
}

export interface UpdateBrokerMetricsRequest {
  year: number;
  month: number;
  lead_to_credit_goal?: number;
  credit_to_preapp_goal?: number;
  lead_to_closing_goal?: number;
  leads_goal?: number;
  credit_pulls_goal?: number;
  closings_goal?: number;
  credit_pulls_actual?: number;
  prev_year_leads?: number | null;
  prev_year_closings?: number | null;
}

/**
 * WhatsApp Template Types
 */
export interface WhatsappTemplate {
  id: number;
  name: string;
  body: string;
  template_type:
    | "reminder"
    | "status_update"
    | "update"
    | "follow_up"
    | "custom";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetWhatsappTemplatesResponse {
  success: boolean;
  templates: WhatsappTemplate[];
}

export interface CreateWhatsappTemplateRequest {
  name: string;
  body: string;
  template_type: string;
  is_active?: boolean;
}

export interface UpdateWhatsappTemplateRequest {
  name?: string;
  body?: string;
  template_type?: string;
  is_active?: boolean;
}

export interface WhatsappTemplateResponse {
  success: boolean;
  template: WhatsappTemplate;
  message?: string;
}

export type CommunicationType = "email" | "sms" | "whatsapp";

export type LoanPipelineStep =
  | "draft"
  | "submitted"
  | "under_review"
  | "documents_pending"
  | "underwriting"
  | "conditional_approval"
  | "approved"
  | "denied"
  | "closed"
  | "cancelled";

export type LoanType = "purchase" | "refinance";

export interface PipelineStepTemplate {
  id: number;
  tenant_id: number;
  pipeline_step: LoanPipelineStep;
  communication_type: CommunicationType;
  template_id: number;
  is_active: boolean;
  created_by_broker_id: number | null;
  created_at: string;
  updated_at: string;
  template_name?: string;
  template_body?: string;
  template_subject?: string | null;
}

export interface GetPipelineStepTemplatesResponse {
  success: boolean;
  assignments: PipelineStepTemplate[];
}

export interface UpsertPipelineStepTemplateRequest {
  pipeline_step: LoanPipelineStep;
  communication_type: CommunicationType;
  template_id: number;
  is_active?: boolean;
}

export interface UpsertPipelineStepTemplateResponse {
  success: boolean;
  assignment: PipelineStepTemplate;
  message?: string;
}

export interface DeletePipelineStepTemplateResponse {
  success: boolean;
  message?: string;
}

// ─── System Settings ─────────────────────────────────────────────────────────

export interface SystemSetting {
  id: number;
  tenant_id: number | null;
  setting_key: string;
  setting_value: string | null;
  setting_type: "string" | "number" | "boolean" | "json";
  description: string | null;
  updated_at: string;
}

export interface GetSettingsResponse {
  success: boolean;
  settings: SystemSetting[];
}

export interface UpdateSettingsRequest {
  updates: { setting_key: string; setting_value: string }[];
}

export interface UpdateSettingsResponse {
  success: boolean;
  message: string;
}

// ─── Admin Section Controls ───────────────────────────────────────────────────

export interface AdminSectionControl {
  id: number;
  tenant_id: number;
  section_id: string;
  is_disabled: boolean;
  tooltip_message: string;
  created_at: string;
  updated_at: string;
}

export interface GetAdminSectionControlsResponse {
  success: boolean;
  controls: AdminSectionControl[];
}

export interface UpdateAdminSectionControlRequest {
  section_id: string;
  is_disabled: boolean;
  tooltip_message?: string;
}

export interface UpdateAdminSectionControlsRequest {
  controls: UpdateAdminSectionControlRequest[];
}

export interface UpdateAdminSectionControlsResponse {
  success: boolean;
  message: string;
}

export interface AdminInitResponse {
  success: boolean;
  profile: BrokerProfileDetails;
  controls: AdminSectionControl[];
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

export interface ContactSubmissionRequest {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

export interface ContactSubmissionResponse {
  success: boolean;
  message: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  read_by_broker_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface GetContactSubmissionsResponse {
  success: boolean;
  submissions: ContactSubmission[];
}

/**
 * Document Signing Types
 */
export interface SignatureZone {
  id: string;
  page: number;
  x: number; // percentage (0-100) from left of page
  y: number; // percentage (0-100) from top of page
  width: number; // percentage (0-100) of page width
  height: number; // percentage (0-100) of page height
  label: string;
}

export interface TaskSignDocument {
  id: number;
  task_template_id: number;
  file_path: string;
  original_filename: string;
  file_size: number | null;
  signature_zones: SignatureZone[];
  uploaded_by_broker_id: number;
  created_at: string;
  updated_at: string;
}

export interface TaskSignature {
  id: number;
  task_id: number;
  sign_document_id: number;
  zone_id: string;
  signature_data: string; // base64 PNG
  signed_by_user_id: number | null;
  signed_at: string;
}

export interface SaveSignDocumentRequest {
  file_path: string;
  original_filename: string;
  file_size?: number;
  signature_zones: SignatureZone[];
}

export interface SaveSignDocumentResponse {
  success: boolean;
  sign_document: TaskSignDocument;
  message: string;
}

export interface GetSignDocumentResponse {
  success: boolean;
  sign_document: TaskSignDocument | null;
}

export interface SubmitSignaturesRequest {
  signatures: Array<{
    zone_id: string;
    signature_data: string; // base64 PNG
  }>;
}

export interface SubmitSignaturesResponse {
  success: boolean;
  message: string;
  signatures_count: number;
}

export interface GetTaskSignaturesResponse {
  success: boolean;
  signatures: TaskSignature[];
  sign_document: TaskSignDocument | null;
}
