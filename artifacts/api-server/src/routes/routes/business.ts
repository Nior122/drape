import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eq, and, desc, asc, sql, inArray, count, gte, lte, sum, between } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  // Inventory
  inventoryItemsTable, inventoryMovementsTable,
  // Suppliers
  suppliersTable,
  // Purchase Orders
  purchaseOrdersTable,
  // Invoices
  invoicesTable,
  // Payments
  paymentTransactionsTable,
  // Expenses
  expensesTable,
  // Subscriptions
  subscriptionPlansTable, userSubscriptionsTable,
  // Settings
  businessSettingsTable,
  // Audit
  auditLogsTable,
  // Existing
  usersTable, ordersTable, projectsTable, producerProfilesTable,
} from "@workspace/db";

const router: IRouter = Router();
router.use(requireAuth);

/* ── Helpers ────────────────────────────────────────────────────────────── */

async function audit(userId: string, action: string, entity: string, entityId?: string, details?: Record<string, unknown>) {
  try {
    await db.insert(auditLogsTable).values({ userId, action, entity, entityId, details: details ?? {} });
  } catch { /* fire-and-forget */ }
}

function generatePONumber(userId: string): string {
  const shortId = userId.slice(-4).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `PO-${shortId}-${ts}`;
}

async function nextInvoiceNumber(userId: string): Promise<string> {
  const [settings] = await db.select().from(businessSettingsTable).where(eq(businessSettingsTable.userId, userId));
  const prefix = settings?.invoicePrefix ?? "INV-";
  const next = parseInt(settings?.invoiceNextNumber ?? "1", 10);
  const num = prefix + String(next).padStart(5, "0");
  await db.update(businessSettingsTable)
    .set({ invoiceNextNumber: String(next + 1) })
    .where(eq(businessSettingsTable.userId, userId));
  return num;
}

/* ════════════════════════════════════════════════════════════════════
   MODULE 1 — INVENTORY
   ════════════════════════════════════════════════════════════════════ */

// List inventory
router.get("/business/inventory", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { category, search, lowStock, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(inventoryItemsTable.userId, userId)];
  if (category) conditions.push(eq(inventoryItemsTable.category, category as any));
  if (search) conditions.push(sql`(${inventoryItemsTable.name} ILIKE ${`%${search}%`} OR ${inventoryItemsTable.sku} ILIKE ${`%${search}%`})`);
  if (lowStock === "true") conditions.push(sql`${inventoryItemsTable.quantity} <= ${inventoryItemsTable.lowStockThreshold}`);
  const items = await db.select().from(inventoryItemsTable).where(and(...conditions))
    .orderBy(desc(inventoryItemsTable.updatedAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(inventoryItemsTable).where(and(...conditions));
  res.json({ items, total: total.c, page: Number(page), limit: Number(limit) });
});

// Create inventory item
router.post("/business/inventory", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [item] = await db.insert(inventoryItemsTable).values({ ...req.body, userId }).returning();
  await audit(userId, "CREATE", "inventory_item", item.id, { name: item.name });
  res.status(201).json(item);
});

// Get single item
router.get("/business/inventory/:id", async (req: Request, res: Response): Promise<void> => {
  const [item] = await db.select().from(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.id, req.params.id), eq(inventoryItemsTable.userId, req.userId!)));
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  const movements = await db.select().from(inventoryMovementsTable)
    .where(eq(inventoryMovementsTable.itemId, item.id)).orderBy(desc(inventoryMovementsTable.createdAt)).limit(50);
  res.json({ item, movements });
});

// Update item
router.patch("/business/inventory/:id", async (req: Request, res: Response): Promise<void> => {
  const [item] = await db.update(inventoryItemsTable).set(req.body)
    .where(and(eq(inventoryItemsTable.id, req.params.id), eq(inventoryItemsTable.userId, req.userId!))).returning();
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  await audit(req.userId!, "UPDATE", "inventory_item", item.id);
  res.json(item);
});

// Delete item
router.delete("/business/inventory/:id", async (req: Request, res: Response): Promise<void> => {
  const [item] = await db.delete(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.id, req.params.id), eq(inventoryItemsTable.userId, req.userId!))).returning();
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  await audit(req.userId!, "DELETE", "inventory_item", item.id);
  res.sendStatus(204);
});

