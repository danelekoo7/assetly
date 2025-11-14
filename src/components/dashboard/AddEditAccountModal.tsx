import { useEffect, useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { AccountType } from "@/types";

// Validation schema
const accountSchema = z.object({
  name: z.string().min(3, "Nazwa musi mieć co najmniej 3 znaki"),
  type: z.enum(["investment_asset", "cash_asset", "liability"], {
    required_error: "Wybierz typ konta",
  }),
  initial_value: z.coerce.number({
    required_error: "Wartość początkowa jest wymagana",
    invalid_type_error: "Wartość musi być liczbą",
  }),
});

const editAccountSchema = accountSchema.pick({ name: true });

type AccountFormData = z.infer<typeof accountSchema>;

export default function AddEditAccountModal() {
  const { activeModals, closeModal, addAccount, updateAccountName } = useDashboardStore();

  const isOpen = activeModals.addAccount;
  const editContext = activeModals.editAccount;
  const isEditMode = !!editContext;

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const form = useForm<AccountFormData>({
    resolver: zodResolver(isEditMode ? editAccountSchema : accountSchema),
    defaultValues: {
      name: "",
      type: "investment_asset",
      initial_value: 0,
    },
  });

  // Reset form when modal opens/closes or switches mode
  useEffect(() => {
    if (isOpen || isEditMode) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);

      if (isEditMode && editContext) {
        form.reset({
          name: editContext.account.name,
          type: editContext.account.type,
          initial_value: 0,
        });
      } else {
        form.reset({
          name: "",
          type: "investment_asset",
          initial_value: 0,
        });
      }
    }
  }, [isOpen, isEditMode, editContext, form]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      if (isEditMode && editContext) {
        await updateAccountName(editContext.account.id, data.name);
      } else {
        // Format date as YYYY-MM-DD string to avoid timezone issues
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        await addAccount({
          name: data.name,
          type: data.type as AccountType,
          initial_value: data.initial_value,
          date: dateStr + "T00:00:00Z", // Add time in UTC to prevent timezone shift
        });
      }
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // The store action for updateAccountName already shows a toast for 409
        // We just need to set the form error state
        if (error.message.includes("Conflict")) {
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
          <DialogTitle>{isEditMode ? "Edytuj konto" : "Dodaj nowe konto"}</DialogTitle>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz typ konta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="investment_asset">Aktywo inwestycyjne</SelectItem>
                        <SelectItem value="cash_asset">Aktywo gotówkowe</SelectItem>
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
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Data rozpoczęcia</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PP", { locale: pl }) : <span>Wybierz datę</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        locale={pl}
                        disabled={(date) => {
                          // Disable future dates
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date > today;
                        }}
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              </>
            )}

            {/* Root Error Message */}
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={form.formState.isSubmitting}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Zapisywanie..." : isEditMode ? "Zapisz zmiany" : "Dodaj konto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
