/** Unified API denial shape for quota / subscription blocks (402 responses). */
export type BillingDenialPayload = {
  success?: boolean;
  error?: string;
  message?: string;
  quota_exceeded?: boolean;
  billing_action_required?: boolean;
  billing_access_level?: string;
  suggested_pack_id?: string | null;
};