// Record inventory movement
router.post("/business/inventory/:id/movement", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [item] = await db.select().from(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.id, req.params.id), eq(inventoryItemsTable.userId, userId)));
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  const { type, quantity, notes, reference } = req.body as { type: string; quantity: number; notes?: string; reference?: string };
  if (!type || !quantity) { res.status(400).json({ error: "type and quantity required" }); return; }
  const balanceBefore = item.quantity;
  let balanceAfter = balanceBefore;
  if (type === "PURCHASE" || type === "RETURN") balanceAfter += quantity;
  else if (type === "SALE" || type === "WASTE" || type === "EXPIRED" || type === "ADJUSTMENT") balanceAfter -= quantity;
  else if (type === "TRANSFER") balanceAfter = quantity; // set to exact
  await db.insert(inventoryMovementsTable).values({ userId, itemId: item.id, type: type as any, quantity, balanceBefore, balanceAfter, notes, reference }).returning();
  await db.update(inventoryItemsTable).set({ quantity: Math.max(0, balanceAfter) }).where(eq(inventoryItemsTable.id, item.id));
  await audit(userId, "MOVEMENT", "inventory_item", item.id, { type, quantity, balanceAfter });
  res.status(201).json({ balanceAfter: Math.max(0, balanceAfter) });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 2 — SUPPLIERS
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/suppliers", async (req: Request, res: Response): Promise<void> => {
  const { search, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(suppliersTable.userId, req.userId!)];
  if (search) conditions.push(sql`${suppliersTable.name} ILIKE ${`%${search}%`}`);
  const suppliers = await db.select().from(suppliersTable).where(and(...conditions))
    .orderBy(desc(suppliersTable.updatedAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(suppliersTable).where(and(...conditions));
  res.json({ suppliers, total: total.c });
});

router.post("/business/suppliers", async (req: Request, res: Response): Promise<void> => {
  const [supplier] = await db.insert(suppliersTable).values({ ...req.body, userId: req.userId! }).returning();
  await audit(req.userId!, "CREATE", "supplier", supplier.id, { name: supplier.name });
  res.status(201).json(supplier);
});

router.get("/business/suppliers/:id", async (req: Request, res: Response): Promise<void> => {
  const [supplier] = await db.select().from(suppliersTable)
    .where(and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.userId, req.userId!)));
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
  const pos = await db.select().from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.supplierId, supplier.id), eq(purchaseOrdersTable.userId, req.userId!)))
    .orderBy(desc(purchaseOrdersTable.createdAt)).limit(20);
  res.json({ supplier, purchaseOrders: pos });
});

router.patch("/business/suppliers/:id", async (req: Request, res: Response): Promise<void> => {
  const [s] = await db.update(suppliersTable).set(req.body)
    .where(and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.userId, req.userId!))).returning();
  if (!s) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(s);
});

router.delete("/business/suppliers/:id", async (req: Request, res: Response): Promise<void> => {
  const [s] = await db.delete(suppliersTable)
    .where(and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.userId, req.userId!))).returning();
  if (!s) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.sendStatus(204);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 3 — PURCHASE ORDERS
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/purchase-orders", async (req: Request, res: Response): Promise<void> => {
  const { status, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(purchaseOrdersTable.userId, req.userId!)];
  if (status) conditions.push(eq(purchaseOrdersTable.status, status as any));
  const pos = await db.select().from(purchaseOrdersTable).where(and(...conditions))
    .orderBy(desc(purchaseOrdersTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(purchaseOrdersTable).where(and(...conditions));
  res.json({ purchaseOrders: pos, total: total.c });
});

router.post("/business/purchase-orders", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = req.body as any;
  const poNumber = generatePONumber(userId);
  const [po] = await db.insert(purchaseOrdersTable).values({
    ...data, userId, poNumber,
    status: "DRAFT",
    subtotal: data.subtotal ?? 0,
    total: data.total ?? 0,
  }).returning();
  await audit(userId, "CREATE", "purchase_order", po.id, { poNumber: po.poNumber });
  res.status(201).json(po);
});

router.get("/business/purchase-orders/:id", async (req: Request, res: Response): Promise<void> => {
  const [po] = await db.select().from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, req.params.id), eq(purchaseOrdersTable.userId, req.userId!)));
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(po);
});

