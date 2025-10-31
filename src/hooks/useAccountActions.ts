import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridAccountDto } from "@/types";

export function useAccountActions() {
  const { openModal } = useDashboardStore();

  const handleEditAccount = (account: GridAccountDto) => {
    openModal("editAccount", { account });
  };

  const handleArchiveAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Archiwizuj konto",
      description: `Czy na pewno chcesz zarchiwizować konto "${accountName}"?`,
      onConfirm: () => {
        // TODO: Implement archive logic
      },
    });
  };

  const handleDeleteAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Usuń konto",
      description: `Czy na pewno chcesz usunąć konto "${accountName}"? Ta operacja jest nieodwracalna.`,
      onConfirm: () => {
        // TODO: Implement delete logic
      },
    });
  };

  return {
    handleEditAccount,
    handleArchiveAccount,
    handleDeleteAccount,
  };
}
