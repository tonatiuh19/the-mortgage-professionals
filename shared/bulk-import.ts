/**
 * Bulk CSV import — shared validation, parsing, templates.
 * Used by API, client preview helpers, and smoke tests.
 */

export type BulkImportEntity = "clients" | "realtors";

export type BulkImportRowStatus = "will_create" | "skipped" | "error";

export type BulkImportTableFilter = "all" | "ready" | "skipped" | "error";

export const BULK_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const BULK_IMPORT_MAX_CLIENT_ROWS = 500;
export const BULK_IMPORT_MAX_REALTOR_ROWS = 200;
export const BULK_IMPORT_JOB_TTL_MS = 60 * 60 * 1000;
export const BULK_IMPORT_ACK_THRESHOLD = 100;

export const BULK_LEAD_SOURCES = [
  "current_client_referral",
  "past_client",
  "past_client_referral",
  "personal_friend",
  "realtor",
  "advertisement",
  "business_partner",
  "builder",
  "other",
] as const;

export type BulkLeadSource = (typeof BULK_LEAD_SOURCES)[number];

export const BULK_PARTNER_TYPES = ["realtor", "mortgage_banker"] as const;

export type BulkPartnerType = (typeof BULK_PARTNER_TYPES)[number];

export const BULK_CITIZENSHIP_STATUSES = [
  "us_citizen",
  "permanent_resident",
  "non_resident",
  "other",
] as const;

export const BULK_SPECIALIZATIONS = [
  "Conventional Loans",
  "FHA Loans",
  "VA Loans",
  "USDA Loans",
  "Jumbo Loans",
  "Refinancing",
  "First-Time Home Buyers",
  "Investment Properties",
  "Commercial Loans",
  "Reverse Mortgages",
] as const;

export const BULK_FORBIDDEN_COLUMNS = new Set([
  "password",
  "password_hash",
  "ssn",
  "social_security",
  "twilio_caller_id",
  "twilio_phone_sid",
]);

export const CLIENT_CSV_HEADERS = [
  "first_name",
  "last_name",
  "middle_name",
  "email",
  "phone",
  "alternate_phone",
  "date_of_birth",
  "address_street",
  "address_unit",
  "address_city",
  "address_state",
  "address_zip",
  "citizenship_status",
  "lead_source",
  "external_ref",
] as const;

export const REALTOR_CSV_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "partner_type",
  "license_number",
  "specializations",
  "office_address",
  "office_city",
  "office_state",
  "office_zip",
  "bio",
  "external_ref",
] as const;

export interface BulkImportRowPreview {
  row_number: number;
  status: BulkImportRowStatus;
  message?: string;
  external_ref?: string | null;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  badge?: string | null;
  conflict_entity_id?: number | null;
}

export interface NormalizedClientBulkRow {
  row_number: number;
  external_ref: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone: string | null;
  normalized_phone: string | null;
  alternate_phone: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_unit: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  citizenship_status: string | null;
  lead_source: string;
  status: BulkImportRowStatus;
  message?: string;
  conflict_client_id?: number | null;
}

export interface NormalizedRealtorBulkRow {
  row_number: number;
  external_ref: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  partner_type: BulkPartnerType;
  role: "broker" | "admin";
  license_number: string | null;
  specializations: string[] | null;
  office_address: string | null;
  office_city: string | null;
  office_state: string | null;
  office_zip: string | null;
  bio: string | null;
  status: BulkImportRowStatus;
  message?: string;
  conflict_broker_id?: number | null;
}

export interface BulkImportParseResult {
  success: boolean;
  file_error?: string;
  file_error_code?: string;
  headers?: string[];
  rows?: string[][];
}

export interface BulkImportValidationResult {
  success: boolean;
  file_error?: string;
  file_error_code?: string;
  entity: BulkImportEntity;
  row_count: number;
  will_create_count: number;
  skipped_count: number;
  error_count: number;
  preview_rows: BulkImportRowPreview[];
  breakdown: Record<string, number>;
  normalized_clients?: NormalizedClientBulkRow[];
  normalized_realtors?: NormalizedRealtorBulkRow[];
}

