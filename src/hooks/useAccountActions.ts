import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { AccountDto } from "@/types";

export function useAccountActions() {
  const { openModal, archiveAccount, restoreAccount, deleteAccount } = useDashboardStore();

  const handleEditAccount = (account: AccountDto) => {
    openModal("editAccount", { account });
  };

  const handleArchiveAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Archiwizuj konto",
      description: `Czy na pewno chcesz zarchiwizować konto "${accountName}"?`,
      onConfirm: () => archiveAccount(accountId),
    });
  };

  const handleRestoreAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Przywróć konto",
      description: `Czy na pewno chcesz przywrócić konto "${accountName}" z archiwum?`,
      onConfirm: () => restoreAccount(accountId),
    });
  };

  const handleDeleteAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Usuń konto",
      description: `Czy na pewno chcesz usunąć konto "${accountName}"? Ta operacja jest nieodwracalna.`,
      onConfirm: () => deleteAccount(accountId),
    });
  };

  return {
    handleEditAccount,
    handleArchiveAccount,
    handleRestoreAccount,
    handleDeleteAccount,
  };
}
