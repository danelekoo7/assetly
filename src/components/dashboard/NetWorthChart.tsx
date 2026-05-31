import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { GridDataDto } from "@/types";

interface NetWorthChartProps {
  gridData: GridDataDto | null;
}

type SeriesKey = "net_worth" | "cumulative_cash_flow" | "cumulative_gain_loss";

interface ChartDataPoint {
  date: string;
  net_worth: number;
  cumulative_cash_flow?: number;
  cumulative_gain_loss?: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
};

export default function NetWorthChart({ gridData }: NetWorthChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<SeriesKey[]>(["net_worth"]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!gridData) return [];

    return gridData.dates.map((date) => {
      const summary = gridData.summary.by_date[date];

      let cumulativeCashFlow = 0;
      let cumulativeGainLoss = 0;

      gridData.accounts.forEach((account) => {
        const entry = account.entries[date];
        if (entry) {
          cumulativeCashFlow += entry.cash_flow || 0;
          cumulativeGainLoss += entry.gain_loss || 0;
        }
      });

      return {
        date,
        net_worth: summary?.net_worth || 0,
        cumulative_cash_flow: cumulativeCashFlow,
        cumulative_gain_loss: cumulativeGainLoss,
      };
    });
  }, [gridData]);

  const yDomain = useMemo<[number | "auto", number | "auto"]>(() => {
    const values: number[] = [];
    chartData.forEach((point) => {
      visibleSeries.forEach((series) => {
        const value = point[series];
        if (typeof value === "number" && Number.isFinite(value)) {
          values.push(value);
        }
      });
    });

    if (values.length === 0) {
      return ["auto", "auto"];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range === 0 ? Math.max(Math.abs(max) * 0.05, 1) : range * 0.1;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, visibleSeries]);

  const handleSeriesToggle = (value: string[]) => {
    if (value.length > 0) {
      setVisibleSeries(value as SeriesKey[]);
    }
  };

  const isSeriesVisible = (series: SeriesKey) => visibleSeries.includes(series);

  if (!gridData || gridData.dates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historia wartości netto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-96 items-center justify-center text-muted-foreground">Brak danych do wyświetlenia</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Historia wartości netto</CardTitle>
        <ToggleGroup type="multiple" value={visibleSeries} onValueChange={handleSeriesToggle} className="justify-start">
          <ToggleGroupItem value="net_worth" aria-label="Wartość netto">
            Wartość netto
          </ToggleGroupItem>
          <ToggleGroupItem value="cumulative_cash_flow" aria-label="Wpłaty">
            Wpłaty
          </ToggleGroupItem>
          <ToggleGroupItem value="cumulative_gain_loss" aria-label="Zyski">
            Zyski
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" />
            <YAxis tickFormatter={formatCurrency} className="text-xs" domain={yDomain} allowDataOverflow={false} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={formatDate}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            {isSeriesVisible("net_worth") && (
              <Line
                type="monotone"
                dataKey="net_worth"
                stroke="hsl(217 91% 60%)"
                strokeWidth={2}
                name="Wartość netto"
                dot={false}
              />
            )}
            {isSeriesVisible("cumulative_cash_flow") && (
              <Line
                type="monotone"
                dataKey="cumulative_cash_flow"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                name="Skumulowane wpłaty"
                dot={false}
              />
            )}
            {isSeriesVisible("cumulative_gain_loss") && (
              <Line
                type="monotone"
                dataKey="cumulative_gain_loss"
                stroke="hsl(346 87% 43%)"
                strokeWidth={2}
                name="Skumulowane zyski"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