export function isTruthyBulkEnvFlag(value: string | undefined): boolean {
  const v = (value ?? "").toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isFalsyBulkEnvFlag(value: string | undefined): boolean {
  const v = (value ?? "").toLowerCase().trim();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

/**
 * Runtime bulk-import gate (mirrors group conversations pattern).
 * - Off when BULK_CSV_IMPORT_ENABLED=0
 * - Off in production unless BULK_CSV_IMPORT_ENABLED=1 or BULK_CSV_IMPORT_ALLOW_PRODUCTION=1
 * - On in dev/preview when unset
 */
export function resolveBulkCsvImportEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.BULK_CSV_IMPORT_ENABLED;
  if (isFalsyBulkEnvFlag(raw)) return false;

  const runtime = (
    env.VERCEL_ENV ??
    env.NODE_ENV ??
    ""
  ).toLowerCase();

  if (runtime === "production") {
    if (isTruthyBulkEnvFlag(raw)) return true;
    return isTruthyBulkEnvFlag(env.BULK_CSV_IMPORT_ALLOW_PRODUCTION);
  }

  if (raw === undefined || raw.trim() === "") return true;
  return isTruthyBulkEnvFlag(raw);
}

/** @param envValue explicit override for unit tests */
export function isBulkCsvImportEnabled(envValue?: string): boolean {
  if (envValue !== undefined) {
    if (isFalsyBulkEnvFlag(envValue)) return false;
    if (envValue.trim() === "") return resolveBulkCsvImportEnabled();
    return isTruthyBulkEnvFlag(envValue);
  }
  return resolveBulkCsvImportEnabled();
}

export function sanitizeCsvCell(raw: string): string {
  let v = raw.trim();
  if (/^[=+\-@]/.test(v)) {
    v = v.replace(/^[=+\-@]+/, "").trim();
  }
  return v;
}

export function normalizePhoneLast10(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidDateIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  if (d > new Date()) return false;
  return true;
}

export function normalizeUsState(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toUpperCase();
  if (t.length === 2) return t;
  return null;
}

/** RFC 4180-ish CSV parser */
export function parseCsv(text: string): BulkImportParseResult {
  const stripped = text.replace(/^\uFEFF/, "");
  if (!stripped.trim()) {
    return { success: false, file_error: "File is empty", file_error_code: "EMPTY_FILE" };
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    const next = stripped[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(sanitizeCsvCell(field));
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(sanitizeCsvCell(field));
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      if (c === "\r") i++;
    } else if (c !== "\r") {
      field += c;
    }
  }

  row.push(sanitizeCsvCell(field));
  if (row.some((cell) => cell.length > 0)) rows.push(row);

  if (inQuotes) {
    return {
      success: false,
      file_error: "Unclosed quote in CSV",
      file_error_code: "INVALID_CSV",
    };
  }

  if (!rows.length) {
    return { success: false, file_error: "File is empty", file_error_code: "EMPTY_FILE" };
  }

  let startIdx = 0;
  if (rows[0][0]?.startsWith("#")) startIdx = 1;
  if (startIdx >= rows.length) {
    return {
      success: false,
      file_error: "No header row found",
      file_error_code: "MISSING_HEADER",
    };
  }

  const headers = rows[startIdx].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(startIdx + 1).filter((r) => r.some((c) => c.length > 0));

  if (!dataRows.length) {
    return {
      success: false,
      file_error: "No data rows in file",
      file_error_code: "NO_DATA_ROWS",
    };
  }

  const headerSet = new Set(headers);
  if (headerSet.size !== headers.length) {
    return {
      success: false,
      file_error: "Duplicate column names in header",
      file_error_code: "DUPLICATE_HEADER",
    };
  }

  for (const h of headers) {
    if (BULK_FORBIDDEN_COLUMNS.has(h)) {
      return {
        success: false,
        file_error: `Forbidden column: ${h}`,
        file_error_code: "FORBIDDEN_COLUMN",
      };
    }
  }

  const expected =
    headers.includes("lead_source") ? CLIENT_CSV_HEADERS : REALTOR_CSV_HEADERS;
  const expectedSet = new Set(expected as readonly string[]);

  for (const h of headers) {
    if (!expectedSet.has(h)) {
      return {
        success: false,
        file_error: `Unknown column: ${h}`,
        file_error_code: "UNKNOWN_COLUMN",
      };
    }
  }

  const required =
    headers.includes("lead_source")
      ? (["first_name", "last_name", "lead_source"] as const)
      : (["first_name", "last_name", "email", "partner_type"] as const);

  for (const col of required) {
    if (!headerSet.has(col)) {
      return {
        success: false,
        file_error: `Missing required column: ${col}`,
        file_error_code: "MISSING_COLUMN",
      };
    }
  }

  const parsedRows: string[][] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i];
    if (raw.length !== headers.length) {
      return {
        success: false,
        file_error: `Row ${i + startIdx + 2} has ${raw.length} columns, expected ${headers.length}`,
        file_error_code: "COLUMN_COUNT_MISMATCH",
      };
    }
    const obj: string[] = [];
    for (let c = 0; c < headers.length; c++) {
      obj.push(raw[c] ?? "");
    }
    parsedRows.push(obj);
  }

  return { success: true, headers, rows: parsedRows };
}

