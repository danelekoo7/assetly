import { useEffect, useReducer } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

// Validation schema
const valueEntrySchema = z.object({
  value: z.string().min(1, "Wartość jest wymagana"),
  cash_flow: z.string().optional(),
  gain_loss: z.string().optional(),
});

type ValueEntryFormData = z.infer<typeof valueEntrySchema>;

// State for auto-calculation logic
interface CalcState {
  value: string;
  cash_flow: string;
  gain_loss: string;
  lastModified: "value" | "cash_flow" | "gain_loss" | null;
  userModifiedCashFlow: boolean; // Track if user manually edited cash_flow
  userModifiedGainLoss: boolean; // Track if user manually edited gain_loss
}

type CalcAction =
  | { type: "SET_VALUE"; payload: string }
  | { type: "SET_CASH_FLOW"; payload: string }
  | { type: "SET_GAIN_LOSS"; payload: string }
  | { type: "AUTO_SET_CASH_FLOW"; payload: string } // Auto-set without marking as user-modified
  | { type: "AUTO_SET_GAIN_LOSS"; payload: string } // Auto-set without marking as user-modified
  | { type: "RESET"; payload: CalcState };

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatAccountType = (type: string): string => {
  switch (type) {
    case "investment_asset":
      return "Aktywo inwestycyjne";
    case "cash_asset":
      return "Aktywo gotówkowe";
    case "liability":
      return "Pasywo";
    default:
      return type;
  }
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "SET_VALUE":
      return { ...state, value: action.payload, lastModified: "value" };
    case "SET_CASH_FLOW":
      return {
        ...state,
        cash_flow: action.payload,
        lastModified: "cash_flow",
        userModifiedCashFlow: true,
      };
    case "SET_GAIN_LOSS":
      return {
        ...state,
        gain_loss: action.payload,
        lastModified: "gain_loss",
        userModifiedGainLoss: true,
      };
    case "AUTO_SET_CASH_FLOW":
      return { ...state, cash_flow: action.payload };
    case "AUTO_SET_GAIN_LOSS":
      return { ...state, gain_loss: action.payload };
    case "RESET":
      return action.payload;
    default:
      return state;
  }
}

