// ═══════════════════════════════════════════════════════════════════════════
// DRAPE COMPREHENSIVE DEMO DATA SEEDER — v2.0
// ═══════════════════════════════════════════════════════════════════════════
// Run: npx tsx scripts/seed.ts
// Uses @drape.demo emails with role-specific passwords.
// Auto-generates demo_accounts.csv after seeding.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@workspace/db";
import {
  usersTable, producerProfilesTable, clientPreferencesTable, adminProfilesTable,
  profilesTable, portfolioItemsTable, reviewsTable, ordersTable, orderMessagesTable,
  bookingsTable, notificationsTable, inventoryItemsTable,
  invoicesTable, expensesTable, suppliersTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DEMO_DOMAIN = "drape.demo";
const PASSWORDS = {
  DESIGNER: "Designer@123",
  CLIENT: "Client@123",
  ADMIN: "Admin@123",
};
const BCRYPT_ROUNDS = 10;
const SEED_VERSION = "2.0";

const CITIES = ["Lagos","Abuja","Ibadan","Port Harcourt","Benin City","Aba","Owerri","Enugu","Onitsha","Awka","Asaba","Warri","Uyo","Calabar","Jos","Kaduna","Kano","Ilorin","Makurdi","Yola","Maiduguri","Lokoja","Abeokuta","Akure","Osogbo","Ado Ekiti","Minna","Sokoto","Bauchi","Gombe","Damaturu","Birnin Kebbi"];
const STATES: Record<string, string> = {
  Lagos:"Lagos","Abuja":"FCT","Ibadan":"Oyo","Port Harcourt":"Rivers","Benin City":"Edo","Aba":"Abia","Owerri":"Imo","Enugu":"Enugu","Onitsha":"Anambra","Awka":"Anambra","Asaba":"Delta","Warri":"Delta","Uyo":"Akwa Ibom","Calabar":"Cross River","Jos":"Plateau","Kaduna":"Kaduna","Kano":"Kano","Ilorin":"Kwara","Makurdi":"Benue","Yola":"Adamawa","Maiduguri":"Borno","Lokoja":"Kogi","Abeokuta":"Ogun","Akure":"Ondo","Osogbo":"Osun","Ado Ekiti":"Ekiti","Minna":"Niger","Sokoto":"Sokoto","Bauchi":"Bauchi","Gombe":"Gombe","Damaturu":"Yobe","Birnin Kebbi":"Kebbi"
};
const SPECIALTIES = ["Luxury Bridal","Wedding Couture","Bespoke Menswear","Native Wear","Agbada","Senator Wear","Ankara Specialist","Aso-Ebi","Ready-to-Wear","Streetwear","Luxury","Corporate Wear","Children's","Women's Fashion","Men's Fashion","Sportswear","Leather Goods","Accessories","Embroidery","Fashion Illustration","Uniform Production","Fashion Consultancy","Sustainable Fashion","Plus Size","Modest Fashion","Shoemaking"];
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
  "Magodo Design Studio","GRA Couture","Jakande Tailors","Anthony Village Fashion","Yaba Creative Hub",
  "Bode Thomas Design","Mile 2 Tailoring","Oshodi Fabrics","Marina Luxury","VI Atelier",
  "Ikota Design House","Lekki Phase 1 Studio","Chevron Fashion Lab","Ajah Creative Space","Sangotedo Atelier",
  "Epe Embroidery House","Badagry Heritage Wear","Ikorodu Classic Cuts","Ikeja Elegance","Surulere Stitch Lab",
  "Ketu Fashion Hub","Agege Tailoring Co","Bariga Design Studio","Mushin Creative Workshop","Oworo Fashion Lab",
  "Ebute Metta Stitches","Ilupéju Couture","Ojota Ready-to-Wear","Maryland Atelier","Gbagada Style House",
];
const DESIGNER_FIRST = ["Amara","Chidi","Ngozi","Emeka","Zainab","Fatima","Oluwaseun","Tunde","Chioma","Ifeanyi","Adaeze","Chukwudi","Yetunde","Segun","Ebere","Kayode","Folake","Musa","Nnenna","Babatunde","Simi","Wale","Kemi","Yusuf","Hauwa","Tobi","Onyinye","Chisom","Ejiro","Teniola","Femi","Bola","Damilola","Tolulope","Abimbola","Kelechi","Somto","Uche","Ijeoma","Amaka","Oluchi","Chidera","Kosiso","Ebuka","Nnamdi","Chibuzo","Zara","Halima","Amina","Rashidat","Bisi","Lola","Sade","Temidayo","Ayomide","Feyikemi","Mobolaji","Opeyemi","Boluwatife","Titilayo","Funmilayo","Modupe","Olayinka","Yetunde","Morenikeji","Abosede","Ezinne","Chiamaka","Nneoma","Chinenye","Uzoma","Obinna","Chukwuma","Azubuike","Okechukwu","Ezeh","Obinna","Chidiebere","Somtochukwu","Onyeka","Chimamanda","Nwabueze","Okezie","Chibueze","Ugochukwu","Chinwe","Ifunanya","Onyinyechi","Chidimma","Chiamaka","Chinenyenwa","Uchenna","Ogochukwu","Nneka","Chioma","Chinyere","Adanna","Chisara","Chidalu","Chiamara","Chidera","Chimdiebere","Chinaza"];
const DESIGNER_LAST = ["Adebayo","Okonkwo","Okafor","Balogun","Eze","Nwosu","Ogunlade","Ugwu","Osei","Diop","Adegoke","Oyedele","Nwachukwu","Oyelade","Akintola","Oluwole","Onyema","Ibekwe","Chibueze","Odimayo","Fashola","Akinwale","Ogunbiyi","Oshodi","Bello","Suleiman","Akinlade","Banjo","Oyesanya","Obi","Okeke","Nwankwo","Eze","Okafor","Ugwu","Okoro","Ugwu","Okeke","Okafor","Bello","Adeleke","Suleiman","Ogun","Akinlade","Oshodi","Adeyemi","Banjo","Ogunbiyi","Adegoke","Oyedele","Nwachukwu","Oyelade","Akintola","Oluwole","Onyema","Ibekwe","Chibueze","Odimayo","Adebayo","Okonkwo","Okafor","Balogun","Eze","Nwosu","Ogunlade","Ugwu","Osei","Diop","Adegoke","Oyedele","Nwachukwu","Oyelade","Akintola","Oluwole","Onyema","Ibekwe","Chibueze","Odimayo","Fashola","Akinwale","Ogunbiyi","Oshodi","Bello","Suleiman","Akinlade","Banjo","Oyesanya","Obi","Okeke","Nwankwo"];
const CLIENT_FIRST = ["Sarah","Michael","Jennifer","David","Grace","Samuel","Esther","Daniel","Ruth","Joseph","Deborah","Joshua","Mary","Andrew","Cynthia","Peter","Martha","James","Lydia","Thomas","Peace","John","Faith","George","Mercy","Paul","Joy","Philip","Elizabeth","Mark","Victoria","Matthew","Blessing","Stephen","Hannah","Frank","Gloria","Chris","Patience","Charles","Ngozi","Funke","Bolanle","Chinyere","Amara","Ezinne","Adaeze","Nnenna","Ijeoma","Yetunde","Kemi","Simi","Folake","Zainab","Halima","Amina","Bisi","Lola","Sade","Titilayo"];
const CLIENT_LAST = ["Williams","Johnson","Brown","Davis","Wilson","Taylor","Thomas","Jackson","White","Harris","Martin","Thompson","Robinson","Clark","Lewis","Walker","Hall","Allen","Young","King","Wright","Hill","Scott","Green","Adams","Baker","Nelson","Carter","Mitchell","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Morris","Morrison","Okafor","Eze","Nwosu","Ugwu","Okonkwo","Balogun","Adebayo","Adegoke","Ogunbiyi","Fashola","Akinlade","Oshodi","Bello","Suleiman","Akinwola","Diop","Osei","Oyelade","Oluwole","Nwachukwu"];
const SUPPLIER_NAMES = ["Lagos Textile Market","Abuja Fabrics Co.","Online Tailoring Supplies","Kano Leather Goods","Enugu Craft Centre","Port Harcourt Fashion Mart","Ibadan Textiles","Aba Fabric Wholesalers","Onitsha Thread Distributors","Kaduna Button Manufacturers","Jos Accessories Ltd","Calabar Lace House","Benin City Silk Traders","Warri Cotton Suppliers","Minna Packaging Co.","Makurdi Labels Ltd","Yola Equipment Rentals","Sokoto Tailoring Supplies","Bauchi Fabric Warehouse","Gombe Creative Materials","Osogbo Embroidery Threads","Ado Ekiti Crafts","Akure Leather Works","Lokoja Sewing Machines","Damaturu Buttons & Zippers"];
const FABRIC_NAMES = ["Swiss Lace","Guipure Lace","French Lace","Chiffon","Satin","Silk","Cotton Voile","Ankara Print","Aso Oke","Brocade","Organza","Tulle","Velvet","Crepe","Georgette","Linen","Sequin Mesh","Beaded Tulle","Damask","Jacquard","Mikado Silk","Shantung Silk","Charmeuse","Lace Netting","African Wax Print","Tie Dye","Adire","Kente","Bark Cloth","Cashmere","Wool Blend","Rayon","Polyester Blend","Spandex Mix"];
const MESSAGE_TEMPLATES = [
  ["Good morning! I'd like to discuss my bridal gown order.", "Good morning! Thank you for reaching out. I'd be happy to discuss your bridal gown. What's your vision?", "I'm getting married in June and I need something elegant and timeless. I love lace details and a classic silhouette.", "That sounds beautiful! I specialize in bridal wear. Would you like to schedule a consultation so we can discuss fabrics and measurements?"],
  ["Hello! I was wondering about pricing for a custom agbada.", "Great question! My custom agbada pieces start from ₦85,000 depending on fabric and embroidery complexity.", "That sounds reasonable. I'd like to come in for a measurement appointment.", "Perfect. I'll send you my available time slots for this week."],
  ["Hi, I need a corporate uniform for my team of 12 people.", "Hello! I'd be delighted to help with your corporate uniforms. I can offer a bulk discount for 12 pieces.", "That would be wonderful. Can you share some fabric samples?", "Absolutely. I'll prepare a selection of professional fabrics and visit your office later this week."],
  ["The fitting was perfect! Thank you so much.", "You're welcome! It was a pleasure working with you. The final adjustments will be ready by Friday.", "Excellent. I can't wait to wear it to the event!", "I'm sure you'll look stunning. I'll send a confirmation once it's ready for pickup."],
  ["I'd like to make some changes to the design.", "Of course! What changes did you have in mind?", "I'd like the sleeves to be longer and the neckline to be a bit higher.", "Absolutely, I can make those adjustments. Let me update the design and send you a revised sketch."],
  ["When can I come for my next fitting?", "Your next fitting is scheduled for Thursday at 2 PM. Does that still work for you?", "Yes, that's perfect. See you then!", "Great, see you Thursday! Please bring your shoes so we can finalize the hem length."],
  ["The Ankara dress you made for me is absolutely stunning!", "Thank you so much! It was a joy to work with such beautiful fabric. You chose well!", "Everyone at the wedding complimented it. I'll definitely be ordering again.", "I look forward to working with you again! Feel free to share any inspiration for your next piece."],
  ["I need a rush order for a senator wear. Can you deliver in 5 days?", "That's a tight timeline but I can make it work with a rush fee. Let's discuss the design today.", "Perfect. I'll come by this evening.", "See you then. I'll prepare some fabric options beforehand."],
  ["Payment has been made. Please confirm receipt.", "Payment confirmed! Thank you. I'll proceed with cutting the fabric today.", "Great, keep me updated on the progress.", "Will do. I'll send you photos at each stage so you can track the progress."],
  ["The finished pieces are beautiful! My whole family loves them.", "That makes me so happy! Thank you for trusting me with your Aso-Ebi collection.", "You're now our family tailor! We'll be back for every occasion.", "It would be my honour! Thank you for the wonderful review."],
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function slugify(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function cityState(city: string) { return { city, state: STATES[city] ?? city }; }

interface DemoAccountRow {
  Name: string; Email: string; Password: string; Role: string;
  Username: string; City: string; State: string;
  BusinessName: string; VerificationStatus: string;
}
const csvRows: DemoAccountRow[] = [];

function addCsvRow(name: string, email: string, password: string, role: string, city: string, state: string, businessName: string) {
  const verificationStatus = role === "DESIGNER" || role === "PRODUCER" ? (businessName ? "VERIFIED" : "PENDING") : "N/A";
  csvRows.push({ Name: name, Email: email, Password: password, Role: role,
    Username: email.split("@")[0], City: city, State: state,
    BusinessName: businessName, VerificationStatus: verificationStatus });
}

function writeCsv() {
  const headers = ["Name","Email","Password","Role","Username","City","State","BusinessName","VerificationStatus"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of csvRows) {
    lines.push(headers.map(h => esc(String((row as any)[h] ?? ""))).join(","));
  }
  const csvDir = path.resolve(process.cwd(), "artifacts/api-server");
  if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });
  fs.writeFileSync(path.join(csvDir, "demo_accounts.csv"), lines.join("\n"), "utf-8");
  console.log("  📄 CSV exported: artifacts/api-server/demo_accounts.csv");
}

