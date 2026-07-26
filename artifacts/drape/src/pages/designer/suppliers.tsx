import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Truck,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  Phone,
  Mail,
  MapPin,
  Package,
  Clock,
  ChevronRight,
  Eye,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
  contactName: string;
  email: string;
  phone: string;
  address: string;
  productsSupplied: string[];
  leadTimeDays: number;
  createdAt: string;
  updatedAt: string;
};

type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

const defaultForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  productsSupplied: "",
  leadTimeDays: 7,
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<Supplier | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: suppliers, isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => fetchApi<Supplier[]>("/api/business/suppliers"),
  });

  const { data: supplierOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ["supplier-orders", detailView?.id],
    queryFn: () =>
      fetchApi<PurchaseOrder[]>(
        `/api/business/purchase-orders?supplierId=${detailView!.id}`
      ),
    enabled: !!detailView,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultForm) =>
      fetchApi<Supplier>("/api/business/suppliers", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          productsSupplied: data.productsSupplied
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDialogOpen(false);
      setForm(defaultForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Supplier) =>
      fetchApi<Supplier>(`/api/business/suppliers/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/business/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteConfirm(null);
    },
  });

  const items = suppliers ?? [];
  const filtered = items.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      contactName: s.contactName,
      email: s.email,
      phone: s.phone,
      address: s.address,
      productsSupplied: s.productsSupplied.join(", "),
      leadTimeDays: s.leadTimeDays,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({
        ...editing,
        ...form,
        productsSupplied: form.productsSupplied
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
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
        <p className="text-sm font-medium">Failed to load suppliers</p>
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
          <h1 className="text-xl font-bold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your material suppliers and vendors
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers by name, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty / List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border gap-3">
          <Truck className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {search
              ? "No suppliers match your search"
              : "No suppliers yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search
              ? "Try a different search term"
              : "Add your first supplier to start tracking vendors"}
          </p>
          {!search && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3 w-3" />
              Add Supplier
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-card rounded-xl border border-border p-4 md:p-5 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setDetailView(supplier)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {supplier.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {supplier.contactName}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {supplier.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </span>
                      {supplier.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {supplier.address}
                        </span>
                      )}
                    </div>
                    {supplier.productsSupplied.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {supplier.productsSupplied.slice(0, 4).map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                        {supplier.productsSupplied.length > 4 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{supplier.productsSupplied.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 text-[10px]"
                  >
                    <Clock className="h-3 w-3" />
                    {supplier.leadTimeDays} day lead
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(supplier);
                      }}
                      title="Edit supplier"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(supplier.id);
                      }}
                      title="Delete supplier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Company Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Fabric Co. Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Contact Name
                </label>
                <Input
                  value={form.contactName}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="john@fabricco.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="+44 20 1234 5678"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Address
              </label>
              <Textarea
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="123 Textile Street, London..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Products Supplied (comma-separated)
                </label>
                <Input
                  value={form.productsSupplied}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      productsSupplied: e.target.value,
                    })
                  }
                  placeholder="Cotton, Silk, Lining"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Lead Time (days)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.leadTimeDays}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      leadTimeDays: parseInt(e.target.value) || 7,
                    })
                  }
                />
              </div>
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

      {/* Detail View Dialog */}
      <Dialog
        open={!!detailView}
        onOpenChange={(open) => {
          if (!open) setDetailView(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailView?.name}</DialogTitle>
          </DialogHeader>
          {detailView && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {detailView.contactName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {detailView.leadTimeDays} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground mt-0.5">
                    {detailView.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm text-foreground mt-0.5">
                    {detailView.phone}
                  </p>
                </div>
              </div>
              {detailView.address && (
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm text-foreground mt-0.5">
                    {detailView.address}
                  </p>
                </div>
              )}
              {detailView.productsSupplied.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Products Supplied
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailView.productsSupplied.map((p) => (
                      <Badge key={p} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Purchase Order History
                </p>
                {!supplierOrders || supplierOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No purchase orders yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {supplierOrders.map((po) => (
                      <div
                        key={po.id}
                        className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            PO-{po.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(po.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            £{(po.totalAmount / 100).toFixed(2)}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-0.5"
                          >
                            {po.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setDetailView(null);
                if (detailView) openEdit(detailView);
              }}
            >
              <Edit3 className="h-4 w-4" />
              Edit
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
            <DialogTitle>Delete Supplier</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this supplier? This action cannot
            be undone.
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
