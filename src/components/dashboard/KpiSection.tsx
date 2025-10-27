import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, type LucideIcon } from "lucide-react";
import type { DashboardSummaryDto } from "@/types";

interface KpiSectionProps {
  summaryData: DashboardSummaryDto | null;
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const KpiCard = ({
  title,
  value,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "positive" | "negative";
}) => {
  const isPositive = value >= 0;
  const colorClass =
    variant === "positive"
      ? "text-green-600"
      : variant === "negative"
        ? "text-red-600"
        : isPositive
          ? "text-foreground"
          : "text-red-600";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
};

const KpiCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-32" />
    </CardContent>
  </Card>
);

export default function KpiSection({ summaryData, isLoading }: KpiSectionProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <KpiCard title="Wartość netto" value={summaryData.net_worth} icon={Wallet} />
      <KpiCard title="Aktywa" value={summaryData.total_assets} icon={TrendingUp} variant="positive" />
      <KpiCard title="Pasywa" value={summaryData.total_liabilities} icon={TrendingDown} variant="negative" />
      <KpiCard title="Skumulowane wpłaty" value={summaryData.cumulative_cash_flow} icon={ArrowUpCircle} />
      <KpiCard title="Skumulowane zyski" value={summaryData.cumulative_gain_loss} icon={ArrowDownCircle} />
    </div>
  );
}
