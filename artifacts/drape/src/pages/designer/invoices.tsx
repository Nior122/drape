import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  FileText,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  X,
  DollarSign,
  Percent,
  Calculator,
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

type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  dueDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Draft", color: "text-muted-foreground", bg: "bg-muted" },
  SENT: { label: "Sent", color: "text-blue-400", bg: "bg-blue-400/10" },
  PAID: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  OVERDUE: { label: "Overdue", color: "text-red-400", bg: "bg-red-400/10" },
  CANCELLED: { label: "Cancelled", color: "text-white/40", bg: "bg-white/5" },
};

const defaultLineItem = (): InvoiceLineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
});

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  // Invoice form
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(20);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    defaultLineItem(),
  ]);

  const { data: invoices, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: () => fetchApi<Invoice[]>("/api/business/invoices"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "invoiceNumber">) =>
      fetchApi<Invoice>("/api/business/invoices", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      resetForm();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: { invoiceId: string; amount: number; method: string }) =>
      fetchApi("/api/business/payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setPaymentDialog(null);
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setClientName("");
    setClientEmail("");
    setDueDate("");
    setTaxRate(20);
    setDiscount(0);
    setNotes("");
    setLineItems([defaultLineItem()]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: number | string) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value as never };
      updated[index].total =
        updated[index].quantity * updated[index].unitPrice;
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, defaultLineItem()]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcSubtotal = () => lineItems.reduce((s, i) => s + i.total, 0);
  const calcTax = () => Math.round(calcSubtotal() * (taxRate / 100));
  const calcTotal = () => calcSubtotal() + calcTax() - discount;

  const filtered = (invoices ?? []).filter((inv) => {
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    const matchesSearch =
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreate = () => {
    createMutation.mutate({
      clientName,
      clientEmail,
      status: "DRAFT",
      lineItems,
      subtotal: calcSubtotal(),
      taxRate,
      taxAmount: calcTax(),
      discount,
      totalAmount: calcTotal(),
      dueDate,
      notes,
    });
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
        <p className="text-sm font-medium">Failed to load invoices</p>
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
          <h1 className="text-xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage client invoices
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client or invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"].map(
            (s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s === "ALL" ? "All" : s.toLowerCase()}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            {(invoices ?? []).length}
          </p>
          <p className="text-xs text-muted-foreground">Total Invoices</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-emerald-400">
            £
            {(
              (invoices ?? [])
                .filter((i) => i.status === "PAID")
                .reduce((s, i) => s + i.totalAmount, 0) / 100
            ).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">Paid</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            £
            {(
              (invoices ?? [])
                .filter((i) => i.status === "SENT")
                .reduce((s, i) => s + i.totalAmount, 0) / 100
            ).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">Outstanding</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-destructive">
            {
              (invoices ?? []).filter((i) => i.status === "OVERDUE")
                .length
            }
          </p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Empty / Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {search || statusFilter !== "ALL"
              ? "No invoices match your filters"
              : "No invoices yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter !== "ALL"
              ? "Try adjusting your search or filter"
              : "Create your first invoice to bill clients"}
          </p>
          {!search && statusFilter === "ALL" && (
            <Button variant="outline" size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3 w-3" />
              New Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const st = STATUS_STYLES[inv.status] ?? STATUS_STYLES.DRAFT;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {inv.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.clientEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={cn(
                          new Date(inv.dueDate) < new Date() &&
                            inv.status !== "PAID" &&
                            inv.status !== "CANCELLED"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      £{(inv.totalAmount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide",
                          st.color,
                          st.bg
                        )}
                      >
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "SENT" || inv.status === "OVERDUE" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setPaymentDialog(inv);
                            setPaymentAmount(inv.totalAmount);
                            setPaymentMethod("bank_transfer");
                          }}
                        >
                          <DollarSign className="h-3 w-3" />
                          Record Payment
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Client Name
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Client Email
                </label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Line Items
                </label>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(i, "description", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          i,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-16 text-xs text-center"
                      placeholder="Qty"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(
                          i,
                          "unitPrice",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-24 text-xs text-right"
                      placeholder="Price"
                    />
                    <span className="text-xs font-mono text-foreground w-16 text-right">
                      £{(item.total / 100).toFixed(2)}
                    </span>
                    {lineItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeLineItem(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  £{(calcSubtotal() / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({taxRate}%)
                </span>
                <span className="font-mono">
                  £{(calcTax() / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount (pence)</span>
                <Input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) =>
                    setDiscount(parseInt(e.target.value) || 0)
                  }
                  className="w-24 h-7 text-xs text-right"
                />
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between text-sm font-bold text-foreground">
                <span>Total</span>
                <span className="font-mono">
                  £{(calcTotal() / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, special notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !clientName}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={!!paymentDialog}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {paymentDialog && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Invoice:{" "}
                <span className="font-medium text-foreground">
                  {paymentDialog.invoiceNumber}
                </span>
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Amount (pence)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Payment Method
                </label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() =>
                    paymentMutation.mutate({
                      invoiceId: paymentDialog.id,
                      amount: paymentAmount,
                      method: paymentMethod,
                    })
                  }
                  disabled={paymentMutation.isPending}
                >
                  {paymentMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Record Payment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
