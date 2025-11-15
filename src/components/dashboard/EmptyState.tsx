import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";

export default function EmptyState() {
  const { openModal } = useDashboardStore();

  const handleAddFirstAccount = () => {
    openModal("addAccount");
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Witaj w Assetly!</CardTitle>
          <CardDescription className="text-base">
            Zacznij śledzić swoją wartość netto dodając pierwsze konto finansowe
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            Dodaj swoje aktywa (oszczędności, inwestycje) lub pasywa (kredyty, pożyczki), aby zobaczyć swój dashboard z
            wykresami i kluczowymi wskaźnikami finansowymi.
          </p>
          <Button size="lg" onClick={handleAddFirstAccount} className="mt-2">
            <PlusCircle className="mr-2 h-5 w-5" />
            Dodaj swoje pierwsze konto
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
