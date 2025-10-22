import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { AccountType } from "@/types";

// Validation schema
const accountSchema = z.object({
  name: z.string().min(3, "Nazwa musi mieć co najmniej 3 znaki"),
  type: z.enum(["asset", "liability"], {
    required_error: "Wybierz typ konta",
  }),
  initial_value: z.string().min(1, "Wartość początkowa jest wymagana"),
  date: z.string().min(1, "Data jest wymagana"),
});

type AccountFormData = z.infer<typeof accountSchema>;

export default function AddEditAccountModal() {
  const { activeModals, closeModal, addAccount } = useDashboardStore();

  const isOpen = activeModals.addAccount;
  const editContext = activeModals.editAccount;
  const isEditMode = !!editContext;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "asset",
      initial_value: "",
      date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD
    },
  });

  // Reset form when modal opens/closes or switches mode
  useEffect(() => {
    if (isOpen || isEditMode) {
      if (isEditMode && editContext) {
        form.reset({
          name: editContext.account.name,
          type: editContext.account.type as AccountType,
          initial_value: "",
          date: new Date().toISOString().split("T")[0],
        });
      } else {
        form.reset({
          name: "",
          type: "asset",
          initial_value: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
    }
  }, [isOpen, isEditMode, editContext, form]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      if (isEditMode) {
        // TODO: Implement updateAccount when API is ready
        console.log("Update account:", editContext?.account.id, data);
        closeModal("editAccount");
      } else {
        await addAccount({
          name: data.name,
          type: data.type as AccountType,
          initial_value: parseFloat(data.initial_value),
          date: data.date,
        });
      }
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("już istnieje")) {
          form.setError("name", {
            type: "manual",
            message: "Konto o tej nazwie już istnieje",
          });
        } else {
          form.setError("root", {
            type: "manual",
            message: error.message || "Wystąpił błąd podczas zapisywania konta",
          });
        }
      }
    }
  };

  const handleClose = () => {
    form.reset();
    if (isEditMode) {
      closeModal("editAccount");
    } else {
      closeModal("addAccount");
    }
  };

  return (
    <Dialog open={isOpen || isEditMode} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edytuj konto" : "Dodaj nowe konto"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Zaktualizuj nazwę konta poniżej."
              : "Uzupełnij dane nowego konta. Kliknij zapisz, aby dodać konto do listy."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa konta</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Konto oszczędnościowe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type Field - Only show in create mode */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ konta</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz typ konta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="asset">Aktywo</SelectItem>
                        <SelectItem value="liability">Pasywo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Initial Value Field - Only show in create mode */}
            {!isEditMode && (
              <>
                <FormField
                  control={form.control}
                  name="initial_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wartość początkowa</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data rozpoczęcia</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Root Error Message */}
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Zapisywanie..."
                  : isEditMode
                  ? "Zapisz zmiany"
                  : "Dodaj konto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
