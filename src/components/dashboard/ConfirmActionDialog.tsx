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
import { useDashboardStore } from "@/lib/stores/useDashboardStore";

export default function ConfirmActionDialog() {
  const { activeModals, closeModal } = useDashboardStore();

  const context = activeModals.confirmAction;
  const isOpen = !!context;

  const handleConfirm = () => {
    if (context?.onConfirm) {
      context.onConfirm();
    }
    closeModal("confirmAction");
  };

  const handleCancel = () => {
    closeModal("confirmAction");
  };

  if (!context) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{context.title}</AlertDialogTitle>
          <AlertDialogDescription>{context.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Potwierdź
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