function rowToRecord(headers: string[], cells: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((h, i) => {
    out[h] = cells[i] ?? "";
  });
  return out;
}

export function validateClientRows(
  headers: string[],
  dataRows: string[][],
): BulkImportValidationResult {
  const normalized: NormalizedClientBulkRow[] = [];
  const preview_rows: BulkImportRowPreview[] = [];
  const breakdown: Record<string, number> = {};
  const emailsInFile = new Map<string, number>();
  const phonesInFile = new Map<string, number>();

  if (dataRows.length > BULK_IMPORT_MAX_CLIENT_ROWS) {
    return {
      success: false,
      file_error: `Maximum ${BULK_IMPORT_MAX_CLIENT_ROWS} rows allowed`,
      file_error_code: "ROW_LIMIT_EXCEEDED",
      entity: "clients",
      row_count: 0,
      will_create_count: 0,
      skipped_count: 0,
      error_count: 0,
      preview_rows: [],
      breakdown: {},
    };
  }

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2;
    const rec = rowToRecord(headers, dataRows[i]);
    const external_ref = rec.external_ref?.trim() || null;

    let status: BulkImportRowStatus = "will_create";
    let message: string | undefined;

    const first_name = rec.first_name?.trim() ?? "";
    const last_name = rec.last_name?.trim() ?? "";
    const lead_source = rec.lead_source?.trim().toLowerCase() ?? "";

    if (!first_name) {
      status = "error";
      message = "first_name is required";
    } else if (!last_name) {
      status = "error";
      message = "last_name is required";
    } else if (!lead_source) {
      status = "error";
      message = "lead_source is required";
    } else if (lead_source === "public_wizard") {
      status = "error";
      message = "public_wizard is not allowed in bulk import";
    } else if (!BULK_LEAD_SOURCES.includes(lead_source as BulkLeadSource)) {
      status = "error";
      message = `Invalid lead_source. Use: ${BULK_LEAD_SOURCES.join(", ")}`;
    }

    let email: string | null = rec.email?.trim().toLowerCase() || null;
    if (status === "will_create" && email && !isValidEmail(email)) {
      status = "error";
      message = "Invalid email format";
    }

    const phoneNorm = normalizePhoneLast10(rec.phone);
    const altNorm = normalizePhoneLast10(rec.alternate_phone);
    if (status === "will_create" && rec.phone?.trim() && !phoneNorm) {
      status = "error";
      message = "Invalid phone number";
    }
    if (status === "will_create" && phoneNorm && altNorm && phoneNorm === altNorm) {
      status = "error";
      message = "alternate_phone must differ from phone";
    }

    const dob = rec.date_of_birth?.trim() || null;
    if (status === "will_create" && dob && !isValidDateIso(dob)) {
      status = "error";
      message = "date_of_birth must be YYYY-MM-DD and not in the future";
    }

    const citizenship = rec.citizenship_status?.trim().toLowerCase() || null;
    if (
      status === "will_create" &&
      citizenship &&
      !BULK_CITIZENSHIP_STATUSES.includes(citizenship as (typeof BULK_CITIZENSHIP_STATUSES)[number])
    ) {
      status = "error";
      message = `Invalid citizenship_status`;
    }

    const state = normalizeUsState(rec.address_state);
    if (status === "will_create" && rec.address_state?.trim() && !state) {
      status = "error";
      message = "address_state must be 2-letter US code";
    }

    if (status === "will_create" && email) {
      const prev = emailsInFile.get(email);
      if (prev !== undefined) {
        status = "error";
        message = `Duplicate email in file (row ${prev})`;
      } else emailsInFile.set(email, rowNumber);
    }

    if (status === "will_create" && phoneNorm) {
      const prev = phonesInFile.get(phoneNorm);
      if (prev !== undefined) {
        status = "error";
        message = `Duplicate phone in file (row ${prev})`;
      } else phonesInFile.set(phoneNorm, rowNumber);
    }

    const row: NormalizedClientBulkRow = {
      row_number: rowNumber,
      external_ref,
      first_name,
      last_name,
      middle_name: rec.middle_name?.trim() || null,
      email,
      phone: rec.phone?.trim() || null,
      normalized_phone: phoneNorm,
      alternate_phone: rec.alternate_phone?.trim() || null,
      date_of_birth: dob,
      address_street: rec.address_street?.trim() || null,
      address_unit: rec.address_unit?.trim() || null,
      address_city: rec.address_city?.trim() || null,
      address_state: state,
      address_zip: rec.address_zip?.trim() || null,
      citizenship_status: citizenship,
      lead_source,
      status,
      message,
    };

    normalized.push(row);
    preview_rows.push({
      row_number: rowNumber,
      status,
      message,
      external_ref,
      display_name: `${first_name} ${last_name}`.trim(),
      email,
      phone: rec.phone?.trim() || null,
      badge: lead_source || null,
    });

    if (status === "will_create") {
      breakdown[lead_source] = (breakdown[lead_source] ?? 0) + 1;
    }
  }

  return summarizeValidation("clients", normalized, preview_rows, breakdown);
}

