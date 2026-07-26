import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Package,
  ChevronDown,
  Trash2,
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

type Supplier = {
  id: string;
  name: string;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  unitCost: number;
  unit: string;
};

type LineItem = {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplierName?: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Draft", color: "text-muted-foreground", bg: "bg-muted" },
  ORDERED: { label: "Ordered", color: "text-blue-400", bg: "bg-blue-400/10" },
  RECEIVED: { label: "Received", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  CANCELLED: { label: "Cancelled", color: "text-red-400", bg: "bg-red-400/10" },
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formStep, setFormStep] = useState<"supplier" | "items" | "review">("supplier");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");

  const { data: orders, isLoading, error } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders"],
    queryFn: () => fetchApi<PurchaseOrder[]>("/api/business/purchase-orders"),
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => fetchApi<Supplier[]>("/api/business/suppliers"),
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: () => fetchApi<InventoryItem[]>("/api/business/inventory"),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      supplierId: string;
      lineItems: Omit<LineItem, "name" | "total">[];
      notes: string;
    }) =>
      fetchApi<PurchaseOrder>("/api/business/purchase-orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      resetForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) =>
      fetchApi<PurchaseOrder>(`/api/business/purchase-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setFormStep("supplier");
    setSelectedSupplier("");
    setLineItems([]);
    setNotes("");
  };

  const addLineItem = (item: InventoryItem) => {
    setLineItems((prev) => [
      ...prev,
      {
        inventoryItemId: item.id,
        name: item.name,
        quantity: 1,
        unitCost: item.unitCost,
        total: item.unitCost,
      },
    ]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: number | string) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === "quantity") {
        item.quantity = value as number;
      } else if (field === "unitCost") {
        item.unitCost = value as number;
      }
      item.total = item.quantity * item.unitCost;
      updated[index] = item;
      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const tax = Math.round(subtotal * 0.2);
  const total = subtotal + tax;

  const filtered = (orders ?? []).filter(
    (o) => statusFilter === "ALL" || o.status === statusFilter
  );

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
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
        <p className="text-sm font-medium">Failed to load purchase orders</p>
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
          <h1 className="text-xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage orders from suppliers
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "DRAFT", "ORDERED", "RECEIVED", "CANCELLED"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s === "ALL" ? "All" : s.toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Empty / List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {statusFilter !== "ALL"
              ? "No purchase orders with this status"
              : "No purchase orders yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {statusFilter !== "ALL"
              ? "Try a different filter"
              : "Create your first purchase order to start tracking supplies"}
          </p>
          {statusFilter === "ALL" && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3 w-3" />
              New Purchase Order
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((po) => {
                const st = STATUS_STYLES[po.status] ?? STATUS_STYLES.DRAFT;
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      PO-{po.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {po.supplierName ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{po.lineItems?.length ?? 0} items</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      £{(po.totalAmount / 100).toFixed(2)}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Purchase Order Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {formStep === "supplier"
                ? "Select Supplier"
                : formStep === "items"
                  ? "Add Line Items"
                  : "Review & Create"}
            </DialogTitle>
          </DialogHeader>

          {formStep === "supplier" && (
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose the supplier for this purchase order
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Supplier
                </label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  disabled={!selectedSupplier}
                  onClick={() => setFormStep("items")}
                >
                  Next: Add Items
                </Button>
              </DialogFooter>
            </div>
          )}

          {formStep === "items" && (
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Add Inventory Items
                </label>
                <Select
                  onValueChange={(val) => {
                    const item = (inventoryItems ?? []).find(
                      (i) => i.id === val
                    );
                    if (item) addLineItem(item);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(inventoryItems ?? []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.sku}) — £
                        {(item.unitCost / 100).toFixed(2)}/{item.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {lineItems.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {lineItems.map((li, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-background rounded-md px-3 py-2"
                    >
                      <span className="flex-1 text-sm font-medium text-foreground min-w-0 truncate">
                        {li.name}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        value={li.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            i,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-16 h-8 text-xs text-center"
                      />
                      <span className="text-xs text-muted-foreground">×</span>
                      <Input
                        type="number"
                        min={0}
                        value={li.unitCost}
                        onChange={(e) =>
                          updateLineItem(
                            i,
                            "unitCost",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-20 h-8 text-xs text-right"
                      />
                      <span className="text-xs font-mono text-foreground w-16 text-right">
                        £{(li.total / 100).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeLineItem(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items added yet. Select items from the dropdown above.
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setFormStep("supplier")}>
                  Back
                </Button>
                <Button
                  disabled={lineItems.length === 0}
                  onClick={() => setFormStep("review")}
                >
                  Next: Review
                </Button>
              </DialogFooter>
            </div>
          )}

          {formStep === "review" && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplier</span>
                  <span className="font-medium text-foreground">
                    {suppliers?.find((s) => s.id === selectedSupplier)?.name ??
                      "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium text-foreground">
                    {lineItems.length} lines
                  </span>
                </div>
                <div className="border-t border-border pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">£{(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (20%)</span>
                    <span className="font-mono">£{(tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total</span>
                    <span className="font-mono">£{(total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Notes
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for this order..."
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setFormStep("items")}
                >
                  Back
                </Button>
                <Button
                  onClick={() =>
                    createMutation.mutate({
                      supplierId: selectedSupplier,
                      lineItems: lineItems.map((li) => ({
                        inventoryItemId: li.inventoryItemId,
                        quantity: li.quantity,
                        unitCost: li.unitCost,
                      })),
                      notes,
                    })
                  }
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create Purchase Order
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
