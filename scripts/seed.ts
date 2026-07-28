// ═══════════════════════════════════════════════════════════════════════════
// DRAPE DEMO DATA SEEDER
// ═══════════════════════════════════════════════════════════════════════════
// Run: npx tsx scripts/seed.ts
// Demo users identified by @drape-demo.com email suffix.
// To clear: DELETE FROM users WHERE email LIKE '%@drape-demo.com';
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@workspace/db";
import {
  usersTable, profilesTable, producerProfilesTable,
  clientPreferencesTable, portfolioItemsTable,
  reviewsTable, ordersTable, bookingsTable,
  notificationsTable, inventoryItemsTable,
  invoicesTable, expensesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────
const CITIES = ["Lagos","Abuja","Port Harcourt","Enugu","Owerri","Onitsha","Awka","Benin City","Aba","Uyo","Calabar","Ibadan","Kano","Kaduna","Jos","Asaba","Warri","Makurdi","Ilorin","Yola"];
const SPECIALTIES = ["Bridal","Luxury","Ready-to-Wear","Streetwear","Corporate Wear","Native Attire","Agbada","Senator Wear","Ankara Specialist","Aso-Ebi","Children's Clothing","Women's Fashion","Men's Fashion","Sportswear","Leather Crafts","Accessories","Bespoke Tailoring","Fashion Illustration","Embroidery","Fashion Consulting"];
const REVIEW_COMMENTS = [
  "Absolutely stunning work! The attention to detail was incredible. I received so many compliments at the event.",
  "Professional from start to finish. Communication was clear and the delivery was on time.",
  "Beautiful craftsmanship. The fabric selection was perfect and the fit was impeccable.",
  "Highly recommended! This designer truly understands fashion and brings your vision to life.",
  "Excellent service and outstanding quality. Will definitely be coming back for more pieces.",
  "The fitting was perfect on the first try. Amazing tailoring skills!",
  "Great experience working with this designer. Very responsive and accommodating to changes.",
  "Loved the unique design. It's exactly what I wanted and more. Very talented!",
  "Professional, punctual, and creative. The finished piece exceeded my expectations.",
  "Wonderful custom piece. The embroidery work was exceptional. True artistry!",
  "Good quality work but delivery was slightly delayed. The end result made up for it though.",
  "Decent work for the price. Communication could have been better but the outfit came out nice.",
  "Very creative designs. My wedding dress was absolutely perfect. Thank you!",
  "The Ankara styling was phenomenal. Finally found someone who understands African prints!",
  "Great consultation process. They really listened to what I wanted and delivered beautifully.",
  "Exceptional craftsmanship. The beadwork and embroidery are world-class.",
  "Fast turnaround without compromising quality. Thrilled with my custom agbada!",
  "She understood my vision completely. The fitting was flawless.",
  "Professional, talented, and delivers exactly what was promised every time.",
  "Best tailor in Lagos! My entire wedding party used them and everyone was impressed.",
];
const BUSINESS_NAMES = [
  "Maison Luxe","Silhouette Studio","Thread & Needle","Aso Elegance","Lagos Vogue House",
  "Royal Stitch","Kaftan Kings","Ankara Artistry","Bespoke by Chi","Aurelia Fashion House",
  "Crimson Couture","Eclipse Tailoring","Velvet & Thread","Iroko Designs","Sapphire Styles",
  "Golden Needle Atelier","Casa Couture","Zenith Fashion Lab","Heritage Stitches","Urban Luxe Wear",
  "Diamond Stitch","Opulance by Ola","The Tailor's Guild","Vogue Nigeria","Prestige Patterns",
  "Afro Elegance","Craft & Cloth","The Style Studio","Lace & Linen","Couture Avenue",
  "Amara Collections","Stitch & Stone","Eko Fashion House","Noble Attire","Tropical Threads",
  "Bamboo Tailoring","Ivory & Ink","The Design Loft","Sartorial Lagos","Mosaic Fashion",
  "Calabar Chic","Hausa Heritage Wear","Igbo Pride Designs","Yoruba Glamour","Benin Royal Stitches",
  "Savannah Styles","Coastal Couture","Desert Rose Fashion","Rainforest Tailoring","Harbour Fashion House",
  "Platinum Stitch","Luxe Africa","The Embroidery House","Classic Cuts","Trendsetters NG",
  "Aso Rock Fashion","Delta Designs","Creek City Couture","Abia Bridal","Enugu Elegance",
  "Owerri Original","Awka Atelier","Onitsha Custom Wear","Warri Worthy","Asaba Aso",
  "Makurdi Moda","Jos Fashion Factory","Kano Creative Hub","Ilorin Textiles","Yola Styles",
  "Abeokuta Stitches","Ogbomoso Tailoring","Badagry Beach Wear","Ikorodu Fashion","Epe Embroidery",
  "Surulere Styles","Victoria Island Vogue","Lekki Luxury","Ikeja Fashion District","Ajah Atelier",
];
const DESIGNER_NAMES = [
  "Amara Adebayo","Chidi Okonkwo","Ngozi Okafor","Emeka Balogun","Zainab Eze",
  "Fatima Nwosu","Oluwaseun Ogunlade","Tunde Ugwu","Chioma Osei","Ifeanyi Diop",
  "Adaeze Adegoke","Chukwudi Oyedele","Yetunde Nwachukwu","Segun Oyelade","Ebere Akintola",
  "Kayode Oluwole","Folake Onyema","Musa Ibekwe","Nnenna Chibueze","Babatunde Odimayo",
  "Simi Adeleke","Wale Ogunbiyi","Kemi Oshodi","Yusuf Bello","Hauwa Suleiman",
  "Tobi Akinlade","Onyinye Okafor","Chisom Ugwu","Ejiro Okpara","Teniola Fashola",
  "Femi Akinwale","Bola Ogun","Damilola Adeyemi","Tolulope Banjo","Abimbola Oyesanya",
  "Kelechi Obi","Somto Okeke","Uche Nwankwo","Ijeoma Eze","Amaka Okafor",
  "Oluchi Obi","Chidera Eze","Kosiso Okoro","Ebuka Ugwu","Nnamdi Okeke",
  "Chibuzo Okafor","Zara Bello","Halima Adeleke","Amina Suleiman","Rashidat Ogun",
  "Bisi Akinlade","Lola Oshodi","Sade Adeyemi","Temidayo Banjo","Ayomide Ogunbiyi",
  "Feyikemi Adegoke","Mobolaji Oyedele","Opeyemi Nwachukwu","Boluwatife Oyelade","Titilayo Akintola",
  "Funmilayo Oluwole","Modupe Onyema","Olayinka Ibekwe","Morenikeji Chibueze","Abosede Odimayo",
  "Ezinne Adeleke","Chiamaka Ogunbiyi","Nneoma Oshodi","Chinenye Bello","Uzoma Suleiman",
  "Obinna Akinlade","Chukwuma Ogun","Okechukwu Adeyemi","Ezeh Banjo","Okezie Oyesanya",
];
const CLIENT_NAMES = [
  "Sarah Williams","Michael Johnson","Jennifer Brown","David Davis","Grace Wilson",
  "Samuel Taylor","Esther Thomas","Daniel Jackson","Ruth White","Joseph Harris",
  "Deborah Martin","Joshua Thompson","Mary Robinson","Andrew Clark","Cynthia Lewis",
  "Peter Walker","Martha Hall","James Allen","Lydia Young","Thomas King",
  "Peace Wright","John Hill","Faith Scott","George Green","Mercy Adams",
  "Paul Baker","Joy Nelson","Philip Carter","Elizabeth Mitchell","Mark Roberts",
  "Victoria Turner","Matthew Phillips","Blessing Campbell","Stephen Parker","Hannah Evans",
  "Frank Edwards","Gloria Collins","Chris Stewart","Patience Morris","Charles Morrison",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function slug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

async function main() {
  const hash = await bcrypt.hash("Demo@123", 12);
  const designerIds: string[] = [];
  const clientIds: string[] = [];

  console.log("🌱 Seeding Drape with demo data...\n");

  // ── 80 Designers ─────────────────────────────────────────────────
  console.log("  Creating 80 designers...");
  for (let i = 0; i < 80; i++) {
    const name = DESIGNER_NAMES[i];
    const email = `designer${i+1}@drape-demo.com`;
    const id = randomUUID();
    designerIds.push(id);
    const bizName = BUSINESS_NAMES[i];
    const city = pick(CITIES);
    const exp = rand(2, 25);
    const numspec = rand(1, 4);
    const specs: string[] = [];
    while (specs.length < numspec) { const s = pick(SPECIALTIES); if (!specs.includes(s)) specs.push(s); }

    await db.insert(usersTable).values({
      id, email, name, role: "DESIGNER", passwordHash: hash,
      onboardingComplete: true,
    });
    await db.insert(producerProfilesTable).values({
      userId: id,
      brandName: bizName, professionalName: name.split(" ")[0],
      bio: `${specs.slice(0,2).join(" and ")} specialist with ${exp}+ years of experience. ${pick([
        "Every piece tells a unique story, crafted with passion and precision.",
        "Trained in both traditional Nigerian techniques and contemporary global fashion.",
        "Dedicated to creating garments that celebrate African heritage with modern sophistication.",
        "Known for exceptional craftsmanship and an unwavering commitment to quality.",
      ])}`,
      location: city, specialization: specs[0],
      specialties: specs, studioName: bizName,
      studioType: pick(["SOLO","STUDIO","ATELIER","BRAND"]) as any,
      experience: exp,
      portfolioUrls: [] as string[],
      priceMin: rand(15000, 50000), priceMax: rand(80000, 500000),
      website: `https://${slug(bizName)}.example.com`,
      instagram: slug(bizName),
      availability: pick(["available","busy","limited"]) as any,
    });
  }

  // ── 40 Clients ────────────────────────────────────────────────────
  console.log("  Creating 40 clients...");
  for (let i = 0; i < 40; i++) {
    const name = CLIENT_NAMES[i];
    const email = `client${i+1}@drape-demo.com`;
    const id = randomUUID();
    clientIds.push(id);
    await db.insert(usersTable).values({
      id, email, name, role: "CLIENT", passwordHash: hash,
      onboardingComplete: true,
    });
    await db.insert(clientPreferencesTable).values({
      userId: id,
      stylePreferences: [pick(["Modern","Classic","Traditional","Minimalist","Avant-garde","Bohemian","Romantic","Edgy"]), pick(["Ankara prints","Lace","Plain fabrics","Mixed patterns","Sustainable materials"])],
      preferredColours: [pick(["Bold colours","Pastels","Neutrals","Jewel tones","Earth tones"])],
      budgetMin: rand(20000, 100000), budgetMax: rand(150000, 1000000),
    });
  }

  // ── 550 Orders ────────────────────────────────────────────────────
  console.log("  Creating 550 orders/projects...");
  for (let i = 0; i < 550; i++) {
    const status = i < 300 ? pick(["COMPLETED","DELIVERED"]) : i < 450 ? pick(["ENQUIRY","ACCEPTED","DEPOSIT_PAID","IN_PRODUCTION","FITTING"]) : "ENQUIRY";
    await db.insert(ordersTable).values({
      clientId: pick(clientIds), producerId: pick(designerIds),
      status: status as any,
      title: pick([`${pick(["Bridal","Evening","Corporate","Casual","Traditional","Wedding"])} ${pick(["Gown","Suit","Dress","Outfit","Ensemble","Agbada","Kaftan","Blazer"])}`]),
      description: pick(["Custom made for a special occasion","Professional corporate wardrobe","Traditional wedding attire","Casual everyday luxury wear","Bespoke evening wear collection"]),
      agreedPrice: rand(30000, 500000), currency: "NGN",
      depositPaid: Math.random() > 0.3, estimatedDays: rand(5, 30),
    });
  }

  // ── 620 Reviews ───────────────────────────────────────────────────
  console.log("  Creating 620 reviews...");
  for (let i = 0; i < 620; i++) {
    const rating = Math.random() < 0.7 ? rand(4,5) : Math.random() < 0.9 ? 3 : rand(1,2);
    await db.insert(reviewsTable).values({
      orderId: randomUUID(), clientId: pick(clientIds),
      designerId: pick(designerIds), rating, status: "APPROVED",
      title: pick(["Absolutely beautiful!","Highly recommended","Exceeded expectations","Great craftsmanship","Love my outfit!","Professional service","Stunning work","Perfect fit","Will order again","Exceptional quality"]),
      comment: pick(REVIEW_COMMENTS),
      imageUrls: [] as string[], helpfulCount: rand(0, 12),
    });
  }

  // ── 200 Bookings ──────────────────────────────────────────────────
  console.log("  Creating 200 bookings...");
  for (let i = 0; i < 200; i++) {
    const start = new Date();
    start.setDate(start.getDate() + rand(-60, 90));
    const end = new Date(start); end.setHours(end.getHours() + rand(1, 3));
    await db.insert(bookingsTable).values({
      clientId: pick(clientIds), designerId: pick(designerIds),
      type: pick(["CONSULTATION","MEASUREMENTS","FITTING","STUDIO_VISIT","VIRTUAL_MEETING"]) as any,
      status: start < new Date() ? pick(["COMPLETED","CANCELLED","NO_SHOW"]) as any : pick(["PENDING","CONFIRMED"]) as any,
      title: pick(["Fitting session","Design consultation","Measurement appointment","Fabric selection","Final fitting","Style consultation"]),
      startTime: start, endTime: end, timezone: "Africa/Lagos",
      isVirtual: Math.random() > 0.5,
    });
  }

  // ── 300 Notifications ─────────────────────────────────────────────
  console.log("  Creating 300 notifications...");
  const notifTypes = ["ORDER_UPDATE","MESSAGE","BRIEF_READY","REVIEW_REQUEST","GENERAL","NEW_ORDER","ORDER_ACCEPTED","STATUS_UPDATED"] as const;
  for (let i = 0; i < 300; i++) {
    await db.insert(notificationsTable).values({
      userId: pick([...clientIds, ...designerIds]),
      type: pick(notifTypes),
      title: pick(["Project approved!","New message received","Booking confirmed","Payment received","Portfolio liked","Review received","Order status updated","New consultation request"]),
      body: `Your ${pick(["bridal gown","suit","agbada","evening dress","ankara outfit"])} is ${pick(["ready for fitting","in production","being designed","approved","completed"])}.`,
      read: Math.random() > 0.4,
    });
  }

  // ── 800+ Portfolio Items ──────────────────────────────────────────
  console.log("  Creating 800+ portfolio items...");
  for (const did of designerIds) {
    const count = rand(6, 15);
    for (let j = 0; j < count; j++) {
      await db.insert(portfolioItemsTable).values({
        designerId: did,
        title: pick(["Elegant Evening Gown","Modern Agbada","Bridal Masterpiece","Corporate Blazer","Ankara Fusion Dress","Traditional Wedding Set","Casual Luxury Wear","Statement Piece","Summer Collection","Couture Evening Wear"]),
        description: pick(["Handcrafted with premium fabric. Features intricate embroidery and beadwork.","Modern take on traditional Nigerian fashion. Clean lines, bold patterns.","Bespoke piece made for a discerning client. Premium finish throughout."]),
        category: pick(SPECIALTIES), tags: [pick(["luxury","traditional","modern","handmade","premium","bespoke","custom","unique"])],
        imageUrls: [] as string[],
      });
    }
  }

  // ── 200 Invoices ──────────────────────────────────────────────────
  console.log("  Creating 200 invoices...");
  for (let i = 0; i < 200; i++) {
    const total = rand(50000, 500000);
    const status = pick(["PAID","PAID","PAID","DRAFT","SENT","OVERDUE","CANCELLED"]);
    await db.insert(invoicesTable).values({
      userId: pick(designerIds), clientId: pick(clientIds),
      invoiceNumber: `DEMO-INV-${String(i+1).padStart(5, "0")}`,
      status: status as any,
      items: [{ description: pick(["Design consultation fee","Bespoke tailoring service","Fabric sourcing & pattern making","Rush delivery fee","Fitting session & alterations"]), quantity: rand(1, 5), unitPrice: rand(10000, 100000), totalPrice: total }],
      subtotal: total, taxRate: "7.5", taxAmount: Math.round(total * 0.075),
      discount: Math.random() > 0.7 ? rand(5000, 50000) : 0,
      total: Math.round(total * 1.075),
      amountPaid: status === "PAID" ? total : 0,
      balanceDue: status === "PAID" ? 0 : total,
      currency: "NGN", clientName: pick(CLIENT_NAMES),
    });
  }

  // ── 400 Expenses ──────────────────────────────────────────────────
  console.log("  Creating 400 expenses...");
  const expenseCats = ["FABRIC","TRANSPORT","LABOUR","UTILITIES","EQUIPMENT","MARKETING","RENT","SUPPLIES","SOFTWARE","INSURANCE","TAX","OTHER"] as const;
  for (let i = 0; i < 400; i++) {
    await db.insert(expensesTable).values({
      userId: pick(designerIds),
      description: pick([`Purchased ${pick(["lace","ankara","silk","cotton","organza","tulle","velvet"])} fabric from local market`,`${pick(["Tailor","Seamstress","Assistant","Delivery"])} ${pick(["wages","overtime","allowance"])}`,`${pick(["Electricity","Water","Internet","Rent"])} — monthly`,`${pick(["Sewing machine","Mannequin","Iron","Cutting table"])} ${pick(["repair","purchase"])}`,`${pick(["Instagram","Google","Facebook"])} advertising campaign`]),
      category: pick(expenseCats), amount: rand(2000, 200000), currency: "NGN",
      taxDeductible: Math.random() > 0.3 ? "true" : "false",
      vendor: pick(["Lagos Textile Market","Abuja Fabrics Co.","Online Tailoring Supplies","Kano Leather Goods","Enugu Craft Centre","Port Harcourt Fashion Mart"]),
    });
  }

  // ── 200+ Inventory Items ──────────────────────────────────────────
  console.log("  Creating 200 inventory items...");
  const invCats = ["FABRIC","THREADS","BUTTONS","ZIPPERS","ACCESSORIES","PACKAGING","LABELS","EQUIPMENT"] as const;
  const fabricNames = ["Swiss Lace","Guipure Lace","French Lace","Chiffon","Satin","Silk","Cotton Voile","Ankara Print","Aso Oke","Brocade","Organza","Tulle","Velvet","Crepe","Georgette","Linen","Sequin Mesh","Beaded Tulle"];
  for (const did of designerIds.slice(0, 30)) {
    const count = rand(3, 10);
    for (let j = 0; j < count; j++) {
      const cat = pick(invCats);
      await db.insert(inventoryItemsTable).values({
        userId: did, name: cat === "FABRIC" ? pick(fabricNames) : pick(["Polyester Thread","Cotton Thread","Gold Button","Pearl Button","Metal Zipper","Invisible Zipper","Satin Ribbon","Hook & Eye","Bias Tape","Elastic Band","Fusible Interfacing"]),
        category: cat as any, unit: "UNIT" as any, quantity: rand(5, 500),
        unitCost: rand(200, 50000), lowStockThreshold: rand(5, 20),
      });
    }
  }

  console.log("\n✅ Demo data seeded successfully!");
  console.log(`  80 designers, 40 clients`);
  console.log(`  550 projects, 620 reviews, 200 bookings`);
  console.log(`  300 notifications, 800+ portfolio items`);
  console.log(`  200 invoices, 400 expenses, 200+ inventory items`);
  console.log(`\n  All demo users use @drape-demo.com emails.`);
  console.log(`  Default password for all: Demo@123`);
  console.log(`  To clear: DELETE FROM users WHERE email LIKE '%@drape-demo.com';`);
  process.exit(0);
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