router.patch("/business/purchase-orders/:id", async (req: Request, res: Response): Promise<void> => {
  const { status, items, subtotal, total, receivedDate } = req.body as any;
  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (items) update.items = items;
  if (subtotal !== undefined) update.subtotal = subtotal;
  if (total !== undefined) update.total = total;
  if (receivedDate) update.receivedDate = receivedDate;

  const [po] = await db.update(purchaseOrdersTable).set(update)
    .where(and(eq(purchaseOrdersTable.id, req.params.id), eq(purchaseOrdersTable.userId, req.userId!))).returning();
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

  // If received, update inventory quantities
  if (status === "RECEIVED" || status === "PARTIAL") {
    const poData = po as any;
    if (poData.items) {
      for (const item of poData.items) {
        if (item.itemId) {
          const qtyToAdd = status === "RECEIVED" ? item.quantity : item.received;
          if (qtyToAdd > 0) {
            const [inv] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, item.itemId));
            if (inv) {
              const newQty = (inv.quantity ?? 0) + qtyToAdd;
              await db.update(inventoryItemsTable).set({ quantity: newQty }).where(eq(inventoryItemsTable.id, item.itemId));
              await db.insert(inventoryMovementsTable).values({
                userId: req.userId!, itemId: item.itemId, type: "PURCHASE", quantity: qtyToAdd,
                balanceBefore: inv.quantity ?? 0, balanceAfter: newQty,
                reference: po.poNumber, notes: `PO ${po.poNumber} received`,
              });
            }
          }
        }
      }
    }
  }

  await audit(req.userId!, "UPDATE", "purchase_order", po.id, { status });
  res.json(po);
});

router.delete("/business/purchase-orders/:id", async (req: Request, res: Response): Promise<void> => {
  const [po] = await db.delete(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, req.params.id), eq(purchaseOrdersTable.userId, req.userId!))).returning();
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.sendStatus(204);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 4 — INVOICES
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/invoices", async (req: Request, res: Response): Promise<void> => {
  const { status, clientId, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(invoicesTable.userId, req.userId!)];
  if (status) conditions.push(eq(invoicesTable.status, status as any));
  if (clientId) conditions.push(eq(invoicesTable.clientId, clientId));
  const invoices = await db.select().from(invoicesTable).where(and(...conditions))
    .orderBy(desc(invoicesTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(invoicesTable).where(and(...conditions));
  res.json({ invoices, total: total.c });
});

router.post("/business/invoices", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = req.body as any;
  const invoiceNumber = await nextInvoiceNumber(userId);
  const subtotal = data.subtotal ?? 0;
  const discount = data.discount ?? 0;
  const taxRate = parseFloat(data.taxRate ?? "0");
  const taxAmount = data.taxAmount ?? Math.round(subtotal * taxRate / 100);
  const total = subtotal - discount + taxAmount;
  const [inv] = await db.insert(invoicesTable).values({
    ...data, userId, invoiceNumber,
    subtotal, taxAmount, discount, total,
    balanceDue: total,
    issueDate: new Date(),
  }).returning();
  await audit(userId, "CREATE", "invoice", inv.id, { invoiceNumber: inv.invoiceNumber });
  res.status(201).json(inv);
});

router.get("/business/invoices/:id", async (req: Request, res: Response): Promise<void> => {
  const [inv] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.userId, req.userId!)));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  const payments = await db.select().from(paymentTransactionsTable)
    .where(eq(paymentTransactionsTable.invoiceId, inv.id)).orderBy(desc(paymentTransactionsTable.createdAt));
  res.json({ invoice: inv, payments });
});

router.patch("/business/invoices/:id", async (req: Request, res: Response): Promise<void> => {
  const [inv] = await db.update(invoicesTable).set(req.body)
    .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.userId, req.userId!))).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  await audit(req.userId!, "UPDATE", "invoice", inv.id);
  res.json(inv);
});

router.delete("/business/invoices/:id", async (req: Request, res: Response): Promise<void> => {
  const [inv] = await db.delete(invoicesTable)
    .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.userId, req.userId!))).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.sendStatus(204);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 5 — PAYMENTS
   ════════════════════════════════════════════════════════════════════ */

// Record a payment (manual / gateway webhook)
router.post("/business/payments", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = req.body as any;
  const amount = data.amount ?? 0;
  const fee = data.fee ?? 0;
  const [payment] = await db.insert(paymentTransactionsTable).values({
    ...data, userId, net: amount - fee,
  }).returning();

  // Update invoice if linked
  if (data.invoiceId && data.status === "SUCCESSFUL") {
    const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, data.invoiceId));
    if (inv) {
      const amountPaid = (inv.amountPaid ?? 0) + amount;
      const balanceDue = Math.max(0, inv.total - amountPaid);
      const newStatus = balanceDue <= 0 ? "PAID" : "PARTIAL";
      await db.update(invoicesTable).set({
        amountPaid, balanceDue,
        status: newStatus as any,
        paidAt: balanceDue <= 0 ? new Date() : undefined,
      }).where(eq(invoicesTable.id, data.invoiceId));
    }
  }

  await audit(userId, "CREATE", "payment", payment.id, { amount, method: data.method });
  res.status(201).json(payment);
});

