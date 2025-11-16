import { useEffect } from "react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import KpiSection from "./KpiSection";
import NetWorthChart from "./NetWorthChart";
import DashboardToolbar from "./DashboardToolbar";
import DataGrid from "./DataGrid";
import AddEditAccountModal from "./AddEditAccountModal";
import EditValueModal from "./EditValueModal";
import ConfirmActionDialog from "./ConfirmActionDialog";
import EmptyState from "./EmptyState";
import DashboardLoadingSkeleton from "./DashboardLoadingSkeleton";

export default function IntegratedDashboardPage() {
  const { isLoading, error, gridData, summaryData, fetchData } = useDashboardStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd ładowania danych</AlertTitle>
          <AlertDescription className="mt-2">
            Nie udało się załadować danych dashboardu. Spróbuj odświeżyć stronę.
          </AlertDescription>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Odśwież stronę
          </Button>
        </Alert>
      </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return <DashboardLoadingSkeleton />;
    }

    if (gridData && gridData.accounts.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Twoje centrum finansowe - zarządzaj kontami i śledź wartość netto</p>
        </div>

        {/* Toolbar */}
        <DashboardToolbar />

        {/* KPI Section */}
        <KpiSection summaryData={summaryData} />

        {/* Chart Section */}
        <NetWorthChart gridData={gridData} />

        {/* Data Grid */}
        <DataGrid gridData={gridData} />
      </div>
    );
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-background p-2 sm:p-6">
        {renderContent()}
        {/* Modals are always needed */}
        <AddEditAccountModal />
        <EditValueModal />
        <ConfirmActionDialog />
      </div>
    </>
  );
}
