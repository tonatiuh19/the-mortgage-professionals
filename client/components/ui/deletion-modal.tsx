import React from "react";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DeletionDetails {
  entityName: string;
  entityType: string;
  displayName: string;
  dependencies?: Array<{
    type: string;
    count: number;
    friendlyName: string;
  }>;
  warnings?: string[];
  isDestructive?: boolean; // true for hard delete, false for soft delete
}

interface DeletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  details: DeletionDetails | null;
}

export const DeletionModal: React.FC<DeletionModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  details,
}) => {
  if (!details) return null;

  const hasDependencies =
    details.dependencies && details.dependencies.length > 0;
  const totalDependencies =
    details.dependencies?.reduce((sum, dep) => sum + dep.count, 0) || 0;
  const actionText = details.isDestructive !== false ? "Delete" : "Deactivate";
  const actionDescription =
    details.isDestructive !== false
      ? "This action cannot be undone."
      : "This will set the status to inactive but preserve all data.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionText} {details.entityType}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to {actionText.toLowerCase()} "
              <strong>{details.displayName}</strong>"?
            </p>

            <p className="text-xs text-muted-foreground">{actionDescription}</p>

            {/* Dependencies Warning */}
            {hasDependencies && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">
                    {details.isDestructive !== false ? "Warning:" : "Note:"}
                  </p>
                  <p>
                    This {details.entityType.toLowerCase()} has{" "}
                    {totalDependencies} associated record(s):
                  </p>
                  <ul className="text-xs space-y-1 mt-2">
                    {details.dependencies?.map((dep, idx) => (
                      <li key={idx}>
                        • {dep.count} {dep.friendlyName}
                      </li>
                    ))}
                  </ul>
                  {details.isDestructive !== false && (
                    <p className="mt-2 text-xs">
                      These must be reassigned or completed before deletion.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Additional Warnings */}
            {details.warnings && details.warnings.length > 0 && (
              <div className="space-y-2">
                {details.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-500"
                  >
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{warning}</p>
                  </div>
                ))}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={
              details.isDestructive !== false
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-amber-600 hover:bg-amber-700"
            }
          >
            {isLoading
              ? `${actionText.slice(0, -1)}ing...`
              : `${actionText} ${details.entityType}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletionModal;