// Get payment history
router.get("/business/payments", async (req: Request, res: Response): Promise<void> => {
  const { invoiceId, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(paymentTransactionsTable.userId, req.userId!)];
  if (invoiceId) conditions.push(eq(paymentTransactionsTable.invoiceId, invoiceId));
  const payments = await db.select().from(paymentTransactionsTable).where(and(...conditions))
    .orderBy(desc(paymentTransactionsTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(paymentTransactionsTable).where(and(...conditions));
  res.json({ payments, total: total.c });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 6 — EXPENSES
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/expenses", async (req: Request, res: Response): Promise<void> => {
  const { category, startDate, endDate, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(expensesTable.userId, req.userId!)];
  if (category) conditions.push(eq(expensesTable.category, category as any));
  if (startDate) conditions.push(gte(expensesTable.expenseDate, new Date(startDate)));
  if (endDate) conditions.push(lte(expensesTable.expenseDate, new Date(endDate)));
  const expenses = await db.select().from(expensesTable).where(and(...conditions))
    .orderBy(desc(expensesTable.expenseDate)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(expensesTable).where(and(...conditions));
  const [agg] = await db.select({ totalAmount: sum(expensesTable.amount) }).from(expensesTable).where(and(...conditions));
  res.json({ expenses, total: total.c, totalAmount: agg.totalAmount ?? 0 });
});

router.post("/business/expenses", async (req: Request, res: Response): Promise<void> => {
  const [expense] = await db.insert(expensesTable).values({ ...req.body, userId: req.userId! }).returning();
  await audit(req.userId!, "CREATE", "expense", expense.id, { amount: expense.amount, category: expense.category });
  res.status(201).json(expense);
});

router.patch("/business/expenses/:id", async (req: Request, res: Response): Promise<void> => {
  const [e] = await db.update(expensesTable).set(req.body)
    .where(and(eq(expensesTable.id, req.params.id), eq(expensesTable.userId, req.userId!))).returning();
  if (!e) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json(e);
});

router.delete("/business/expenses/:id", async (req: Request, res: Response): Promise<void> => {
  const [e] = await db.delete(expensesTable)
    .where(and(eq(expensesTable.id, req.params.id), eq(expensesTable.userId, req.userId!))).returning();
  if (!e) { res.status(404).json({ error: "Expense not found" }); return; }
  res.sendStatus(204);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 7 — PROFIT CALCULATOR
   ════════════════════════════════════════════════════════════════════ */

router.post("/business/profit-calculator", async (req: Request, res: Response): Promise<void> => {
  const { materialCost, labour, overhead, desiredMargin, taxRate } = req.body as {
    materialCost?: number; labour?: number; overhead?: number;
    desiredMargin?: number; taxRate?: number;
  };
  const mc = materialCost ?? 0;
  const lb = labour ?? 0;
  const oh = overhead ?? 0;
  const totalCost = mc + lb + oh;
  const margin = (desiredMargin ?? 40) / 100;
  const tax = (taxRate ?? 7.5) / 100;
  const suggestedRetail = Math.round(totalCost / (1 - margin));
  const suggestedRetailWithTax = Math.round(suggestedRetail * (1 + tax));
  const wholesalePrice = Math.round(suggestedRetail * 0.7);
  const profit = suggestedRetail - totalCost;
  const profitMargin = Math.round((profit / suggestedRetail) * 100);
  res.json({
    materialCost: mc, labour: lb, overhead: oh,
    totalCost, suggestedRetail, suggestedRetailWithTax,
    wholesalePrice, profit, profitMargin,
  });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 8 — ANALYTICS
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/analytics", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  // Revenue from invoices
  const [revenueAgg] = await db.select({
    total: sum(invoicesTable.total),
    paid: sum(invoicesTable.amountPaid),
  }).from(invoicesTable).where(and(
    eq(invoicesTable.userId, userId),
    gte(invoicesTable.createdAt, start),
    lte(invoicesTable.createdAt, end),
  ));

  // Orders
  const [orderStats] = await db.select({
    total: count(),
    active: sql`count(*) filter (where status != 'CANCELLED' and status != 'COMPLETED')`,
  }).from(ordersTable).where(and(eq(ordersTable.producerId, userId), gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end)));

  // Expenses
  const [expenseAgg] = await db.select({ total: sum(expensesTable.amount) })
    .from(expensesTable).where(and(eq(expensesTable.userId, userId), gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end)));

  // Top clients
  const topClients = await db.select({
    id: ordersTable.clientId,
    name: usersTable.name,
    count: count(),
    revenue: sum(ordersTable.agreedPrice ?? 0),
  }).from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.clientId, usersTable.id))
    .where(and(eq(ordersTable.producerId, userId), gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end)))
    .groupBy(ordersTable.clientId, usersTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Inventory value
  const [invAgg] = await db.select({
    items: count(),
    totalValue: sql<number>`sum(${inventoryItemsTable.quantity} * COALESCE(${inventoryItemsTable.unitCost}, 0))`,
  }).from(inventoryItemsTable).where(eq(inventoryItemsTable.userId, userId));

  // Projects
  const [projectStats] = await db.select({
    total: count(),
    completed: sql`count(*) filter (where status = 'COMPLETED')`,
  }).from(projectsTable).where(and(eq(projectsTable.designerId, userId), gte(projectsTable.createdAt, start), lte(projectsTable.createdAt, end)));

  // Expenses by category
  const expensesByCategory = await db.select({
    category: expensesTable.category,
    total: sum(expensesTable.amount),
    count: count(),
  }).from(expensesTable).where(and(eq(expensesTable.userId, userId), gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end)))
    .groupBy(expensesTable.category).orderBy(desc(sql`sum(amount)`));

  // AI usage (count of AI conversations)
  const aiConversations = await db.select({ count: count() }).from(import("@workspace/db").then(m => m.aiConversationsTable).catch(() => null));
  const aiCount = aiConversations ?? [{ count: 0 }];

  const revenue = Number(revenueAgg?.total ?? 0);
  const paid = Number(revenueAgg?.paid ?? 0);
  const expenses = Number(expenseAgg?.total ?? 0);
  const profit = revenue - expenses;

  res.json({
    revenue: { total: revenue, paid, outstanding: revenue - paid },
    orders: { total: Number(orderStats?.total ?? 0), active: Number((orderStats as any)?.active ?? 0) },
    expenses: { total: expenses, byCategory: expensesByCategory },
    profit,
    topClients,
    inventory: { items: Number(invAgg?.items ?? 0), totalValue: Number(invAgg?.totalValue ?? 0) },
    projects: { total: Number(projectStats?.total ?? 0), completed: Number((projectStats as any)?.completed ?? 0) },
    period: { start, end },
  });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 9 — SUBSCRIPTION SYSTEM
   ════════════════════════════════════════════════════════════════════ */

// Get all plans
router.get("/business/subscription-plans", async (_req: Request, res: Response): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable).orderBy(subscriptionPlansTable.priceMonthly);
  res.json(plans);
});

