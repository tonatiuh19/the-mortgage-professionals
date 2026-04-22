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
  partner_broker_id: number | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
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
  citizenship_status: string | null;
  employment_status: string | null;
  employer_name: string | null;
  years_employed: string | null;
  source_category: LeadSourceCategory | null;
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
  delivery_method?: "email" | "sms" | "call";
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

/**
 * Pipeline Step Templates Types
 * Maps a communication template to a specific loan pipeline step + channel.
 */
export type LoanPipelineStep =
  | "app_sent"
  | "application_received"
  | "prequalified"
  | "preapproved"
  | "under_contract_loan_setup"
  | "submitted_to_underwriting"
  | "approved_with_conditions"
  | "clear_to_close"
  | "docs_out"
  | "loan_funded";

export type LoanType = "purchase" | "refinance";

export type CommunicationType = "email" | "sms" | "whatsapp";

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
  // Joined from templates table
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
  | "public_wizard"
  | "other";

export interface BrokerMonthlyMetrics {
  year: number;
  month: number;
  // Goals
  lead_to_credit_goal: number;
  credit_to_preapp_goal: number;
  lead_to_closing_goal: number;
  leads_goal: number;
  credit_pulls_goal: number;
  closings_goal: number;
  // Actuals (computed from DB)
  leads_actual: number;
  credit_pulls_actual: number;
  pre_approvals_actual: number;
  closings_actual: number;
  // Previous year reference
  prev_year_leads: number | null;
  prev_year_closings: number | null;
  // Lead source breakdown
  lead_sources: { category: LeadSourceCategory; count: number }[];
}

export interface GetBrokerMetricsResponse {
  success: boolean;
  metrics: BrokerMonthlyMetrics;
}

export interface MonthlySnapshot {
  month: number; // 1-12
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
  quarter: number; // 1-4
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
 * Brokers Types
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
  public_token?: string | null;
  created_by_broker_id?: number | null;
  created_at?: string;
}

export interface GetBrokersResponse {
  success: boolean;
  brokers: Broker[];
  pagination: PaginationInfo;
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
  /** Reassign the Mortgage Banker who "owns" this partner (role=broker only) */
  created_by_broker_id?: number | null;
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
  has_signing?: boolean;
  created_at: string;
  updated_at: string;
  form_fields?: TaskFormField[];
  sign_document?: TaskSignDocument | null;
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
    date_of_birth: string | null;
    status: string;
    created_at: string;
    total_applications: number;
    active_applications: number;
    total_conversations: number;
  }>;
  pagination: PaginationInfo;
}

export interface CreateClientRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface UpdateClientRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  employment_status?: string;
  income_type?: string;
  annual_income?: number | null;
  credit_score?: number | null;
  citizenship_status?: string;
  source?: string | null;
}

export interface GetClientDetailProfileResponse {
  success: boolean;
  client: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    alternate_phone: string | null;
    date_of_birth: string | null;
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    employment_status: string | null;
    income_type: string | null;
    annual_income: number | null;
    credit_score: number | null;
    citizenship_status: string | null;
    status: string;
    source: string | null;
    referral_code: string | null;
    email_verified: boolean;
    phone_verified: boolean;
    last_login: string | null;
    created_at: string;
    updated_at: string;
    assigned_broker: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      public_token: string | null;
    } | null;
  };
  loans: Array<{
    id: number;
    application_number: string;
    loan_type: string;
    loan_amount: number | null;
    property_value: number | null;
    down_payment: number | null;
    status: string;
    priority: string | null;
    estimated_close_date: string | null;
    property_address: string | null;
    property_city: string | null;
    property_state: string | null;
    source_category: string | null;
    created_at: string;
    updated_at: string;
    broker_first_name: string | null;
    broker_last_name: string | null;
  }>;
  conversations: Array<{
    id: number;
    conversation_id: string;
    last_message_at: string | null;
    message_count: number;
    unread_count: number;
    last_message_type: string | null;
    status: string;
    priority: string | null;
    last_message_preview: string | null;
  }>;
  communications: Array<{
    id: number;
    communication_type: string;
    direction: string;
    subject: string | null;
    body: string | null;
    status: string;
    delivery_status: string;
    created_at: string;
    sent_at: string | null;
    broker_first_name: string | null;
    broker_last_name: string | null;
    application_number: string | null;
  }>;
}

