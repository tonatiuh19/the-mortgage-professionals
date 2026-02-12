import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { DeletionDetails } from "@/components/ui/deletion-modal";

interface UseDeletionModalOptions<T> {
  entityType: string;
  onDelete: (entity: T) => Promise<any>;
  onSuccess?: (entity: T) => void;
  onError?: (entity: T, error: any) => void;
  getDisplayName: (entity: T) => string;
  getDependencies?: (entity: T) => DeletionDetails["dependencies"];
  getWarnings?: (entity: T) => string[];
  isDestructive?: boolean;
}

export function useDeletionModal<T>({
  entityType,
  onDelete,
  onSuccess,
  onError,
  getDisplayName,
  getDependencies,
  getWarnings,
  isDestructive = true,
}: UseDeletionModalOptions<T>) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<T | null>(null);

  const openModal = (entity: T) => {
    setEntityToDelete(entity);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEntityToDelete(null);
    setIsLoading(false);
  };

  const handleConfirm = async () => {
    if (!entityToDelete) return;

    setIsLoading(true);
    try {
      await onDelete(entityToDelete);

      const actionText = isDestructive ? "deleted" : "deactivated";
      toast({
        title: `${entityType} ${actionText}`,
        description: `${getDisplayName(entityToDelete)} has been ${actionText} successfully.`,
      });

      onSuccess?.(entityToDelete);
      closeModal();
    } catch (error: any) {
      console.error(`Error deleting ${entityType}:`, error);

      toast({
        title: `Cannot ${isDestructive ? "delete" : "deactivate"} ${entityType.toLowerCase()}`,
        description:
          error ||
          `Failed to ${isDestructive ? "delete" : "deactivate"} ${entityType.toLowerCase()}.`,
        variant: "destructive",
      });

      onError?.(entityToDelete, error);
      setIsLoading(false); // Don't close modal on error
    }
  };

  const deletionDetails: DeletionDetails | null = entityToDelete
    ? {
        entityName: getDisplayName(entityToDelete),
        entityType,
        displayName: getDisplayName(entityToDelete),
        dependencies: getDependencies?.(entityToDelete),
        warnings: getWarnings?.(entityToDelete),
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
    entityToDelete,
  };
}

export default useDeletionModal;