// Get current user subscription
router.get("/business/subscription", async (req: Request, res: Response): Promise<void> => {
  let [sub] = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, req.userId!));
  // Auto-provision free subscription
  if (!sub) {
    [sub] = await db.insert(userSubscriptionsTable).values({
      userId: req.userId!,
      planKey: "free",
      status: "active",
    }).returning();
  }
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.key, sub.planKey as any));
  res.json({ subscription: sub, plan });
});

// Change plan (prepares for Stripe/Paystack integration)
router.patch("/business/subscription", async (req: Request, res: Response): Promise<void> => {
  const { planKey, billingInterval } = req.body as { planKey?: string; billingInterval?: string };
  const update: Record<string, unknown> = {};
  if (planKey) update.planKey = planKey;
  if (billingInterval) update.billingInterval = billingInterval;

  const [sub] = await db.update(userSubscriptionsTable).set(update)
    .where(eq(userSubscriptionsTable.userId, req.userId!)).returning();
  // If not exists, provision
  if (!sub) {
    const [s] = await db.insert(userSubscriptionsTable).values({
      userId: req.userId!, planKey: planKey as any ?? "free",
    }).returning();
    res.json(s); return;
  }
  await audit(req.userId!, "UPDATE", "subscription", sub.id, update);
  res.json(sub);
});

