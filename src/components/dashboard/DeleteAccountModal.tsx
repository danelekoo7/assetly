import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * DeleteAccountModal Component
 *
 * Provides a secure UI for users to permanently delete their account.
 * Features:
 * - Password confirmation required
 * - Clear warning about irreversibility
 * - Error handling with user-friendly messages
 * - Redirect to confirmation page on success
 */
export function DeleteAccountModal() {
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteAccount = async () => {
    // Validate password is not empty
    if (!password.trim()) {
      toast.error("Wprowadź hasło");
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.status === 204) {
        // Success - account deleted
        // Redirect to confirmation page
        window.location.href = "/account-deleted";
      } else {
        // Handle errors
        const data = await response.json();

        if (response.status === 401) {
          toast.error(data.error || "Nieprawidłowe hasło");
        } else {
          toast.error(data.error || "Nie udało się usunąć konta");
        }

        setIsDeleting(false);
      }
    } catch {
      toast.error("Wystąpił błąd podczas usuwania konta");
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // Reset password when modal is closed
    if (!open) {
      setPassword("");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          Usuń konto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć konto?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="font-semibold text-destructive">Ta operacja jest nieodwracalna!</p>
            <p>Usunięcie konta spowoduje trwałe usunięcie wszystkich Twoich danych, w tym:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Wszystkich kont finansowych</li>
              <li>Całej historii wartości i transakcji</li>
              <li>Ustawień użytkownika</li>
            </ul>
            <p className="pt-2">Aby potwierdzić, wprowadź swoje hasło:</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            placeholder="Wprowadź hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password.trim()) {
                handleDeleteAccount();
              }
            }}
            disabled={isDeleting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDeleteAccount();
            }}
            disabled={isDeleting || !password.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Usuwanie..." : "Usuń konto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
