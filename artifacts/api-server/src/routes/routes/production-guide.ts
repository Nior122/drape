import { Router, type IRouter, type Request, type Response } from "express";
import PDFDocument from "pdfkit";
import { db } from "@workspace/db";
import {
  ordersTable,
  usersTable,
  producerProfilesTable,
  briefsTable,
  measurementsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { completeJSON } from "../../lib/ai/provider-factory";
import { notifyProductionGuideReady } from "../../lib/whatsapp";
import { createNotification } from "../../lib/create-notification";

const router: IRouter = Router();
router.use("/ai/production-guide", requireAuth);

type ProductionGuideContent = {
  garmentType: string;
  orderSummary: string;
  fabricNotes: string;
  cuttingGuide: string[];
  sewingSequence: string[];
  finishingSteps: string[];
  fittingChecklist: string[];
  qualityChecklist: string[];
  technicalNotes: string;
  estimatedHours: number;
};

router.post("/ai/production-guide", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { orderId } = req.body as { orderId: string };

  if (!orderId) {
    res.status(400).json({ error: "orderId is required" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.producerId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [brief] = order.briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, order.briefId))
    : order.sessionId
      ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, order.sessionId))
      : [null];

  const [measurements] = await db
    .select()
    .from(measurementsTable)
    .where(eq(measurementsTable.userId, order.clientId));

  const measurementText = measurements
    ? Object.entries(measurements.data)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}${measurements.unit}`)
        .join(", ")
    : "No measurements on file";

  const prompt = `You are a master tailor and fashion production specialist. Generate a comprehensive production guide JSON for the following bespoke order.

ORDER DETAILS:
Title: ${order.title}
Description: ${order.description ?? "Not provided"}
Occasion: ${brief?.occasion ?? "Not specified"}
Aesthetic: ${brief?.aestheticDirection ?? "Not specified"}
Silhouette: ${brief?.silhouette ?? "Not specified"}
Fabrics: ${brief?.fabricPreferences ?? "Not specified"}
Colors: ${brief?.colorPalette?.join(", ") ?? "Not specified"}
Special Notes: ${brief?.specialNotes ?? order.notes ?? "None"}

CLIENT MEASUREMENTS (${measurements?.unit ?? "cm"}): ${measurementText}

Return ONLY a valid JSON object with exactly these fields:
{
  "garmentType": "specific garment type e.g. 'fitted evening gown' or 'tailored blazer'",
  "orderSummary": "2-3 sentence summary of the garment and construction approach for the tailor",
  "fabricNotes": "detailed fabric selection, pre-shrinking, grain considerations, and handling notes",
  "cuttingGuide": ["8 specific cutting and pattern preparation steps"],
  "sewingSequence": ["10-12 ordered construction steps from first seam to assembly"],
  "finishingSteps": ["6 finishing and detailing steps for hems, linings, closures, pressing"],
  "fittingChecklist": ["8 specific fitting points to verify at each try-on"],
  "qualityChecklist": ["8 final quality control checks before delivery"],
  "technicalNotes": "any special technical notes e.g. ease allowances, interfacing locations, special techniques",
  "estimatedHours": 0
}