// Check feature access
router.post("/business/subscription/check", async (req: Request, res: Response): Promise<void> => {
  const { feature } = req.body as { feature: string };
  const [sub] = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, req.userId!));
  if (!sub) { res.json({ allowed: false }); return; }
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.key, sub.planKey as any));
  if (!plan) { res.json({ allowed: false }); return; }
  const featureMap: Record<string, boolean> = {
    ai_studio: plan.hasAiStudio,
    vision_ai: plan.hasVisionAi,
    analytics: plan.hasAnalytics,
    inventory: plan.hasInventory,
    invoicing: plan.hasInvoicing,
    reports: plan.hasReports,
    team: plan.hasTeam,
    api_access: plan.hasApiAccess,
    custom_branding: plan.hasCustomBranding,
    priority_support: plan.hasPrioritySupport,
  };
  const allowed = featureMap[feature] ?? false;
  res.json({ allowed, planKey: plan.key, feature });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 11 — SETTINGS
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/settings", async (req: Request, res: Response): Promise<void> => {
  let [settings] = await db.select().from(businessSettingsTable).where(eq(businessSettingsTable.userId, req.userId!));
  if (!settings) {
    [settings] = await db.insert(businessSettingsTable).values({ userId: req.userId! }).returning();
  }
  res.json(settings);
});

router.patch("/business/settings", async (req: Request, res: Response): Promise<void> => {
  const [settings] = await db.update(businessSettingsTable).set(req.body)
    .where(eq(businessSettingsTable.userId, req.userId!)).returning();
  if (!settings) {
    const [s] = await db.insert(businessSettingsTable).values({ ...req.body, userId: req.userId! }).returning();
    res.json(s); return;
  }
  await audit(req.userId!, "UPDATE", "business_settings", settings.id);
  res.json(settings);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 12 — REPORTS (data export endpoints)
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/reports/revenue", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const end = endDate ? new Date(endDate) : new Date();

  const invoices = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.userId, userId), gte(invoicesTable.issueDate, start), lte(invoicesTable.issueDate, end)))
    .orderBy(asc(invoicesTable.issueDate));

  const expenseList = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), gte(expensesTable.expenseDate, start), lte(expensesTable.expenseDate, end)))
    .orderBy(asc(expensesTable.expenseDate));

  res.json({
    period: { start, end },
    invoices,
    expenses: expenseList,
    totalRevenue: invoices.reduce((s, i) => s + (i.status === "PAID" ? i.total : 0), 0),
    totalExpenses: expenseList.reduce((s, e) => s + e.amount, 0),
    outstandingInvoices: invoices.filter(i => i.status !== "PAID" && i.status !== "CANCELLED").length,
  });
});

router.get("/business/reports/inventory", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const items = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.userId, userId))
    .orderBy(asc(inventoryItemsTable.name));
  const lowStock = items.filter(i => i.quantity <= i.lowStockThreshold);
  const totalValue = items.reduce((s, i) => s + (i.quantity ?? 0) * (i.unitCost ?? 0), 0);
  res.json({ items, lowStockCount: lowStock.length, totalValue, totalItems: items.length });
});

router.get("/business/reports/expenses", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const end = endDate ? new Date(endDate) : new Date();
  const items = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), gte(expensesTable.expenseDate, start), lte(expensesTable.expenseDate, end)))
    .orderBy(desc(expensesTable.expenseDate));
  const byCategory = await db.select({ category: expensesTable.category, total: sum(expensesTable.amount), count: count() })
    .from(expensesTable).where(and(eq(expensesTable.userId, userId), gte(expensesTable.expenseDate, start), lte(expensesTable.expenseDate, end)))
    .groupBy(expensesTable.category).orderBy(desc(sql`sum(amount)`));
  res.json({ expenses: items, byCategory, total: items.reduce((s, e) => s + e.amount, 0) });
});

router.get("/business/reports/production", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const end = endDate ? new Date(endDate) : new Date();
  const projects = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.designerId, userId), gte(projectsTable.createdAt, start), lte(projectsTable.createdAt, end)))
    .orderBy(desc(projectsTable.createdAt));
  res.json({ projects, total: projects.length, completed: projects.filter(p => p.status === "COMPLETED").length });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 13 — AUDIT LOGS
   ════════════════════════════════════════════════════════════════════ */

router.get("/business/audit-logs", async (req: Request, res: Response): Promise<void> => {
  const { action, entity, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions = [eq(auditLogsTable.userId, req.userId!)];
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (entity) conditions.push(eq(auditLogsTable.entity, entity));
  const logs = await db.select().from(auditLogsTable).where(and(...conditions))
    .orderBy(desc(auditLogsTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(auditLogsTable).where(and(...conditions));
  res.json({ logs, total: total.c });
});

export default router;