export function validateRealtorRows(
  headers: string[],
  dataRows: string[][],
): BulkImportValidationResult {
  const normalized: NormalizedRealtorBulkRow[] = [];
  const preview_rows: BulkImportRowPreview[] = [];
  const breakdown: Record<string, number> = {};
  const emailsInFile = new Map<string, number>();
  const phonesInFile = new Map<string, number>();

  if (dataRows.length > BULK_IMPORT_MAX_REALTOR_ROWS) {
    return {
      success: false,
      file_error: `Maximum ${BULK_IMPORT_MAX_REALTOR_ROWS} rows allowed`,
      file_error_code: "ROW_LIMIT_EXCEEDED",
      entity: "realtors",
      row_count: 0,
      will_create_count: 0,
      skipped_count: 0,
      error_count: 0,
      preview_rows: [],
      breakdown: {},
    };
  }

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2;
    const rec = rowToRecord(headers, dataRows[i]);
    const external_ref = rec.external_ref?.trim() || null;

    let status: BulkImportRowStatus = "will_create";
    let message: string | undefined;

    const first_name = rec.first_name?.trim() ?? "";
    const last_name = rec.last_name?.trim() ?? "";
    const email = rec.email?.trim().toLowerCase() ?? "";
    const partner_type = rec.partner_type?.trim().toLowerCase() as BulkPartnerType;

    if (!first_name || first_name.length < 2) {
      status = "error";
      message = "first_name is required (min 2 characters)";
    } else if (!last_name || last_name.length < 2) {
      status = "error";
      message = "last_name is required (min 2 characters)";
    } else if (!email) {
      status = "error";
      message = "email is required";
    } else if (!isValidEmail(email)) {
      status = "error";
      message = "Invalid email format";
    } else if (!partner_type) {
      status = "error";
      message = "partner_type is required";
    } else if (!BULK_PARTNER_TYPES.includes(partner_type)) {
      status = "error";
      message = `partner_type must be: ${BULK_PARTNER_TYPES.join(" | ")}`;
    }

    const phoneNorm = normalizePhoneLast10(rec.phone);
    if (status === "will_create" && rec.phone?.trim() && !phoneNorm) {
      status = "error";
      message = "Invalid phone number";
    }

    let specializations: string[] | null = null;
    if (status === "will_create" && rec.specializations?.trim()) {
      const parts = rec.specializations
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      const invalid = parts.filter(
        (p) => !BULK_SPECIALIZATIONS.includes(p as (typeof BULK_SPECIALIZATIONS)[number]),
      );
      if (invalid.length) {
        status = "error";
        message = `Invalid specialization(s): ${invalid.join(", ")}`;
      } else {
        specializations = parts;
      }
    }

    const bio = rec.bio?.trim() || null;
    if (status === "will_create" && bio && bio.length > 500) {
      status = "error";
      message = "bio max 500 characters";
    }

    const office_state = normalizeUsState(rec.office_state);
    if (status === "will_create" && rec.office_state?.trim() && !office_state) {
      status = "error";
      message = "office_state must be 2-letter US code";
    }

    if (status === "will_create") {
      const prevEmail = emailsInFile.get(email);
      if (prevEmail !== undefined) {
        status = "error";
        message = `Duplicate email in file (row ${prevEmail})`;
      } else emailsInFile.set(email, rowNumber);
    }

    if (status === "will_create" && phoneNorm) {
      const prevPhone = phonesInFile.get(phoneNorm);
      if (prevPhone !== undefined) {
        status = "error";
        message = `Duplicate phone in file (row ${prevPhone})`;
      } else phonesInFile.set(phoneNorm, rowNumber);
    }

    const role: "broker" | "admin" =
      partner_type === "mortgage_banker" ? "admin" : "broker";

    const row: NormalizedRealtorBulkRow = {
      row_number: rowNumber,
      external_ref,
      first_name,
      last_name,
      email,
      phone: rec.phone?.trim() || null,
      partner_type: partner_type || "realtor",
      role,
      license_number: rec.license_number?.trim() || null,
      specializations,
      office_address: rec.office_address?.trim() || null,
      office_city: rec.office_city?.trim() || null,
      office_state: office_state,
      office_zip: rec.office_zip?.trim() || null,
      bio,
      status,
      message,
    };

    normalized.push(row);
    preview_rows.push({
      row_number: rowNumber,
      status,
      message,
      external_ref,
      display_name: `${first_name} ${last_name}`.trim(),
      email,
      phone: rec.phone?.trim() || null,
      badge: partner_type || null,
    });

    if (status === "will_create" && partner_type) {
      breakdown[partner_type] = (breakdown[partner_type] ?? 0) + 1;
    }
  }

  return summarizeValidation("realtors", normalized, preview_rows, breakdown);
}

