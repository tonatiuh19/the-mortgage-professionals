import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { DeletionDetails } from "@/components/ui/deletion-modal";

interface UseBulkDeletionOptions<T> {
  entityType: string;
  onBulkDelete: (entities: T[]) => Promise<any>;
  onSuccess?: (entities: T[]) => void;
  onError?: (entities: T[], error: any) => void;
  getDisplayName: (entity: T) => string;
  isDestructive?: boolean;
}

export function useBulkDeletion<T>({
  entityType,
  onBulkDelete,
  onSuccess,
  onError,
  getDisplayName,
  isDestructive = true,
}: UseBulkDeletionOptions<T>) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entitiesToDelete, setEntitiesToDelete] = useState<T[]>([]);

  const openModal = (entities: T[]) => {
    setEntitiesToDelete(entities);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEntitiesToDelete([]);
    setIsLoading(false);
  };

  const handleConfirm = async () => {
    if (entitiesToDelete.length === 0) return;

    setIsLoading(true);
    try {
      await onBulkDelete(entitiesToDelete);

      const actionText = isDestructive ? "deleted" : "deactivated";
      const count = entitiesToDelete.length;
      const pluralType = count === 1 ? entityType : `${entityType}s`;

      toast({
        title: `${pluralType} ${actionText}`,
        description: `${count} ${pluralType.toLowerCase()} ${count === 1 ? "has" : "have"} been ${actionText} successfully.`,
      });

      onSuccess?.(entitiesToDelete);
      closeModal();
    } catch (error: any) {
      console.error(`Error bulk deleting ${entityType}:`, error);

      const count = entitiesToDelete.length;
      const pluralType = count === 1 ? entityType : `${entityType}s`;
      const actionText = isDestructive ? "delete" : "deactivate";

      toast({
        title: `Cannot ${actionText} ${pluralType.toLowerCase()}`,
        description:
          error ||
          `Failed to ${actionText} selected ${pluralType.toLowerCase()}.`,
        variant: "destructive",
      });

      onError?.(entitiesToDelete, error);
      setIsLoading(false); // Don't close modal on error
    }
  };

  const deletionDetails: DeletionDetails | null =
    entitiesToDelete.length > 0
      ? {
          entityName:
            entitiesToDelete.length === 1
              ? getDisplayName(entitiesToDelete[0])
              : `${entitiesToDelete.length} ${entityType}s`,
          entityType:
            entitiesToDelete.length === 1 ? entityType : `${entityType}s`,
          displayName:
            entitiesToDelete.length === 1
              ? getDisplayName(entitiesToDelete[0])
              : entitiesToDelete.map(getDisplayName).join(", "),
          dependencies: undefined, // Bulk operations typically don't show detailed dependencies
          warnings:
            entitiesToDelete.length > 1
              ? [
                  `This will ${isDestructive ? "permanently delete" : "deactivate"} ${entitiesToDelete.length} ${entityType.toLowerCase()}s at once.`,
                ]
              : undefined,
          isDestructive,
        }
      : null;

  return {
    isOpen,
    isLoading,
    openModal,
    closeModal,
    handleConfirm,
    deletionDetails,
    entitiesToDelete,
    count: entitiesToDelete.length,
  };
}

export default useBulkDeletion;
