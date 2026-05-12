/**
 * Shared types for the deletion modal pattern used by
 * use-deletion-modal and use-bulk-deletion hooks.
 */
export interface DeletionDetails {
  /** Human-readable label for the entity being deleted */
  entityName: string;
  /** Entity type label (e.g. "Client", "Document") */
  entityType?: string;
  /** Alias for entityName – used by some consumers */
  displayName?: string;
  /** Structured list of dependent entities that will also be affected */
  dependencies?: Array<{
    type: string;
    count: number;
    label: string;
  }>;
  /** Extra warning strings to display in the confirmation dialog */
  warnings?: string[];
  /** Whether the action is destructive (delete vs deactivate) */
  isDestructive?: boolean;
}