export default function EditValueModal() {
  const { activeModals, closeModal, updateValueEntry, gridData } = useDashboardStore();

  const context = activeModals.editValue;
  const isOpen = !!context;

  const form = useForm<ValueEntryFormData>({
    resolver: zodResolver(valueEntrySchema),
    defaultValues: {
      value: "",
      cash_flow: "",
      gain_loss: "",
    },
  });

  const [calcState, dispatch] = useReducer(calcReducer, {
    value: "",
    cash_flow: "",
    gain_loss: "",
    lastModified: null,
    userModifiedCashFlow: false,
    userModifiedGainLoss: false,
  });

  // Get previous value from gridData
  const previousValue = context?.previousValue ?? 0;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && context) {
      // Find existing entry data if available
      const account = gridData?.accounts.find((acc) => acc.id === context.accountId);
      const entry = account?.entries[context.date];

      const initialValue = entry?.value?.toString() ?? context.previousValue.toString();
      const initialCashFlow = entry?.cash_flow?.toString() ?? "";
      const initialGainLoss = entry?.gain_loss?.toString() ?? "";

      form.reset({
        value: initialValue,
        cash_flow: initialCashFlow,
        gain_loss: initialGainLoss,
      });

      dispatch({
        type: "RESET",
        payload: {
          value: initialValue,
          cash_flow: initialCashFlow,
          gain_loss: initialGainLoss,
          lastModified: null,
          userModifiedCashFlow: false,
          userModifiedGainLoss: false,
        },
      });
    }
  }, [isOpen, context, form, gridData]);

  // Auto-calculation effect
  useEffect(() => {
    if (!calcState.lastModified) return;

    const val = parseFloat(calcState.value) || 0;
    const cf = parseFloat(calcState.cash_flow) || 0;
    const gl = parseFloat(calcState.gain_loss) || 0;

    // Formula: new_value = previous_value + cash_flow + gain_loss
    // Rearranged: gain_loss = new_value - previous_value - cash_flow
    // Rearranged: cash_flow = new_value - previous_value - gain_loss

    if (calcState.lastModified === "value") {
      // If user hasn't manually modified cash_flow or gain_loss, auto-calculate based on account type
      if (!calcState.userModifiedCashFlow && !calcState.userModifiedGainLoss) {
        const valueDifference = val - previousValue;

        // Logic depends on account type (from PRD section 3.4 and US-009)
        if (context?.accountType === "investment_asset") {
          // Investment asset: change = gain/loss (cash_flow = 0)
          const newCashFlow = "0";
          const newGainLoss = valueDifference.toFixed(2);
          if (calcState.cash_flow !== newCashFlow || calcState.gain_loss !== newGainLoss) {
            form.setValue("cash_flow", newCashFlow, { shouldValidate: false });
            form.setValue("gain_loss", newGainLoss, { shouldValidate: false });
            dispatch({ type: "AUTO_SET_CASH_FLOW", payload: newCashFlow });
            dispatch({ type: "AUTO_SET_GAIN_LOSS", payload: newGainLoss });
          }
        } else {
          // Cash asset or Liability: change = cash_flow (gain_loss = 0)
          const newCashFlow = valueDifference.toFixed(2);
          const newGainLoss = "0";
          if (calcState.cash_flow !== newCashFlow || calcState.gain_loss !== newGainLoss) {
            form.setValue("cash_flow", newCashFlow, { shouldValidate: false });
            form.setValue("gain_loss", newGainLoss, { shouldValidate: false });
            dispatch({ type: "AUTO_SET_CASH_FLOW", payload: newCashFlow });
            dispatch({ type: "AUTO_SET_GAIN_LOSS", payload: newGainLoss });
          }
        }
      }
      // If only cash_flow was modified by user, calculate gain_loss
      else if (calcState.userModifiedCashFlow && !calcState.userModifiedGainLoss) {
        const calculatedGainLoss = val - previousValue - cf;
        const newGainLoss = calculatedGainLoss.toFixed(2);
        if (calcState.gain_loss !== newGainLoss) {
          form.setValue("gain_loss", newGainLoss, { shouldValidate: false });
          dispatch({ type: "AUTO_SET_GAIN_LOSS", payload: newGainLoss });
        }
      }
      // If only gain_loss was modified by user, calculate cash_flow
      else if (calcState.userModifiedGainLoss && !calcState.userModifiedCashFlow) {
        const calculatedCashFlow = val - previousValue - gl;
        const newCashFlow = calculatedCashFlow.toFixed(2);
        if (calcState.cash_flow !== newCashFlow) {
          form.setValue("cash_flow", newCashFlow, { shouldValidate: false });
          dispatch({ type: "AUTO_SET_CASH_FLOW", payload: newCashFlow });
        }
      }
    } else if (calcState.lastModified === "cash_flow") {
      // Calculate gain_loss based on value and cash_flow
      if (calcState.value) {
        const calculatedGainLoss = val - previousValue - cf;
        const newGainLoss = calculatedGainLoss.toFixed(2);
        if (calcState.gain_loss !== newGainLoss) {
          form.setValue("gain_loss", newGainLoss, { shouldValidate: false });
          dispatch({ type: "AUTO_SET_GAIN_LOSS", payload: newGainLoss });
        }
      }
    } else if (calcState.lastModified === "gain_loss") {
      // Calculate cash_flow based on value and gain_loss
      if (calcState.value) {
        const calculatedCashFlow = val - previousValue - gl;
        const newCashFlow = calculatedCashFlow.toFixed(2);
        if (calcState.cash_flow !== newCashFlow) {
          form.setValue("cash_flow", newCashFlow, { shouldValidate: false });
          dispatch({ type: "AUTO_SET_CASH_FLOW", payload: newCashFlow });
        }
      }
    }
  }, [calcState, previousValue, context?.accountType, form]);

  const onSubmit = async (data: ValueEntryFormData) => {
    if (!context) return;

    try {
      await updateValueEntry({
        account_id: context.accountId,
        date: context.date,
        value: parseFloat(data.value),
        cash_flow: data.cash_flow ? parseFloat(data.cash_flow) : null,
        gain_loss: data.gain_loss ? parseFloat(data.gain_loss) : null,
      });
    } catch (error) {
      if (error instanceof Error) {
        form.setError("root", {
          type: "manual",
          message: error.message || "Wystąpił błąd podczas zapisywania wartości",
        });
      }
    }
  };

  const handleClose = () => {
    form.reset();
    closeModal("editValue");
  };

  if (!context) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edytuj wartość</DialogTitle>
          <DialogDescription>
            Zaktualizuj wartość konta na wybrany dzień. System automatycznie obliczy pozostałe pola.
          </DialogDescription>
        </DialogHeader>

        {/* Context Information */}
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Konto:</span>{" "}
              <span className="text-muted-foreground">
                {gridData?.accounts.find((acc) => acc.id === context.accountId)?.name}
              </span>
            </div>
            <div>
              <span className="font-medium">Typ:</span>{" "}
              <span className="text-muted-foreground">
                {formatAccountType(gridData?.accounts.find((acc) => acc.id === context.accountId)?.type ?? "")}
              </span>
            </div>
            <div>
              <span className="font-medium">Data:</span>{" "}
              <span className="text-muted-foreground">{format(new Date(context.date), "PPP", { locale: pl })}</span>
            </div>
            <div>
              <span className="font-medium">Poprzednia wartość:</span>{" "}
              <span className="text-muted-foreground">{formatCurrency(previousValue)}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Value Field */}
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nowa wartość *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        dispatch({ type: "SET_VALUE", payload: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cash Flow Field */}
            <FormField
              control={form.control}
              name="cash_flow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wpłata / Wypłata</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        dispatch({ type: "SET_CASH_FLOW", payload: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>Dodatnia wartość dla wpłat, ujemna dla wypłat</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gain/Loss Field */}
            <FormField
              control={form.control}
              name="gain_loss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zysk / Strata</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        dispatch({ type: "SET_GAIN_LOSS", payload: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>Zysk/strata inwestycyjna (obliczana automatycznie)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Root Error Message */}
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={form.formState.isSubmitting}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