async function main() {
  console.log(`🌱 Drape Demo Data Seeder v${SEED_VERSION}\n`);
  console.log("  Clearing existing demo data...");
  await db.delete(usersTable).where(sql`email LIKE ${`%@${DEMO_DOMAIN}`}`);
  csvRows.length = 0;

  const hashDesigner = await bcrypt.hash(PASSWORDS.DESIGNER, BCRYPT_ROUNDS);
  const hashClient = await bcrypt.hash(PASSWORDS.CLIENT, BCRYPT_ROUNDS);
  const hashAdmin = await bcrypt.hash(PASSWORDS.ADMIN, BCRYPT_ROUNDS);

  const designerIds: string[] = [];
  const clientIds: string[] = [];
  const orderIds: string[] = [];

  console.log("  Creating 100 designers...");
  for (let i = 0; i < 100; i++) {
    const name = `${DESIGNER_FIRST[i]} ${DESIGNER_LAST[i]}`;
    const username = `designer${String(i + 1).padStart(3, "0")}`;
    const email = `${username}@${DEMO_DOMAIN}`;
    const id = randomUUID(); designerIds.push(id);
    const bizName = BUSINESS_NAMES[i];
    const { city, state } = cityState(pick(CITIES));
    const exp = rand(2, 30);
    const specs: string[] = [];
    while (specs.length < rand(1, 4)) { const s = pick(SPECIALTIES); if (!specs.includes(s)) specs.push(s); }
    await db.insert(usersTable).values({
      id, email, name, role: "DESIGNER", passwordHash: hashDesigner, onboardingComplete: true,
    });
    await db.insert(profilesTable).values({
      userId: id, city, country: "Nigeria",
      bio: `Award-winning ${specs.slice(0,2).join(" and ")} specialist with ${exp}+ years of experience.`,
      phone: `+234${rand(700, 909)}${String(rand(100, 9999)).padStart(4,"0")}${String(rand(100, 9999)).padStart(4,"0")}`,
    });
    await db.insert(producerProfilesTable).values({
      userId: id, brandName: bizName, professionalName: name.split(" ")[0],
      bio: `Award-winning ${specs.slice(0,2).join(" and ")} specialist with ${exp}+ years of experience.`,
      location: `${city}, ${state}`, specialization: specs[0],
      specialties: specs, studioName: bizName,
      studioType: pick(["SOLO","STUDIO","ATELIER","BRAND"]) as any,
      experience: exp,
      portfolioDescription: `Explore the portfolio of ${bizName} — ${exp} years of excellence.`,
      portfolioUrls: [] as string[], priceMin: rand(15000, 80000), priceMax: rand(100000, 800000),
      website: `https://${slugify(bizName)}.drape.com`, instagram: slugify(bizName).slice(0,30),
      availability: pick(["available","busy","limited"]) as any,
    });
    addCsvRow(name, email, PASSWORDS.DESIGNER, "DESIGNER", city, state, bizName);
  }

  console.log("  Creating 60 clients...");
  for (let i = 0; i < 60; i++) {
    const name = `${CLIENT_FIRST[i]} ${CLIENT_LAST[i]}`;
    const username = `client${String(i + 1).padStart(3, "0")}`;
    const email = `${username}@${DEMO_DOMAIN}`;
    const id = randomUUID(); clientIds.push(id);
    const { city, state } = cityState(pick(CITIES));
    await db.insert(usersTable).values({
      id, email, name, role: "CLIENT", passwordHash: hashClient, onboardingComplete: true,
    });
    await db.insert(profilesTable).values({
      userId: id, city, country: "Nigeria",
      bio: `Fashion enthusiast based in ${city}, ${state}.`,
      phone: `+234${rand(700, 909)}${String(rand(100, 9999)).padStart(4,"0")}${String(rand(100, 9999)).padStart(4,"0")}`,
    });
    await db.insert(clientPreferencesTable).values({
      userId: id,
      stylePreferences: [pick(["Modern","Classic","Traditional","Minimalist","Avant-garde","Bohemian","Romantic","Edgy","Preppy","Glamorous"]), pick(["Ankara prints","Lace","Plain fabrics","Mixed patterns","Sustainable materials","Premium textiles"])],
      preferredColours: [pick(["Bold colours","Pastels","Neutrals","Jewel tones","Earth tones","Monochrome","Brights"])],
      budgetMin: rand(20000, 150000), budgetMax: rand(150000, 1500000),
    });
    addCsvRow(name, email, PASSWORDS.CLIENT, "CLIENT", city, state, "");
  }

  console.log("  Creating 10 admins...");
  const adminNames = ["Chioma Admin","Segun Admin","Fatima Admin","Emeka Admin","Ngozi Admin","Tunde Admin","Amara Admin","Kayode Admin","Zainab Admin","Chidi Admin"];
  const adminCities = ["Lagos","Abuja","Ibadan","Port Harcourt","Enugu","Kaduna","Calabar","Jos","Kano","Abeokuta"];
  for (let i = 0; i < 10; i++) {
    const username = `admin${String(i + 1).padStart(3, "0")}`;
    const email = `${username}@${DEMO_DOMAIN}`;
    const { city, state } = cityState(adminCities[i]);
    const id = `a0000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`;
    await db.insert(usersTable).values({
      id, email, name: adminNames[i], role: "ADMIN", passwordHash: hashAdmin, onboardingComplete: true,
    });
    await db.insert(profilesTable).values({ userId: id, city, country: "Nigeria" });
    await db.insert(adminProfilesTable).values({
      userId: id, permissions: ["manage_users","manage_ai","view_analytics","manage_system","manage_demo_accounts"],
    });
    addCsvRow(adminNames[i], email, PASSWORDS.ADMIN, "ADMIN", city, state, "Drape Admin");
  }

  console.log("  Creating 900 orders/projects...");
  for (let i = 0; i < 900; i++) {
    const oid = randomUUID(); orderIds.push(oid);
    await db.insert(ordersTable).values({
      id: oid, clientId: pick(clientIds), producerId: pick(designerIds),
      status: i < 500 ? pick(["COMPLETED","DELIVERED","COMPLETED","COMPLETED","DELIVERED"]) as any
        : i < 750 ? pick(["ENQUIRY","ACCEPTED","DEPOSIT_PAID","IN_PRODUCTION","FITTING","FINAL_PAYMENT"]) as any : "ENQUIRY",
      title: pick([`${pick(["Bridal","Evening","Corporate","Casual","Traditional","Wedding","Summer","Festive","Cocktail","Gala"])} ${pick(["Gown","Suit","Dress","Outfit","Ensemble","Agbada","Kaftan","Blazer","Two-Piece","Jumpsuit"])}`]),
      description: pick(["Custom made for a special occasion","Professional corporate wardrobe","Traditional wedding attire","Casual everyday luxury wear","Bespoke evening wear collection","Festive celebration outfit","Gala event ensemble"]),
      agreedPrice: rand(30000, 800000), currency: "NGN",
      depositPaid: Math.random() > 0.25, estimatedDays: rand(3, 45),
    });
  }

  console.log("  Creating 1,200 reviews...");
  for (let i = 0; i < 1200; i++) {
    const r = Math.random();
    await db.insert(reviewsTable).values({
      orderId: randomUUID(), clientId: pick(clientIds), designerId: pick(designerIds),
      rating: r < 0.78 ? rand(4,5) : r < 0.93 ? 3 : r < 0.99 ? 2 : 1,
      status: "APPROVED",
      title: pick(["Absolutely beautiful!","Highly recommended","Exceeded expectations","Great craftsmanship","Love my outfit!","Professional service","Stunning work","Perfect fit","Will order again","Exceptional quality","World class","Divine creation","Masterpiece","Pure elegance"]),
      comment: pick(["Absolutely stunning work!","Professional from start to finish.","Beautiful craftsmanship.","Highly recommended!","Excellent service and outstanding quality.","The fitting was flawless on the first try.","Great experience.","The unique design exceeded my expectations.","Professional, punctual, and extraordinarily creative.","Wonderful custom piece.","Good quality work overall.","Decent work for the price.","My wedding dress was absolutely perfect.","Exceptional craftsmanship on both the embroidery and beadwork.","Fast turnaround without any compromise on quality."]),
      imageUrls: [] as string[], helpfulCount: rand(0, 15),
    });
  }

  console.log("  Creating chat messages...");
  let msgIdx = 0;
  for (let m = 0; m < 150 && msgIdx < 2000; m++) {
    const conv = pick(MESSAGE_TEMPLATES);
    const orderId = pick(orderIds);
    for (const content of conv) {
      if (msgIdx >= 2000) break;
      await db.insert(orderMessagesTable).values({
        orderId, content, role: msgIdx % 2 === 0 ? "client" : "designer",
        createdAt: new Date(Date.now() - rand(1, 90) * 86400000),
      });
      msgIdx++;
    }
  }
  while (msgIdx < 2000) {
    await db.insert(orderMessagesTable).values({
      orderId: pick(orderIds), content: pick(["Excellent work!","Very professional.","Beautiful design.","Will order again.","Great communication.","Loved the fabric choices.","Perfect fit!","Amazing craftsmanship."]),
      role: pick(["client","designer"]),
      createdAt: new Date(Date.now() - rand(1, 90) * 86400000),
    });
    msgIdx++;
  }

  console.log("  Creating 300 bookings...");
  for (let i = 0; i < 300; i++) {
    const start = new Date(); start.setDate(start.getDate() + rand(-90, 120));
    const end = new Date(start); end.setHours(end.getHours() + rand(1, 3));
    await db.insert(bookingsTable).values({
      clientId: pick(clientIds), designerId: pick(designerIds),
      type: pick(["CONSULTATION","MEASUREMENTS","FITTING","STUDIO_VISIT","VIRTUAL_MEETING"]) as any,
      status: start < new Date() ? pick(["COMPLETED","CANCELLED","NO_SHOW","COMPLETED","COMPLETED"]) as any : pick(["PENDING","CONFIRMED","CONFIRMED"]) as any,
      title: pick(["Fitting session","Design consultation","Measurement appointment","Fabric selection","Final fitting","Style consultation","Progress review"]),
      startTime: start, endTime: end, timezone: "Africa/Lagos",
      isVirtual: Math.random() > 0.6,
    });
  }

  console.log("  Creating 400 notifications...");
  const notifTypes = ["ORDER_UPDATE","MESSAGE","BRIEF_READY","REVIEW_REQUEST","GENERAL","NEW_ORDER","ORDER_ACCEPTED","STATUS_UPDATED","MEASUREMENTS_SUBMITTED","PRODUCTION_GUIDE_READY","REVIEW_RECEIVED"] as const;
  const notifTitles = ["Project approved!","New message received","Booking confirmed","Payment received","Portfolio liked","Review received","Order status updated","New consultation request","Fitting reminder","Measurement ready"];
  for (let i = 0; i < 400; i++) {
    await db.insert(notificationsTable).values({
      userId: pick([...clientIds, ...designerIds.filter(() => Math.random() > 0.3)]),
      type: pick(notifTypes),
      title: pick(notifTitles),
      body: pick([`Your order is ${pick(["ready for fitting","in production","being designed","approved","completed"])}.`,`${pick(["Amara","Chidi","Fatima","Tunde","Chioma"])} sent you a message.`,`Your booking has been ${pick(["confirmed","rescheduled","cancelled"])}.`]),
      read: Math.random() > 0.35,
    });
  }

  console.log("  Creating 1,500+ portfolio items...");
  for (const did of designerIds) {
    const count = rand(8, 20);
    for (let j = 0; j < count; j++) {
      await db.insert(portfolioItemsTable).values({
        designerId: did,
        title: pick(["Elegant Evening Gown","Modern Agbada","Bridal Masterpiece","Corporate Blazer","Ankara Fusion Dress","Traditional Wedding Set","Casual Luxury","Statement Piece","Summer Collection","Couture Evening Wear","Kaftan Elegance","Aso-Ebi Special","Senator Classic","Lace Luxury Dress","Streetwear Collection","Executive Suit Set","Bohemian Maxi Dress","Heritage Ensemble","Runway Collection","Festive Glamour"]),
        description: pick(["Handcrafted with premium fabric. Features intricate embroidery and beadwork.","Modern take on traditional Nigerian fashion. Clean lines, bold patterns.","Bespoke piece made for a discerning client. Premium finish throughout.","Inspired by Nigerian heritage with a contemporary twist."]),
        category: pick(SPECIALTIES), tags: [pick(["luxury","traditional","modern","handmade","premium","bespoke","custom","unique","elegant","vibrant"])],
        imageUrls: [] as string[],
      });
    }
  }

  console.log("  Creating 25 suppliers...");
  for (let i = 0; i < 25; i++) {
    const c = pick(CITIES); const { city, state } = cityState(c);
    await db.insert(suppliersTable).values({
      userId: pick(designerIds), name: SUPPLIER_NAMES[i],
      contactName: `${pick(DESIGNER_FIRST)} ${pick(DESIGNER_LAST)}`,
      email: `${slugify(SUPPLIER_NAMES[i])}@drape-supplier.com`,
      phone: `+234${rand(700, 909)}${String(rand(100, 9999)).padStart(4,"0")}${String(rand(100, 9999)).padStart(4,"0")}`,
      address: `${rand(1, 100)} ${pick(["Fabric Avenue","Tailor Street","Market Road","Textile Lane","Fashion Drive","Creative Boulevard"])}, ${city}, ${state}`,
      productsSupplied: [pick(FABRIC_NAMES), pick(FABRIC_NAMES), pick(SPECIALTIES)].slice(0, rand(1,3)),
      leadTimeDays: rand(2, 21), rating: rand(3, 5),
      notes: pick(["Reliable supplier, consistent quality","Premium products, fast delivery","Good wholesale prices","Quality can vary, inspect before purchase","Excellent customer service"]),
      totalPurchases: rand(1, 20), outstandingAmount: rand(0, 200000),
    });
  }

  console.log("  Creating 300 invoices...");
  for (let i = 0; i < 300; i++) {
    const total = rand(50000, 600000);
    const status = pick(["PAID","PAID","PAID","DRAFT","SENT","OVERDUE","PAID","CANCELLED","PAID","PAID"]);
    await db.insert(invoicesTable).values({
      userId: pick(designerIds), clientId: pick(clientIds),
      invoiceNumber: `DEMO-INV-${String(i+1).padStart(5,"0")}`,
      status: status as any,
      items: [{ description: pick(["Design consultation fee","Bespoke tailoring service","Fabric sourcing & pattern making","Rush delivery fee","Fitting session & alterations","Complete outfit package"]), quantity: rand(1, 5), unitPrice: rand(15000, 150000), totalPrice: total }],
      subtotal: total, taxRate: "7.5", taxAmount: Math.round(total * 0.075),
      discount: Math.random() > 0.7 ? rand(5000, 50000) : 0,
      total: Math.round(total * 1.075), amountPaid: status === "PAID" ? total : 0,
      balanceDue: status === "PAID" ? 0 : total, currency: "NGN",
      clientName: pick(CLIENT_FIRST) + " " + pick(CLIENT_LAST),
    });
  }

  console.log("  Creating 500 expenses...");
  const expCats = ["FABRIC","TRANSPORT","LABOUR","UTILITIES","EQUIPMENT","MARKETING","RENT","SUPPLIES","SOFTWARE","INSURANCE","TAX","OTHER"] as const;
  for (let i = 0; i < 500; i++) {
    await db.insert(expensesTable).values({
      userId: pick(designerIds),
      description: pick([`Purchased ${pick(FABRIC_NAMES)} from ${pick(["Lagos Market","Abuja Textiles","Online Supplier","Kano Merchants","Enugu Craft Centre"])}`,`${pick(["Tailor","Seamstress","Assistant","Delivery driver"])} ${pick(["wages","overtime","transport allowance","bonus"])}`,`${pick(["Electricity","Water","Internet","Rent"])} ${pick(["monthly","quarterly","bi-annual"])}`]),
      category: pick(expCats), amount: rand(2000, 300000), currency: "NGN",
      taxDeductible: Math.random() > 0.3 ? "true" : "false",
      vendor: pick(SUPPLIER_NAMES),
    });
  }

  console.log("  Creating 300 inventory items...");
  const invCats = ["FABRIC","THREADS","BUTTONS","ZIPPERS","ACCESSORIES","PACKAGING","LABELS","EQUIPMENT"] as const;
  for (const did of designerIds.slice(0, 40)) {
    const count = rand(3, 12);
    for (let j = 0; j < count; j++) {
      const cat = pick(invCats);
      await db.insert(inventoryItemsTable).values({
        userId: did,
        name: cat === "FABRIC" ? pick(FABRIC_NAMES) : pick(["Polyester Thread","Cotton Thread","Gold Button","Pearl Button","Metal Zipper","Invisible Zipper","Satin Ribbon","Hook & Eye","Bias Tape","Elastic Band","Fusible Interfacing","Label Tags","Branded Tags","Packaging Boxes","Hangers","Mannequin Cover"]),
        category: cat as any, unit: "UNIT" as any, quantity: rand(5, 800),
        unitCost: rand(150, 60000), lowStockThreshold: rand(3, 25),
      });
    }
  }

  writeCsv();
  console.log("✅ Demo data seeded successfully!");
  console.log("  ─────────────────────────────────────────────");
  console.log("  100 designers, 60 clients, 10 admins");
  console.log("  900 projects, 1,200 reviews, 300 bookings");
  console.log("  400 notifications, 2,000 chat messages");
  console.log("  1,500+ portfolio items, 25 suppliers");
  console.log("  300 invoices, 500 expenses, 300 inventory items");
  console.log("  ─────────────────────────────────────────────");
  console.log("  All demo users: @drape.demo emails");
  console.log(`  Designer password: ${PASSWORDS.DESIGNER}`);
  console.log(`  Client password:   ${PASSWORDS.CLIENT}`);
  console.log(`  Admin password:    ${PASSWORDS.ADMIN}`);
  console.log("  CSV export: artifacts/api-server/demo_accounts.csv\n");
  process.exit(0);
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