function summarizeValidation(
  entity: BulkImportEntity,
  normalized: NormalizedClientBulkRow[] | NormalizedRealtorBulkRow[],
  preview_rows: BulkImportRowPreview[],
  breakdown: Record<string, number>,
): BulkImportValidationResult {
  const will_create_count = preview_rows.filter((r) => r.status === "will_create").length;
  const skipped_count = preview_rows.filter((r) => r.status === "skipped").length;
  const error_count = preview_rows.filter((r) => r.status === "error").length;

  const result: BulkImportValidationResult = {
    success: true,
    entity,
    row_count: preview_rows.length,
    will_create_count,
    skipped_count,
    error_count,
    preview_rows,
    breakdown,
  };

  if (entity === "clients") {
    result.normalized_clients = normalized as NormalizedClientBulkRow[];
  } else {
    result.normalized_realtors = normalized as NormalizedRealtorBulkRow[];
  }

  return result;
}

/** Mortgage bankers may bulk-import clients/realtors but not create other MB accounts via CSV. */
export function applyBulkImportImporterRestrictions(
  validation: BulkImportValidationResult,
  importerRole: string,
): BulkImportValidationResult {
  if (importerRole === "admin") return validation;
  if (validation.entity !== "realtors" || !validation.normalized_realtors) {
    return validation;
  }

  const normalized = validation.normalized_realtors.map((row) => {
    if (row.partner_type === "mortgage_banker" || row.role === "admin") {
      return {
        ...row,
        status: "error" as const,
        message: "Mortgage bankers can only bulk-import realtor partners",
      };
    }
    return row;
  });

  const preview_rows = validation.preview_rows.map((pr) => {
    const nr = normalized.find((r) => r.row_number === pr.row_number);
    if (!nr || nr.status !== "error") return pr;
    return {
      ...pr,
      status: "error" as const,
      message: nr.message,
    };
  });

  return summarizeValidation(
    "realtors",
    normalized,
    preview_rows,
    validation.breakdown,
  );
}