Be specific, technical, and actionable. Use professional tailoring terminology.`;

  const content = await completeJSON<ProductionGuideContent>([
    { role: "system", content: "You are a master tailor and fashion production specialist. Return only valid JSON." },
    { role: "user", content: prompt },
  ]);

  if (!content) {
    res.status(500).json({ error: "Failed to generate production guide" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ productionGuideContent: content, productionGuideAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning({ id: ordersTable.id, productionGuideAt: ordersTable.productionGuideAt });

  void notifyProductionGuideReady(userId, {
    id: order.id,
    title: order.title,
    status: order.status,
    producerId: userId,
  });

  void createNotification({
    userId: order.clientId,
    type: "PRODUCTION_GUIDE_READY",
    title: "Production guide is ready",
    body: `A detailed production guide has been created for "${order.title}"`,
    link: `/client/orders/${order.id}`,
    relatedId: order.id,
  });

  res.json({
    success: true,
    content,
    productionGuideAt: updated.productionGuideAt,
    downloadUrl: `/api/ai/production-guide/${orderId}`,
  });
});

router.get("/ai/production-guide/:orderId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { orderId } = req.params as Record<string, string>;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.producerId !== userId && order.clientId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!order.productionGuideContent) {
    res.status(404).json({ error: "Production guide not yet generated for this order" });
    return;
  }

  const content = order.productionGuideContent as ProductionGuideContent;

  const [client] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, order.clientId));

  const [producerProfile] = await db
    .select({ studioName: producerProfilesTable.studioName })
    .from(producerProfilesTable)
    .where(eq(producerProfilesTable.userId, order.producerId));

  const [measurements] = await db
    .select()
    .from(measurementsTable)
    .where(eq(measurementsTable.userId, order.clientId));

  const [brief] = order.briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, order.briefId))
    : order.sessionId
      ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, order.sessionId))
      : [null];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="production-guide-${orderId}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
  doc.pipe(res);

  const M = 56;
  const PW = 595.28;
  const PH = 841.89;
  const CW = PW - M * 2;
  const GOLD = "#C08B4E";
  const DARK = "#111111";
  const GRAY = "#888888";
  const LIGHT = "#F5F5F0";
  const WHITE = "#FFFFFF";

  function sectionHeader(title: string) {
    doc.rect(0, 0, PW, 100).fill(DARK);
    doc.rect(M, 32, 3, 40).fill(GOLD);
    doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text(title, M + 14, 38, { width: CW });
    doc.fillColor(GRAY).fontSize(8).font("Helvetica").text("DRAPE · PRODUCTION GUIDE", M + 14, 66, { width: CW });
    doc.fillColor(DARK);
    return 120;
  }

  function subHeader(title: string, y: number) {
    doc.rect(M, y, 24, 2).fill(GOLD);
    doc.fillColor(DARK).fontSize(11).font("Helvetica-Bold").text(title, M, y + 8, { width: CW });
    return y + 28;
  }

  function labeledField(label: string, value: string, x: number, y: number, w: number) {
    doc.fillColor(GRAY).fontSize(7).font("Helvetica").text(label.toUpperCase(), x, y, { width: w });
    doc.fillColor(DARK).fontSize(10).font("Helvetica").text(value || "—", x, y + 10, { width: w, lineGap: 2 });
    return y + 10 + doc.heightOfString(value || "—", { width: w }) + 10;
  }

  function numberedStep(num: number, text: string, y: number): number {
    const circleX = M + 12;
    const textX = M + 32;
    const textW = CW - 32;
    doc.circle(circleX, y + 6, 10).fill(GOLD);
    doc.fillColor(WHITE).fontSize(8).font("Helvetica-Bold").text(String(num), circleX - 8, y + 2, { width: 16, align: "center" });
    doc.fillColor(DARK).fontSize(10).font("Helvetica").text(text, textX, y, { width: textW, lineGap: 3 });
    const h = Math.max(doc.heightOfString(text, { width: textW, lineGap: 3 }), 20);
    return y + h + 14;
  }

  function checkItem(text: string, y: number): number {
    doc.rect(M, y + 1, 12, 12).lineWidth(1.5).strokeColor(GOLD).stroke();
    doc.fillColor(DARK).fontSize(10).font("Helvetica").text(text, M + 20, y, { width: CW - 20, lineGap: 3 });
    const h = Math.max(doc.heightOfString(text, { width: CW - 20, lineGap: 3 }), 16);
    return y + h + 12;
  }

  function drawGarmentDiagram(startY: number) {
    const garment = (content.garmentType ?? "").toLowerCase();
    const isTrouser = garment.includes("trouser") || garment.includes("pant") || garment.includes("slack");
    const isSkirt = garment.includes("skirt");
    const isSleeve = !isTrouser && !isSkirt;

    doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold").text("PATTERN PIECES", M, startY, { width: CW });
    const diagY = startY + 16;

    const drawPiece = (label: string, sublabel: string, px: number, py: number, pw: number, ph: number, shape: "bodice" | "sleeve" | "skirt" | "trouser") => {
      doc.save();
      doc.lineWidth(1.2).strokeColor(DARK);
      if (shape === "bodice") {
        doc.moveTo(px + pw * 0.25, py).lineTo(px + pw * 0.75, py)
          .bezierCurveTo(px + pw, py, px + pw, py + ph * 0.35, px + pw, py + ph * 0.35)
          .lineTo(px + pw, py + ph).lineTo(px, py + ph).lineTo(px, py + ph * 0.35)
          .bezierCurveTo(px, py, px, py, px + pw * 0.25, py).closePath().stroke();
      } else if (shape === "sleeve") {
        doc.moveTo(px + pw * 0.5, py)
          .bezierCurveTo(px + pw, py, px + pw, py + ph * 0.25, px + pw, py + ph * 0.25)
          .lineTo(px + pw * 0.85, py + ph).lineTo(px + pw * 0.15, py + ph)
          .lineTo(px, py + ph * 0.25)
          .bezierCurveTo(px, py, px + pw * 0.5, py, px + pw * 0.5, py).closePath().stroke();
      } else if (shape === "skirt") {
        doc.moveTo(px + pw * 0.1, py).lineTo(px + pw * 0.9, py)
          .lineTo(px + pw, py + ph).lineTo(px, py + ph).closePath().stroke();
      } else {
        doc.moveTo(px + pw * 0.3, py).lineTo(px + pw * 0.7, py)
          .lineTo(px + pw * 0.55, py + ph * 0.55).lineTo(px + pw * 0.9, py + ph)
          .lineTo(px + pw * 0.7, py + ph).lineTo(px + pw * 0.5, py + ph * 0.6)
          .lineTo(px + pw * 0.3, py + ph).lineTo(px + pw * 0.1, py + ph)
          .lineTo(px + pw * 0.45, py + ph * 0.55).closePath().stroke();
      }
      const grainX = px + pw / 2;
      doc.moveTo(grainX, py + ph * 0.15).lineTo(grainX, py + ph * 0.85).strokeColor(GOLD).lineWidth(0.8).stroke();
      doc.polygon([grainX - 3, py + ph * 0.2], [grainX + 3, py + ph * 0.2], [grainX, py + ph * 0.12]).fill(GOLD);
      doc.polygon([grainX - 3, py + ph * 0.8], [grainX + 3, py + ph * 0.8], [grainX, py + ph * 0.88]).fill(GOLD);
      doc.restore();
      doc.fillColor(GRAY).fontSize(7).font("Helvetica").text(label, px, py + ph + 4, { width: pw, align: "center" });
      doc.fillColor(GRAY).fontSize(6).text(sublabel, px, py + ph + 14, { width: pw, align: "center" });
    };

    if (isTrouser) {
      drawPiece("FRONT PANEL", "Cut 2 on fold", M, diagY, 110, 130, "trouser");
      drawPiece("BACK PANEL", "Cut 2 on fold", M + 130, diagY, 110, 130, "trouser");
      drawPiece("WAISTBAND", "Cut 2 · 1.5cm S/A", M + 260, diagY, 90, 30, "skirt");
    } else if (isSkirt) {
      drawPiece("FRONT PANEL", "Cut 1 on fold", M, diagY, 120, 120, "skirt");
      drawPiece("BACK PANEL", "Cut 2 · 1.5cm S/A", M + 140, diagY, 120, 120, "skirt");
      drawPiece("WAISTBAND", "Cut 2 · 1cm S/A", M + 280, diagY, 90, 28, "skirt");
    } else {
      drawPiece("FRONT BODICE", "Cut 1 on fold · 1.5cm S/A", M, diagY, 105, 120, "bodice");
      drawPiece("BACK BODICE", "Cut 2 · 1.5cm S/A", M + 125, diagY, 105, 120, "bodice");
      drawPiece("SLEEVE", "Cut 2 · 1.5cm S/A", M + 250, diagY, 90, 110, "sleeve");
    }
    doc.fillColor(GRAY).fontSize(7).font("Helvetica")
      .text("↑ Grain line  ·  S/A = Seam Allowance  ·  All measurements to be verified against toile", M, diagY + 145, { width: CW });
    return diagY + 165;
  }

  function pageFooter(pageNum: number) {
    doc.rect(M, PH - 38, CW, 0.5).fill(GRAY);
    doc.fillColor(GRAY).fontSize(7).font("Helvetica").text(`Page ${pageNum}  ·  ${order.title}  ·  Confidential`, M, PH - 26, { width: CW - 60 });
    doc.text(new Date().toLocaleDateString("en-GB"), PW - M - 60, PH - 26, { width: 60, align: "right" });
  }

  // === COVER PAGE ===
  doc.rect(0, 0, PW, PH).fill(DARK);
  doc.rect(0, PH - 220, PW, 220).fill("#1A1A1A");
  doc.rect(M, 110, 4, 100).fill(GOLD);
  doc.fillColor(WHITE).fontSize(42).font("Helvetica-Bold").text("DRAPE", M + 20, 118, { characterSpacing: 10 });
  doc.fillColor(GOLD).fontSize(11).font("Helvetica").text("PRODUCTION GUIDE", M + 20, 175, { characterSpacing: 4 });
  doc.rect(M, 250, CW, 0.5).fill("#333333");
  doc.fillColor(WHITE).fontSize(26).font("Helvetica-Bold").text(order.title, M, 270, { width: CW });
  const titleH = doc.fontSize(26).heightOfString(order.title, { width: CW });
  let coverY = 270 + titleH + 24;
  doc.fillColor(GRAY).fontSize(10).font("Helvetica")
    .text(`Client`, M, coverY).text(client?.name ?? "—", M + 80, coverY)
    .text(`Studio`, M, coverY + 20).text(producerProfile?.studioName ?? "Drape Studio", M + 80, coverY + 20)
    .text(`Status`, M, coverY + 40).text(order.status.replace(/_/g, " "), M + 80, coverY + 40)
    .text(`Generated`, M, coverY + 60).text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), M + 80, coverY + 60);
  doc.roundedRect(M, PH - 180, 140, 36, 4).fill(GOLD);
  doc.fillColor(WHITE).fontSize(10).font("Helvetica-Bold")
    .text(content.garmentType?.toUpperCase() ?? "GARMENT", M, PH - 167, { width: 140, align: "center" });
  doc.fillColor(GRAY).fontSize(9).font("Helvetica")
    .text(`Est. ${content.estimatedHours ?? "?"} hours  ·  For tailor use only`, M, PH - 120, { width: CW });
  doc.rect(M, PH - 60, CW, 0.5).fill("#333333");
  doc.fillColor("#555555").fontSize(8).text("STRICTLY CONFIDENTIAL · DRAPE BESPOKE FASHION PLATFORM", M, PH - 44, { width: CW, align: "center" });

  // === PAGE 2: ORDER SUMMARY ===
  doc.addPage({ margin: 0 });
  let y = sectionHeader("Order Summary");
  y = subHeader("Brief Overview", y);
  doc.fillColor(DARK).fontSize(10).font("Helvetica").text(content.orderSummary, M, y, { width: CW, lineGap: 4 });
  y += doc.heightOfString(content.orderSummary, { width: CW, lineGap: 4 }) + 24;
  const col = CW / 2 - 8;
  y = subHeader("Order Details", y);
  const col1Y = y;
  const col2Y = y;
  let c1y = labeledField("Occasion", brief?.occasion ?? "—", M, col1Y, col);
  c1y = labeledField("Aesthetic", brief?.aestheticDirection ?? "—", M, c1y, col);
  c1y = labeledField("Silhouette", brief?.silhouette ?? "—", M, c1y, col);
  let c2y = labeledField("Fabric Preferences", brief?.fabricPreferences ?? "—", M + col + 16, col2Y, col);
  c2y = labeledField("Special Notes", brief?.specialNotes ?? order.notes ?? "—", M + col + 16, c2y, col);
  y = Math.max(c1y, c2y) + 16;
  if (brief?.colorPalette?.length) {
    y = subHeader("Colour Palette", y);
    brief.colorPalette.forEach((c: string, i: number) => {
      const cx = M + i * 70;
      const safeColor = /^#[0-9A-Fa-f]{6}$/.test(c) ? c : GOLD;
      doc.roundedRect(cx, y, 56, 28, 4).fill(safeColor).stroke(safeColor);
      doc.fillColor(DARK).fontSize(7).font("Helvetica").text(c, cx, y + 32, { width: 56, align: "center" });
    });
    y += 54;
  }
  y = subHeader("Fabric & Material Notes", y);
  doc.fillColor(DARK).fontSize(10).font("Helvetica").text(content.fabricNotes, M, y, { width: CW, lineGap: 4 });
  pageFooter(2);

  // === PAGE 3: MEASUREMENTS ===
  doc.addPage({ margin: 0 });
  y = sectionHeader("Client Measurements");
  if (measurements) {
    const entries = Object.entries(measurements.data).filter(([, v]) => v != null);
    y = subHeader(`All measurements in ${measurements.unit}`, y);
    doc.rect(M, y, CW, 28).fill(DARK);
    doc.fillColor(WHITE).fontSize(8).font("Helvetica-Bold").text("MEASUREMENT", M + 8, y + 9, { width: CW / 2 });
    doc.text("VALUE", M + CW / 2, y + 9, { width: CW / 2 });
    y += 28;
    entries.forEach(([key, val], i) => {
      const rowBg = i % 2 === 0 ? LIGHT : WHITE;
      doc.rect(M, y, CW, 24).fill(rowBg);
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      doc.fillColor(DARK).fontSize(9.5).font("Helvetica").text(label, M + 8, y + 7, { width: CW / 2 });
      doc.font("Helvetica-Bold").text(`${val} ${measurements.unit}`, M + CW / 2, y + 7, { width: CW / 2 });
      y += 24;
    });
    if (measurements.notes) {
      y += 16;
      y = subHeader("Fitting Notes", y);
      doc.fillColor(DARK).fontSize(10).font("Helvetica").text(measurements.notes, M, y, { width: CW, lineGap: 3 });
    }
  } else {
    doc.fillColor(GRAY).fontSize(11).text("No measurements recorded for this client.", M, y + 16);
  }
  pageFooter(3);

  // === PAGE 4: CUTTING GUIDE ===
  doc.addPage({ margin: 0 });
  y = sectionHeader("Pattern & Cutting Guide");
  y = drawGarmentDiagram(y);
  y = subHeader("Cutting Instructions", y);
  content.cuttingGuide.forEach((step, i) => {
    if (y > PH - 100) { doc.addPage({ margin: 0 }); y = M; }
    y = numberedStep(i + 1, step, y);
  });
  pageFooter(4);

  // === PAGE 5: SEWING SEQUENCE ===
  doc.addPage({ margin: 0 });
  y = sectionHeader("Sewing Sequence");
  content.sewingSequence.forEach((step, i) => {
    if (y > PH - 100) { doc.addPage({ margin: 0 }); y = M; }
    y = numberedStep(i + 1, step, y);
  });
  pageFooter(5);

  // === PAGE 6: FINISHING ===
  doc.addPage({ margin: 0 });
  y = sectionHeader("Finishing Techniques");
  content.finishingSteps.forEach((step, i) => {
    if (y > PH - 100) { doc.addPage({ margin: 0 }); y = M; }
    y = numberedStep(i + 1, step, y);
  });
  if (content.technicalNotes) {
    if (y > PH - 150) { doc.addPage({ margin: 0 }); y = M; }
    y += 8;
    y = subHeader("Technical Notes", y);
    doc.rect(M, y, CW, doc.heightOfString(content.technicalNotes, { width: CW - 24, lineGap: 3 }) + 20).fill(LIGHT);
    doc.fillColor(DARK).fontSize(10).font("Helvetica").text(content.technicalNotes, M + 12, y + 10, { width: CW - 24, lineGap: 3 });
  }
  pageFooter(6);

  // === PAGE 7: FITTING CHECKLIST ===
  doc.addPage({ margin: 0 });
  y = sectionHeader("Fitting Checklist");
  doc.fillColor(GRAY).fontSize(9).font("Helvetica").text("Verify each point at every fitting session. Tick when satisfied.", M, y, { width: CW });
  y += 24;
  content.fittingChecklist.forEach((item) => {
    if (y > PH - 80) { doc.addPage({ margin: 0 }); y = M; }
    y = checkItem(item, y);
  });
  pageFooter(7);

  // === PAGE 8: QUALITY CONTROL ===
  doc.addPage({ margin: 0 });
  y = sectionHeader("Final Quality Control");
  doc.fillColor(GRAY).fontSize(9).font("Helvetica").text("Complete this checklist before packaging for delivery.", M, y, { width: CW });
  y += 24;
  content.qualityChecklist.forEach((item) => {
    if (y > PH - 80) { doc.addPage({ margin: 0 }); y = M; }
    y = checkItem(item, y);
  });
  doc.rect(M, y + 20, CW, 56).fill(DARK);
  doc.fillColor(GOLD).fontSize(11).font("Helvetica-Bold").text("Ready for Delivery", M + 16, y + 32, { width: CW - 80 });
  doc.fillColor(GRAY).fontSize(9).font("Helvetica").text("Sign off when all checks are complete.", M + 16, y + 50, { width: CW - 80 });
  doc.fillColor(GRAY).text("Tailor: ___________________    Date: ___________", M + 16, y + 68, { width: CW - 32 });
  pageFooter(8);

  doc.end();
});

export default router;
