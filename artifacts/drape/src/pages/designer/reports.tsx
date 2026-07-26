import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Loader2,
  AlertCircle,
  Download,
  FileText,
  BarChart3,
  Package,
  Wallet,
  TrendingUp,
  Calendar,
  ChevronDown,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

type ReportType = "revenue" | "inventory" | "expenses" | "production";

const REPORT_TYPES: {
  value: ReportType;
  label: string;
  icon: typeof BarChart3;
  description: string;
}[] = [
  {
    value: "revenue",
    label: "Revenue Report",
    icon: TrendingUp,
    description: "Revenue breakdown by client, project, and time period",
  },
  {
    value: "inventory",
    label: "Inventory Report",
    icon: Package,
    description: "Stock levels, valuations, and movement history",
  },
  {
    value: "expenses",
    label: "Expenses Report",
    icon: Wallet,
    description: "Expense summaries by category and vendor",
  },
  {
    value: "production",
    label: "Production Report",
    icon: BarChart3,
    description: "Production output, timelines, and efficiency metrics",
  },
];

type ReportData = {
  headers: string[];
  rows: string[][];
  summary?: Record<string, string | number>;
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const { data, isLoading, error, refetch } = useQuery<ReportData>({
    queryKey: ["reports", reportType, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
      });
      return fetchApi<ReportData>(
        `/api/business/reports/${reportType}?${params.toString()}`
      );
    },
    enabled: !!dateFrom && !!dateTo,
  });

  const handleExportCSV = () => {
    if (!data) return;
    const header = data.headers.join(",");
    const rows = data.rows.map((r) =>
      r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // Placeholder — actual PDF generation would use a library
    alert(
      "PDF export will be available soon. The data is ready for download as CSV."
    );
  };

  const activeReport = REPORT_TYPES.find((r) => r.value === reportType);
  const ReportIcon = activeReport?.icon ?? BarChart3;

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate and export business reports
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isActive = reportType === rt.value;
          return (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={cn(
                "bg-card rounded-xl border p-4 text-left transition-all hover:border-primary/30",
                isActive
                  ? "border-primary/50 ring-1 ring-primary/20"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                  isActive ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <p
                className={cn(
                  "text-sm font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {rt.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Date Filter + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
          />
        </div>
        {data && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Active Report Info */}
      {activeReport && (
        <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ReportIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {activeReport.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeReport.description}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">Failed to load report</p>
          <p className="text-xs text-muted-foreground">
            {(error as Error).message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Report Data */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Summary cards */}
          {data.summary && Object.keys(data.summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(data.summary).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {typeof value === "number" && key.toLowerCase().includes("revenue")
                      ? `£${(value / 100).toFixed(0)}`
                      : typeof value === "number" && key.toLowerCase().includes("amount")
                        ? `£${(value / 100).toFixed(0)}`
                        : String(value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Data table */}
          {data.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
              <Table2 className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                No data available
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting the date range or selecting a different report
                type
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.headers.map((h, i) => (
                      <TableHead key={i}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell
                          key={j}
                          className={
                            j === data.headers.length - 1
                              ? "text-right font-mono text-sm"
                              : ""
                          }
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Record count */}
          <p className="text-xs text-muted-foreground text-right">
            {data.rows.length} record{data.rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Pre-fetch state (no data yet, not loading, no error) */}
      {!data && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Select a date range
          </p>
          <p className="text-xs text-muted-foreground">
            Choose a report type and date range to generate your report
          </p>
        </div>
      )}
    </div>
  );
}
