import { useEffect } from "react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import KpiSection from "./KpiSection";
import NetWorthChart from "./NetWorthChart";
import DashboardToolbar from "./DashboardToolbar";
import DataGrid from "./DataGrid";
import AddEditAccountModal from "./AddEditAccountModal";
import EditValueModal from "./EditValueModal";
import ConfirmActionDialog from "./ConfirmActionDialog";

export default function IntegratedDashboardPage() {
  const { isLoading, error, gridData, summaryData, fetchData } = useDashboardStore();

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd ładowania danych</AlertTitle>
          <AlertDescription className="mt-2">
            Nie udało się załadować danych dashboardu. Spróbuj odświeżyć stronę.
          </AlertDescription>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Odśwież stronę
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Twoje centrum finansowe - zarządzaj kontami i śledź wartość netto
          </p>
        </div>

        {/* Toolbar */}
        <DashboardToolbar />

        {/* KPI Section */}
        <KpiSection summaryData={summaryData} isLoading={isLoading} />

        {/* Chart Section */}
        <NetWorthChart gridData={gridData} isLoading={isLoading} />

        {/* Data Grid */}
        <DataGrid gridData={gridData} isLoading={isLoading} />

        {/* Modals */}
        <AddEditAccountModal />
        <EditValueModal />
        <ConfirmActionDialog />
      </div>
    </div>
  );
}
