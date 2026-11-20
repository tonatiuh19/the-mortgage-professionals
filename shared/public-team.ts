/**
 * Public "Our Team" listing — readiness rules shared by client and smoke tests.
 * The API keeps an inlined copy ("Public team listing — inlined for Vercel
 * serverless" in api/index.ts). Change BOTH when the rules change.
 */
import type { BrokerRole } from "./api";

export type PublicProfileStatus = "none" | "pending" | "approved" | "rejected";

/** Roles that hold an NMLS license and must display it when advertised. */
export const NMLS_REQUIRED_ROLES: readonly BrokerRole[] = [
  "admin",
  "loan_officer",
];

/** Used only when a tenant has no broker_role_public_listing row for a role. */
export const DEFAULT_PUBLIC_LISTING_ROLES: readonly BrokerRole[] = [
  "admin",
  "loan_officer",
];

export type PublicProfileRequirement = "photo" | "nmls" | "role" | "active";

export interface PublicProfileReadinessInput {
  role: string;
  status: string;
  avatar_url: string | null | undefined;
  license_number: string | null | undefined;
  roleAllowed: boolean;
}

/** Returns the unmet requirements; an empty array means "ready to publish". */
export function getPublicProfileMissing(
  input: PublicProfileReadinessInput,
): PublicProfileRequirement[] {
  const missing: PublicProfileRequirement[] = [];
  if (input.status !== "active") missing.push("active");
  if (!input.roleAllowed) missing.push("role");
  if (!input.avatar_url?.trim()) missing.push("photo");
  if (
    (NMLS_REQUIRED_ROLES as readonly string[]).includes(input.role) &&
    !input.license_number?.trim()
  ) {
    missing.push("nmls");
  }
  return missing;
}

export const PUBLIC_PROFILE_REQUIREMENT_LABELS: Record<
  PublicProfileRequirement,
  string
> = {
  photo: "Upload a profile photo",
  nmls: "Add your NMLS number",
  role: "Your role is not enabled for the public website",
  active: "Your account must be active",
};

/** Public card shape returned by GET /api/public/team. */
export interface PublicTeamMember {
  id: number;
  first_name: string;
  last_name: string;
  role: BrokerRole;
  title: string;
  nmls: string | null;
  avatar_url: string;
  bio: string | null;
  years_experience: number | null;
  link_key: string;
}

export interface PublicTeamResponse {
  success: boolean;
  members: PublicTeamMember[];
}

/** Status of the signed-in broker's own website listing. */
export interface MyPublicProfileStatus {
  status: PublicProfileStatus;
  requested_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  public_title: string | null;
  missing: PublicProfileRequirement[];
  role_allowed: boolean;
}

/** Row in the platform owner's review list. */
export interface PublicProfileReviewItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: BrokerRole;
  account_status: string;
  status: PublicProfileStatus;
  public_title: string | null;
  public_display_order: number;
  avatar_url: string | null;
  license_number: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  missing: PublicProfileRequirement[];
}

export interface RolePublicListingSetting {
  role: BrokerRole;
  is_allowed: boolean;
}

export type PublicProfileReviewAction = "approve" | "reject" | "unpublish";
