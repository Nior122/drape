import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Calculator,
  Loader2,
  AlertCircle,
  DollarSign,
  Percent,
  TrendingUp,
  Receipt,
  Wrench,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type CalcInputs = {
  materialCost: number;
  labourCost: number;
  overheadCost: number;
  desiredMarginPercent: number;
  taxRate: number;
};

type CalcResult = {
  totalCost: number;
  suggestedRetailPrice: number;
  wholesalePrice: number;
  profitAmount: number;
  marginPercent: number;
};

async function calculateProfit(
  data: CalcInputs
): Promise<CalcResult> {
  const res = await fetch(`${API_BASE}/api/business/profit-calculator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      materialCost: data.materialCost,
      labourCost: data.labourCost,
      overheadCost: data.overheadCost,
      desiredMarginPercent: data.desiredMarginPercent,
      taxRate: data.taxRate,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Calculation failed");
  }
  return res.json();
}

const defaultInputs: CalcInputs = {
  materialCost: 0,
  labourCost: 0,
  overheadCost: 0,
  desiredMarginPercent: 40,
  taxRate: 20,
};

export default function ProfitCalculatorPage() {
  const [inputs, setInputs] = useState<CalcInputs>(defaultInputs);

  const mutation = useMutation({
    mutationFn: calculateProfit,
  });

  const handleInputChange = (field: keyof CalcInputs, value: number) => {
    const updated = { ...inputs, [field]: value };
    setInputs(updated);
  };

  const handleCalculate = () => {
    mutation.mutate(inputs);
  };

  // Client-side fallback calculation
  const totalCost = inputs.materialCost + inputs.labourCost + inputs.overheadCost;
  const desiredProfit = totalCost * (inputs.desiredMarginPercent / 100);
  const preTaxPrice = totalCost + desiredProfit;
  const suggestedRetail = preTaxPrice * (1 + inputs.taxRate / 100);
  const wholesalePrice = totalCost * 1.3;
  const profitAmount = suggestedRetail - totalCost - (suggestedRetail * inputs.taxRate) / (100 + inputs.taxRate);
  const marginPercent = totalCost > 0 ? (profitAmount / suggestedRetail) * 100 : 0;

  const result: CalcResult = mutation.data ?? {
    totalCost,
    suggestedRetailPrice: Math.round(suggestedRetail),
    wholesalePrice: Math.round(wholesalePrice),
    profitAmount: Math.round(profitAmount),
    marginPercent: Math.round(marginPercent * 10) / 10,
  };

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Profit Calculator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Calculate pricing, margins, and profitability for your products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Cost Inputs
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                Material Cost (pence)
              </label>
              <Input
                type="number"
                min={0}
                value={inputs.materialCost}
                onChange={(e) =>
                  handleInputChange(
                    "materialCost",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="e.g. 1500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                Labour Cost (pence)
              </label>
              <Input
                type="number"
                min={0}
                value={inputs.labourCost}
                onChange={(e) =>
                  handleInputChange(
                    "labourCost",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="e.g. 2000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Overhead Cost (pence)
              </label>
              <Input
                type="number"
                min={0}
                value={inputs.overheadCost}
                onChange={(e) =>
                  handleInputChange(
                    "overheadCost",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="e.g. 500"
              />
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Desired Margin (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.desiredMarginPercent}
                  onChange={(e) =>
                    handleInputChange(
                      "desiredMarginPercent",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Percent className="h-3.5 w-3.5" />
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.taxRate}
                  onChange={(e) =>
                    handleInputChange(
                      "taxRate",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleCalculate}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            Calculate
          </Button>

          {mutation.isError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {(mutation.error as Error).message}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Pricing Results
          </h2>

          {totalCost === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calculator className="h-10 w-10 mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">Enter costs to calculate</p>
              <p className="text-xs mt-1">
                Fill in the cost fields and click Calculate
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Cost
                  </span>
                  <span className="text-lg font-bold text-foreground font-mono">
                    £{(result.totalCost / 100).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Suggested Retail Price
                  </span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    £{(result.suggestedRetailPrice / 100).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Wholesale Price
                  </span>
                  <span className="text-lg font-bold text-blue-400 font-mono">
                    £{(result.wholesalePrice / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit</p>
                  <p className="text-xl font-bold text-foreground font-mono">
                    £{(result.profitAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Margin</p>
                  <p className="text-xl font-bold text-foreground font-mono">
                    {result.marginPercent}%
                  </p>
                </div>
              </div>

              {/* Cost breakdown mini bar */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Cost Breakdown
                </p>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  <div
                    className="bg-blue-500/70 transition-all"
                    style={{
                      width: `${
                        totalCost > 0
                          ? (inputs.materialCost / totalCost) * 100
                          : 0
                    }%`,
                    }}
                  />
                  <div
                    className="bg-purple-500/70 transition-all"
                    style={{
                      width: `${
                        totalCost > 0
                          ? (inputs.labourCost / totalCost) * 100
                          : 0
                    }%`,
                    }}
                  />
                  <div
                    className="bg-orange-500/70 transition-all"
                    style={{
                      width: `${
                        totalCost > 0
                          ? (inputs.overheadCost / totalCost) * 100
                          : 0
                    }%`,
                    }}
                  />
                </div>
                <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500/70" />
                    Materials
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500/70" />
                    Labour
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500/70" />
                    Overhead
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick reference */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quick Reference — Common Margins
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { margin: 30, label: "Low", color: "text-yellow-400" },
            { margin: 40, label: "Standard", color: "text-blue-400" },
            { margin: 50, label: "Good", color: "text-emerald-400" },
            { margin: 65, label: "Premium", color: "text-purple-400" },
          ].map((ref) => {
            const testPrice =
              totalCost + totalCost * (ref.margin / 100);
            const testTax = testPrice * (inputs.taxRate / 100);
            const testRetail = testPrice + testTax;
            return (
              <div
                key={ref.margin}
                className="bg-muted/30 rounded-lg p-3 text-center"
              >
                <p className={cn("text-lg font-bold font-mono", ref.color)}>
                  {ref.margin}%
                </p>
                <p className="text-xs text-muted-foreground">{ref.label}</p>
                <p className="text-xs font-mono text-foreground mt-1">
                  £{(testRetail / 100).toFixed(0)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
