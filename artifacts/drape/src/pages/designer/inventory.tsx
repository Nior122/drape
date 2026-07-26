import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Package,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  Edit3,
  MoveHorizontal,
  X,
  Box,
  DollarSign,
  Hash,
  Tag,
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

const CATEGORIES = [
  "All",
  "Fabric",
  "Notions",
  "Trims",
  "Thread",
  "Lining",
  "Interfacing",
  "Packaging",
  "Tools",
  "Other",
] as const;

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitCost: number;
  unit: string;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
};

type StockMovement = {
  id: string;
  itemId: string;
  quantity: number;
  type: "IN" | "OUT";
  note: string;
  createdAt: string;
};

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

const defaultItem: Omit<InventoryItem, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  sku: "",
  category: "Fabric",
  quantity: 0,
  unitCost: 0,
  unit: "m",
  lowStockThreshold: 10,
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [movementDialog, setMovementDialog] = useState<{
    open: boolean;
    item: InventoryItem | null;
  }>({ open: false, item: null });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState(defaultItem);

  const { data, isLoading, error } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: () => fetchApi<InventoryItem[]>("/api/business/inventory"),
  });

  const createMutation = useMutation({
    mutationFn: (item: typeof defaultItem) =>
      fetchApi<InventoryItem>("/api/business/inventory", {
        method: "POST",
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDialogOpen(false);
      setForm(defaultItem);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (item: InventoryItem) =>
      fetchApi<InventoryItem>(`/api/business/inventory/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(defaultItem);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/business/inventory/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDeleteConfirm(null);
    },
  });

  const movementMutation = useMutation({
    mutationFn: (data: { itemId: string; quantity: number; type: "IN" | "OUT"; note: string }) =>
      fetchApi<StockMovement>("/api/business/inventory/stock-movements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setMovementDialog({ open: false, item: null });
    },
  });

  const items = data ?? [];
  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openCreate = () => {
    setEditingItem(null);
    setForm(defaultItem);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unitCost: item.unitCost,
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ ...editingItem, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qty = parseInt(fd.get("quantity") as string, 10);
    const type = fd.get("type") as "IN" | "OUT";
    const note = fd.get("note") as string;
    if (!movementDialog.item || !qty) return;
    movementMutation.mutate({
      itemId: movementDialog.item.id,
      quantity: qty,
      type,
      note,
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
        <p className="text-sm font-medium">Failed to load inventory</p>
        <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your materials and supplies
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
          <p className="text-xs text-muted-foreground">Total Items</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            {items.reduce((s, i) => s + i.quantity, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total Stock</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">
            £
            {(
              items.reduce((s, i) => s + i.unitCost * i.quantity, 0) / 100
            ).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">Stock Value</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-destructive">
            {items.filter((i) => i.quantity <= i.lowStockThreshold).length}
          </p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {search || categoryFilter !== "All"
              ? "No items match your filters"
              : "No inventory items yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search || categoryFilter !== "All"
              ? "Try adjusting your search or filter"
              : "Add your first inventory item to get started"}
          </p>
          {!search && categoryFilter === "All" && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3 w-3" />
              Add Item
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const lowStock = item.quantity <= item.lowStockThreshold;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.unit}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-semibold",
                          lowStock
                            ? "text-destructive"
                            : "text-foreground"
                        )}
                      >
                        <Hash className="h-3 w-3" />
                        {item.quantity}
                        {lowStock && (
                          <span className="text-[10px] text-destructive font-normal">
                            low
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      £{(item.unitCost / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      £{((item.unitCost * item.quantity) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setMovementDialog({ open: true, item })}
                          title="Record stock movement"
                        >
                          <MoveHorizontal className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(item)}
                          title="Edit item"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm(item.id)}
                          title="Delete item"
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
            setEditingItem(null);
            setForm(defaultItem);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Cotton Fabric"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  SKU
                </label>
                <Input
                  value={form.sku}
                  onChange={(e) =>
                    setForm({ ...form, sku: e.target.value })
                  }
                  placeholder="COT-001"
                />
              </div>
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
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Unit
                </label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["m", "yd", "pc", "roll", "box", "kg", "set"].map(
                      (u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Quantity
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Unit Cost (pence)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unitCost: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="1500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Low Stock Threshold
              </label>
              <Input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lowStockThreshold: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog
        open={movementDialog.open}
        onOpenChange={(open) => {
          if (!open) setMovementDialog({ open: false, item: null });
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovement} className="space-y-4 py-4">
            {movementDialog.item && (
              <p className="text-sm text-muted-foreground">
                Item:{" "}
                <span className="font-medium text-foreground">
                  {movementDialog.item.name}
                </span>
                <br />
                Current stock:{" "}
                <span className="font-medium text-foreground">
                  {movementDialog.item.quantity} {movementDialog.item.unit}
                </span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Type
                </label>
                <Select name="type" defaultValue="IN">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Stock In</SelectItem>
                    <SelectItem value="OUT">Stock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Quantity
                </label>
                <Input
                  name="quantity"
                  type="number"
                  min={1}
                  required
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Note
              </label>
              <Input
                name="note"
                placeholder="Restock from supplier"
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={movementMutation.isPending}>
                {movementMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Record
              </Button>
            </DialogFooter>
          </form>
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
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this inventory item? This action
            cannot be undone.
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
