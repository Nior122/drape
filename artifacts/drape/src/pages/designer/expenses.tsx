import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Wallet,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Tag,
  Calendar,
  Receipt,
  Building2,
  Trash2,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  vendor: string;
  taxDeductible: boolean;
  receiptNotes: string;
  createdAt: string;
};

const EXPENSE_CATEGORIES = [
  "Materials",
  "Labour",
  "Tools",
  "Rent",
  "Utilities",
  "Marketing",
  "Shipping",
  "Office",
  "Travel",
  "Software",
  "Insurance",
  "Other",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Materials: "text-blue-400 bg-blue-400/10",
  Labour: "text-emerald-400 bg-emerald-400/10",
  Tools: "text-purple-400 bg-purple-400/10",
  Rent: "text-orange-400 bg-orange-400/10",
  Utilities: "text-yellow-400 bg-yellow-400/10",
  Marketing: "text-pink-400 bg-pink-400/10",
  Shipping: "text-cyan-400 bg-cyan-400/10",
  Office: "text-slate-400 bg-slate-400/10",
  Travel: "text-violet-400 bg-violet-400/10",
  Software: "text-indigo-400 bg-indigo-400/10",
  Insurance: "text-rose-400 bg-rose-400/10",
  Other: "text-muted-foreground bg-muted",
};

const defaultForm = {
  description: "",
  category: "Materials" as string,
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  vendor: "",
  taxDeductible: false,
  receiptNotes: "",
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: expenses, isLoading, error } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => fetchApi<Expense[]>("/api/business/expenses"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultForm) =>
      fetchApi<Expense>("/api/business/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDialogOpen(false);
      setForm(defaultForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Expense) =>
      fetchApi<Expense>(`/api/business/expenses/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/business/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteConfirm(null);
    },
  });

  const items = expenses ?? [];
  const filtered = items.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "All" || e.category === categoryFilter;
    const matchesDateFrom = !dateFrom || e.date >= dateFrom;
    const matchesDateTo = !dateTo || e.date <= dateTo;
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  // Category summary
  const categorySummary = EXPENSE_CATEGORIES.filter((c) => c !== "All")
    .map((cat) => ({
      category: cat,
      total: items
        .filter((e) => e.category === cat)
        .reduce((s, e) => s + e.amount, 0),
      count: items.filter((e) => e.category === cat).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      description: exp.description,
      category: exp.category,
      amount: exp.amount,
      date: exp.date,
      vendor: exp.vendor,
      taxDeductible: exp.taxDeductible,
      receiptNotes: exp.receiptNotes,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ ...editing, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">Failed to load expenses</p>
        <p className="text-xs text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your business expenses
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-36"
          placeholder="To"
        />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            {items.length}
          </p>
          <p className="text-xs text-muted-foreground">Total Entries</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-destructive">
            £{(totalAmount / 100).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">Total (Filtered)</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            {items.reduce((s, e) => s + (e.taxDeductible ? 1 : 0), 0)}
          </p>
          <p className="text-xs text-muted-foreground">Tax Deductible</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            {categorySummary.length}
          </p>
          <p className="text-xs text-muted-foreground">Categories Used</p>
        </div>
      </div>

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categorySummary.map((cs) => (
            <Badge
              key={cs.category}
              variant="outline"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Tag className="h-3 w-3" />
              {cs.category}: £{(cs.total / 100).toFixed(0)} ({cs.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Empty / Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
          <Wallet className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {search || categoryFilter !== "All" || dateFrom || dateTo
              ? "No expenses match your filters"
              : "No expenses yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search || categoryFilter !== "All" || dateFrom || dateTo
              ? "Try adjusting your search or filters"
              : "Add your first expense to start tracking"}
          </p>
          {!search && categoryFilter === "All" && !dateFrom && !dateTo && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3 w-3" />
              Add Expense
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp) => {
                const catColor =
                  CATEGORY_COLORS[exp.category] ?? "text-muted-foreground bg-muted";
                return (
                  <TableRow key={exp.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {exp.description}
                        </p>
                        {exp.receiptNotes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {exp.receiptNotes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                          catColor
                        )}
                      >
                        {exp.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {exp.vendor || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      £{(exp.amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {exp.taxDeductible ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-400 border-emerald-400/30"
                        >
                          Deductible
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(exp)}
                          title="Edit expense"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm(exp.id)}
                          title="Delete expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditing(null);
            setForm(defaultForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Fabric purchase"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Amount (pence)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="2500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Date
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Vendor
                </label>
                <Input
                  value={form.vendor}
                  onChange={(e) =>
                    setForm({ ...form, vendor: e.target.value })
                  }
                  placeholder="Supplier name"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="taxDeductible"
                checked={form.taxDeductible}
                onChange={(e) =>
                  setForm({ ...form, taxDeductible: e.target.checked })
                }
                className="rounded border-input"
              />
              <label
                htmlFor="taxDeductible"
                className="text-xs font-medium text-muted-foreground cursor-pointer"
              >
                Tax Deductible
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Receipt Notes
              </label>
              <Input
                value={form.receiptNotes}
                onChange={(e) =>
                  setForm({ ...form, receiptNotes: e.target.value })
                }
                placeholder="Receipt reference or notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) deleteMutation.mutate(deleteConfirm);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