export function parseAndValidateBulkCsv(
  text: string,
  entity: BulkImportEntity,
): BulkImportValidationResult {
  const parsed = parseCsv(text);
  if (!parsed.success || !parsed.headers || !parsed.rows) {
    return {
      success: false,
      file_error: parsed.file_error,
      file_error_code: parsed.file_error_code,
      entity,
      row_count: 0,
      will_create_count: 0,
      skipped_count: 0,
      error_count: 0,
      preview_rows: [],
      breakdown: {},
    };
  }

  const isClientFile = parsed.headers.includes("lead_source");
  if (entity === "clients" && !isClientFile) {
    return {
      success: false,
      file_error: "File does not look like a client import (missing lead_source column)",
      file_error_code: "WRONG_TEMPLATE",
      entity,
      row_count: 0,
      will_create_count: 0,
      skipped_count: 0,
      error_count: 0,
      preview_rows: [],
      breakdown: {},
    };
  }
  if (entity === "realtors" && isClientFile) {
    return {
      success: false,
      file_error: "File does not look like a realtor import (wrong columns)",
      file_error_code: "WRONG_TEMPLATE",
      entity,
      row_count: 0,
      will_create_count: 0,
      skipped_count: 0,
      error_count: 0,
      preview_rows: [],
      breakdown: {},
    };
  }

  return entity === "clients"
    ? validateClientRows(parsed.headers, parsed.rows)
    : validateRealtorRows(parsed.headers, parsed.rows);
}

export function buildClientTemplateCsv(): string {
  return [
    CLIENT_CSV_HEADERS.join(","),
    'Maria,Flores,,maria.flores@example.com,(562) 555-0100,,1985-03-15,123 Main St,,Whittier,CA,90601,us_citizen,past_client,CRM-1001',
    'John,Reyes,,,(909) 555-0199,,,,,,,,,realtor,CRM-1002',
  ].join("\n");
}

export function buildRealtorTemplateCsv(): string {
  return [
    REALTOR_CSV_HEADERS.join(","),
    'Jane,Agent,jane.agent@example.com,(714) 555-0200,realtor,DRE1234567,"FHA Loans|First-Time Home Buyers",100 Main St,Whittier,CA,90603,Top LA agent,REALTOR-501',
    'Alex,Banker,alex.banker@example.com,(562) 555-0300,mortgage_banker,NMLS987654,,123 Main St,Los Angeles,CA,90001,Senior LO,MB-102',
  ].join("\n");
}

export function filterPreviewRows(
  rows: BulkImportRowPreview[],
  filter: BulkImportTableFilter,
  search: string,
): BulkImportRowPreview[] {
  let out = rows;
  if (filter === "ready") out = out.filter((r) => r.status === "will_create");
  else if (filter === "skipped") out = out.filter((r) => r.status === "skipped");
  else if (filter === "error") out = out.filter((r) => r.status === "error");

  const q = search.trim().toLowerCase();
  if (!q) return out;

  return out.filter((r) => {
    const hay = [
      r.display_name,
      r.email,
      r.phone,
      r.external_ref,
      r.badge,
      r.message,
      String(r.row_number),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function csvEscapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildPreviewReportCsv(rows: BulkImportRowPreview[]): string {
  const headers = [
    "row_number",
    "status",
    "display_name",
    "email",
    "phone",
    "badge",
    "message",
    "external_ref",
    "conflict_entity_id",
  ];
  const lines = [
    headers.join(","),
    ...rows
      .filter((r) => r.status !== "will_create")
      .map((r) =>
        [
          r.row_number,
          r.status,
          r.display_name,
          r.email ?? "",
          r.phone ?? "",
          r.badge ?? "",
          r.message ?? "",
          r.external_ref ?? "",
          r.conflict_entity_id ?? "",
        ]
          .map(csvEscapeCell)
          .join(","),
      ),
  ];
  return lines.join("\n");
}

export interface BulkImportResultCsvRow {
  row_number: number;
  external_ref?: string | null;
  status: string;
  entity_id?: number | null;
  owner_broker_id?: number | null;
  message?: string;
}

export function buildCommitResultsCsv(rows: BulkImportResultCsvRow[]): string {
  const headers = [
    "row_number",
    "external_ref",
    "status",
    "entity_id",
    "owner_broker_id",
    "message",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.row_number,
        r.external_ref ?? "",
        r.status,
        r.entity_id ?? "",
        r.owner_broker_id ?? "",
        r.message ?? "",
      ]
        .map(csvEscapeCell)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