export interface UpdateClientResponse {
  success: boolean;
  client: CreateClientResponse["client"] & {
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
  };
}

export interface CreateClientResponse {
  success: boolean;
  client: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    date_of_birth: string | null;
    status: string;
    created_at: string;
    total_applications: number;
    active_applications: number;
    total_conversations: number;
  };
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
  has_signing?: boolean;
  form_fields?: CreateTaskFormFieldRequest[];
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

/**
 * Conversation & Communication Types
 */
export interface ConversationThread {
  id: number;
  conversation_id: string;
  application_id?: number | null;
  lead_id?: number | null;
  client_id?: number | null;
  broker_id: number | null;
  /** Broker/realtor who is the *contact* in this thread (not the CRM handler) */
  contact_broker_id?: number | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  /** Whether the current broker has ownership of this client (3-path check). Only true when client_id is set and broker owns the client. */
  can_view_client?: boolean;
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
  /** Twilio MP3 recording URL for call communications — populated by recording-status webhook */
  recording_url?: string | null;
  /** Recording duration in seconds */
  recording_duration?: number | null;
  /** MMS media attachment URL(s) — single URL string or JSON array for multiple items */
  media_url?: string | null;
  /** MIME type of the primary media attachment (e.g. image/jpeg, video/mp4) */
  media_content_type?: string | null;
  conversation_id?: string | null;
  /** ID of the reminder_flow_execution that sent this message (null = manual send) */
  source_execution_id?: number | null;
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
  /** Public URL of an MMS media attachment (image, video, document) */
  media_url?: string;
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
  description?: string;
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
  usage_count?: number;
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

// ─── Voice / Calling ─────────────────────────────────────────────────────────

export interface VoiceTokenResponse {
  success: boolean;
  token: string;
}

export interface VoiceLogRequest {
  client_id?: number;
  application_id?: number;
  phone: string;
  duration?: number;
  call_status?: string;
  call_sid?: string;
  client_name?: string;
  direction?: "inbound" | "outbound";
}

export interface CallRecord {
  id: number;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  external_id?: string | null;
  conversation_id?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_id?: number | null;
  created_at: string;
  sent_at?: string | null;
}

export interface GetCallHistoryResponse {
  success: boolean;
  calls: CallRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LookupContactResponse {
  success: boolean;
  found: boolean;
  client_id?: number;
  client_name?: string;
  phone?: string;
}

// ─── Broker Public Share Link ─────────────────────────────────────────────────

/** Slim profile returned for the associated Mortgage Banker (admin) when viewed via a partner link */
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
  // Social networks
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
  // from broker_profiles
  bio: string | null;
  avatar_url: string | null;
  office_address: string | null;
  office_city: string | null;
  office_state: string | null;
  office_zip: string | null;
  years_experience: number | null;
  total_loans_closed: number;
  // Social networks
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  // Populated when the broker is a partner (role="broker") and has an associated Mortgage Banker
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

// ─── Broker Profile (self-edit) ───────────────────────────────────────────────

export interface BrokerProfileDetails {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  license_number: string | null;
  specializations: string[] | null;
  timezone: string;
  // from broker_profiles
  bio: string | null;
  avatar_url: string | null;
  office_address: string | null;
  office_city: string | null;
  office_state: string | null;
  office_zip: string | null;
  years_experience: number | null;
  total_loans_closed: number;
  date_of_birth: string | null;
  // Social networks
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
  timezone?: string;
  // Social networks
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

// Conversion between client <-> broker
export interface ConvertClientToBrokerRequest {
  /** Mortgage Banker (admin) to assign this new partner to */
  created_by_broker_id?: number | null;
}
export interface ConvertClientToBrokerResponse {
  success: boolean;
  broker_id: number;
  message: string;
}
export interface ConvertBrokerToClientRequest {
  /** New source for the client (must NOT be 'realtor') */
  source: string;
  assigned_broker_id?: number | null;
}
export interface ConvertBrokerToClientResponse {
  success: boolean;
  client_id: number;
  message: string;
}

// Admin manages any broker's profile/avatar/share-link
export interface AdminBrokerShareLinkResponse {
  success: boolean;
  public_token: string;
  share_url: string;
}

export interface AdminUpdateBrokerAvatarRequest {
  /** Data URI (e.g. data:image/jpeg;base64,...) from the crop uploader */
  avatar_data: string;
}

// =====================================================
// PRE-APPROVAL LETTER TYPES
// =====================================================

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
  purchase_property_address: string | null;
  purchase_property_city: string | null;
  purchase_property_state: string | null;
  purchase_property_zip: string | null;
  created_by_broker_id: number;
  updated_by_broker_id: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  broker_first_name: string | null;
  broker_last_name: string | null;
  broker_email: string | null;
  broker_phone: string | null;
  broker_license_number: string | null;
  broker_photo_url: string | null;
  // Partner fields (when loan was assigned to a partner broker)
  loan_broker_role: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  partner_email: string | null;
  partner_phone: string | null;
  partner_license_number: string | null;
  partner_photo_url: string | null;
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
  purchase_property_address?: string | null;
  purchase_property_city?: string | null;
  purchase_property_state?: string | null;
  purchase_property_zip?: string | null;
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
  // Only admins can update max_approved_amount
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

// ─── System Settings ───────────────────────────────────────────────────────────

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

// =============================================================
// REMINDER FLOWS
// =============================================================

export type ReminderTriggerEvent =
  | "app_sent"
  | "application_received"
  | "prequalified"
  | "preapproved"
  | "under_contract_loan_setup"
  | "submitted_to_underwriting"
  | "approved_with_conditions"
  | "clear_to_close"
  | "docs_out"
  | "loan_funded"
  | "task_pending"
  | "task_in_progress"
  | "task_overdue"
  | "no_activity"
  | "manual"
  // Realtor prospecting stage triggers
  | "prospect_contact_attempted"
  | "prospect_contacted"
  | "prospect_appt_set"
  | "prospect_waiting_for_1st_deal"
  | "prospect_first_deal_funded"
  | "prospect_second_deal_funded"
  | "prospect_top_agent_whale";

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
  // For 'wait' steps
  delay_days?: number;
  delay_hours?: number;
  delay_minutes?: number;
  // For 'wait_for_response' steps
  response_timeout_hours?: number;
  response_timeout_minutes?: number;
  // For 'send_notification' / 'send_email' / 'send_sms'
  message?: string;
  subject?: string;
  template_id?: number;
  // For 'condition' / 'branch' steps
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
  // For 'field_not_empty' / 'field_empty' condition types
  field_name?: string;
  // For 'wait_until_date' steps — name of the contextData field holding the target date
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
  /** Restricts which loan types trigger this flow. 'all' means both purchase and refinance. */
  loan_type_filter: "all" | "purchase" | "refinance";
  /** Whether this flow belongs to the loan pipeline or realtor prospecting pipeline. */
  flow_category: "loan" | "realtor_prospecting";
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
  /** Runtime context stored during execution (loan_type, application status, etc.) */
  context_data: Record<string, unknown> | null;
  last_step_started_at: string | null;
  responded_at: string | null;
  /** Conversation thread linked to this execution — conv_client_{id}_loan_{id}_flow_{id} */
  conversation_id: string | null;
  started_at: string;
  completed_at: string | null;
}

// API Requests / Responses
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
  flow_category?: "loan" | "realtor_prospecting";
}

export interface UpdateReminderFlowRequest {
  name?: string;
  description?: string;
  trigger_event?: ReminderTriggerEvent;
  trigger_delay_days?: number;
  is_active?: boolean;
  apply_to_all_loans?: boolean;
  loan_type_filter?: "all" | "purchase" | "refinance";
  flow_category?: "loan" | "realtor_prospecting";
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

export interface ProcessReminderFlowsResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: string[];
}

export interface MarkFlowExecutionRespondedResponse {
  success: boolean;
  message: string;
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

// ─── Admin Init (merged session bootstrap) ──────────────────────────────────

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

// =====================================================
// SCHEDULER TYPES
// =====================================================

export type MeetingType = "phone" | "video";
export type MeetingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export interface SchedulerSettings {
  id: number;
  broker_id: number;
  is_enabled: boolean;
  meeting_title: string;
  meeting_description: string | null;
  slot_duration_minutes: number;
  buffer_time_minutes: number;
  advance_booking_days: number;
  min_booking_hours: number;
  timezone: string;
  allow_phone: boolean;
  allow_video: boolean;
}

export interface SchedulerAvailability {
  id: number;
  broker_id: number;
  day_of_week: number; // 0=Sun ... 6=Sat
  start_time: string; // "HH:MM:SS"
  end_time: string;
  is_active: boolean;
}

export interface ScheduledMeeting {
  id: number;
  tenant_id: number;
  broker_id: number | null;
  broker_first_name?: string | null;
  broker_last_name?: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  meeting_date: string; // "YYYY-MM-DD"
  meeting_time: string; // "HH:MM:SS"
  meeting_end_time: string;
  meeting_type: MeetingType;
  jitsi_room_id: string | null; // kept for backward compat — new bookings use zoom fields
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  status: MeetingStatus;
  notes: string | null;
  broker_notes: string | null;
  booking_token: string;
  public_token: string | null;
  cancelled_reason: string | null;
  cancelled_by: "client" | "broker" | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Available time slot returned by public API
export interface AvailableSlot {
  time: string; // "HH:MM"
  end_time: string;
  available: boolean;
}

// Public broker info for scheduler page
export interface PublicSchedulerBrokerInfo {
  broker_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  years_experience: number | null;
  role: string;
  meeting_title: string;
  meeting_description: string | null;
  slot_duration_minutes: number;
  advance_booking_days: number;
  min_booking_hours: number;
  timezone: string;
  allow_phone: boolean;
  allow_video: boolean;
  is_enabled: boolean;
}

// Request / Response types
export interface GetPublicSchedulerResponse {
  success: boolean;
  broker: PublicSchedulerBrokerInfo;
  available_dates: string[]; // "YYYY-MM-DD" list of dates that have at least one slot
}

export interface GetAvailableSlotsResponse {
  success: boolean;
  slots: AvailableSlot[];
}

export interface BookMeetingRequest {
  broker_token: string; // broker's public_token
  client_name: string;
  client_email: string;
  client_phone?: string;
  meeting_date: string; // "YYYY-MM-DD"
  meeting_time: string; // "HH:MM"
  meeting_type: MeetingType;
  notes?: string;
}

export interface BookMeetingResponse {
  success: boolean;
  meeting_id: number;
  booking_token: string;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  meeting_date: string;
  meeting_time: string;
  meeting_type: MeetingType;
  broker_name: string;
}

export interface SchedulerBlockedRange {
  id: number;
  broker_id: number;
  start_datetime: string; // ISO string "YYYY-MM-DDTHH:MM:SS"
  end_datetime: string;
  label: string | null;
  created_at: string;
}

export interface GetSchedulerSettingsResponse {
  success: boolean;
  settings: SchedulerSettings;
  availability: SchedulerAvailability[];
}

export interface GetBlockedRangesResponse {
  success: boolean;
  blocked_ranges: SchedulerBlockedRange[];
}

export interface AddBlockedRangeRequest {
  start_datetime: string; // "YYYY-MM-DDTHH:MM"
  end_datetime: string;
  label: string;
}

export interface AddBlockedRangeResponse {
  success: boolean;
  blocked_range: SchedulerBlockedRange;
}

export interface UpdateSchedulerSettingsRequest {
  is_enabled?: boolean;
  meeting_title?: string;
  meeting_description?: string;
  slot_duration_minutes?: number;
  buffer_time_minutes?: number;
  advance_booking_days?: number;
  min_booking_hours?: number;
  timezone?: string;
  allow_phone?: boolean;
  allow_video?: boolean;
  availability?: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }>;
}

export interface GetScheduledMeetingsResponse {
  success: boolean;
  meetings: ScheduledMeeting[];
  total: number;
}

export interface UpdateMeetingRequest {
  status?: MeetingStatus;
  broker_notes?: string;
  meeting_date?: string;
  meeting_time?: string;
  meeting_type?: MeetingType;
  cancelled_reason?: string;
  cancelled_by?: "client" | "broker";
}

// =====================================================
// CALENDAR EVENT TYPES
// =====================================================

export type CalendarEventType =
  | "birthday"
  | "home_anniversary"
  | "realtor_anniversary"
  | "important_date"
  | "reminder"
  | "other";

export type CalendarEventRecurrence = "none" | "yearly";

export interface CalendarEvent {
  id: number;
  tenant_id: number;
  broker_id: number | null;
  event_type: CalendarEventType;
  title: string;
  description: string | null;
  event_date: string; // "YYYY-MM-DD"
  event_time: string | null; // "HH:MM:SS" or null for all-day
  all_day: boolean;
  recurrence: CalendarEventRecurrence;
  color: string | null;
  linked_client_id: number | null;
  linked_client_name?: string | null; // joined from clients
  linked_person_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetCalendarEventsResponse {
  success: boolean;
  events: CalendarEvent[];
  total: number;
  pagination: PaginationInfo;
}

export interface CreateCalendarEventRequest {
  event_type: CalendarEventType;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  all_day?: boolean;
  recurrence?: CalendarEventRecurrence;
  color?: string;
  linked_client_id?: number | null;
  linked_person_name?: string;
}

export interface UpdateCalendarEventRequest {
  event_type?: CalendarEventType;
  title?: string;
  description?: string | null;
  event_date?: string;
  event_time?: string | null;
  all_day?: boolean;
  recurrence?: CalendarEventRecurrence;
  color?: string | null;
  linked_client_id?: number | null;
  linked_person_name?: string | null;
}

export interface SyncBirthdaysResponse {
  success: boolean;
  created: number;
  updated: number;
}

// ─── Realtor Prospecting Pipeline Types ──────────────────────────────────────

export type RealtorProspectStage =
  | "contact_attempted"
  | "contacted"
  | "appt_set"
  | "waiting_for_1st_deal"
  | "first_deal_funded"
  | "second_deal_funded"
  | "top_agent_whale";

export type RealtorProspectStatus = "open" | "won" | "lost";

export type RealtorProgressReport = "ready_to_send" | "sent";

export interface RealtorProspect {
  id: number;
  tenant_id: number;
  stage: RealtorProspectStage;
  status: RealtorProspectStatus;
  opportunity_name: string;
  opportunity_value: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_name: string | null;
  opportunity_source: string | null;
  tags: string[];
  notes: string | null;
  owner_broker_id: number | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
  followers: number[];
  progress_report: RealtorProgressReport | null;
  add_to_refi_rates_dropped: boolean;
  created_by_broker_id: number;
  creator_first_name?: string | null;
  creator_last_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetRealtorProspectsResponse {
  success: boolean;
  prospects: RealtorProspect[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetRealtorProspectResponse {
  success: boolean;
  prospect: RealtorProspect;
}

export interface CreateRealtorProspectRequest {
  opportunity_name: string;
  stage?: RealtorProspectStage;
  status?: RealtorProspectStatus;
  opportunity_value?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  business_name?: string;
  opportunity_source?: string;
  tags?: string[];
  notes?: string;
  owner_broker_id?: number | null;
  followers?: number[];
  progress_report?: RealtorProgressReport | null;
  add_to_refi_rates_dropped?: boolean;
}

export interface CreateRealtorProspectResponse {
  success: boolean;
  prospect: RealtorProspect;
  message?: string;
}

export interface UpdateRealtorProspectStageResponse {
  success: boolean;
  id: number;
  stage: RealtorProspectStage;
  message?: string;
}

export interface UpdateRealtorProspectResponse {
  success: boolean;
  prospect: RealtorProspect;
  message?: string;
}

export interface DeleteRealtorProspectResponse {
  success: boolean;
  message?: string;
}
