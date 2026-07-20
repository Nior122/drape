import { useParams, Link } from "wouter";
import { Navbar } from "@/components/shared/Navbar";
import { getDesignerBySlug } from "@/data/designers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, BadgeCheck, ArrowLeft, MessageCircle, Sparkles, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";

function formatBudget(min: number, max: number, currency: string) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  return `${fmt(min)} – ${fmt(max)}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="font-serif text-4xl text-foreground mb-3">Designer not found</h1>
        <p className="text-muted-foreground mb-6">This storefront doesn't exist or may have moved.</p>
        <Link href="/marketplace">
          <Button className="rounded-full">Browse Designers</Button>
        </Link>
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  const designer = getDesignerBySlug(params.slug);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"portfolio" | "reviews">("portfolio");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!designer) return;
    const prev = document.title;
    document.title = `${designer.name} — Bespoke ${designer.specialties[0] ?? "Fashion"} Designer · Drape`;

    const descMeta = document.querySelector('meta[name="description"]');
    const prevDesc = descMeta?.getAttribute("content") ?? "";
    descMeta?.setAttribute("content", `${designer.tagline} — Commission a bespoke piece from ${designer.name} on Drape.`);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    ogTitle?.setAttribute("content", `${designer.name} · Drape`);
    ogDesc?.setAttribute("content", `${designer.tagline} — Commission a bespoke piece on Drape.`);

    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.id = "storefront-schema";
    jsonLd.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: designer.name,
      description: designer.description,
      image: designer.coverImageUrl,
      address: { "@type": "PostalAddress", addressLocality: designer.city, addressCountry: designer.country },
      aggregateRating: designer.reviewCount > 0
        ? { "@type": "AggregateRating", ratingValue: designer.avgRating, reviewCount: designer.reviewCount }
        : undefined,
    });
    document.head.appendChild(jsonLd);

    return () => {
      document.title = prev;
      descMeta?.setAttribute("content", prevDesc);
      ogTitle?.setAttribute("content", "Drape — Bespoke Fashion Marketplace");
      ogDesc?.setAttribute("content", "Drape connects discerning clients with talented tailors and designers for fully custom-made clothing and accessories.");
      document.getElementById("storefront-schema")?.remove();
    };
  }, [designer]);

  if (!designer) return <NotFound />;

  const whatsappUrl = designer.whatsapp
    ? `https://wa.me/${designer.whatsapp.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(designer.name)}%2C%20I%20found%20you%20on%20Drape%20and%20I%27d%20love%20to%20discuss%20a%20commission.`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Portfolio"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="pt-16">
        {/* Cover image */}
        <div className="relative h-64 md:h-80 overflow-hidden bg-muted">
          <img
            src={designer.coverImageUrl}
            alt={designer.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* Back button */}
          <div className="absolute top-6 left-4 md:left-8">
            <Link href="/marketplace">
              <button className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                <ArrowLeft size={14} />
                Back
              </button>
            </Link>
          </div>
        </div>

        {/* Profile section */}
        <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            {/* Avatar + identity */}
            <div className="flex items-end gap-4">
              <div className="relative shrink-0">
                <img
                  src={designer.avatarUrl}
                  alt={designer.name}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover ring-4 ring-background border border-card-border"
                />
                {designer.verified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-card-border flex items-center justify-center">
                    <BadgeCheck size={16} className="text-primary fill-primary/20" />
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif text-2xl md:text-3xl text-foreground">{designer.name}</h1>
                  {designer.verified && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary uppercase tracking-widest px-2">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="font-serif italic text-muted-foreground mt-0.5">{designer.tagline}</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-2 md:pb-1">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="rounded-full border-border/50 gap-2 text-sm hover:border-green-500/40 hover:text-green-400"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </Button>
                </a>
              )}
              <Link href={user ? `/design/${designer.slug}` : "/signup"}>
                <Button className="rounded-full gap-2 text-sm shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] transition-shadow font-medium">
                  <Sparkles size={15} />
                  Start an AI Brief
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 p-5 bg-card border border-card-border rounded-2xl">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <StarRating rating={designer.avgRating} />
                <span className="text-sm font-medium text-foreground">{designer.avgRating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-muted-foreground">{designer.reviewCount} reviews</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <MapPin size={13} className="text-muted-foreground" />
                {designer.city}
              </span>
              <span className="text-xs text-muted-foreground">{designer.country}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Clock size={13} className="text-muted-foreground" />
                {designer.turnaroundDays} days
              </span>
              <span className="text-xs text-muted-foreground">Avg. turnaround</span>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {formatBudget(designer.minBudget, designer.maxBudget, designer.currency)}
              </span>
              <span className="text-xs text-muted-foreground">Budget range</span>
            </div>
          </div>

          {/* Bio + specialties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="md:col-span-2">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">About</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">{designer.description}</p>
              {designer.instagram && (
                <a
                  href={`https://instagram.com/${designer.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {designer.instagram}
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {designer.specialties.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mt-6 mb-3">Pricing</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Starting from</span>
                  <span className="text-foreground font-medium">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: designer.currency, maximumFractionDigits: 0 }).format(designer.minBudget)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Up to</span>
                  <span className="text-foreground font-medium">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: designer.currency, maximumFractionDigits: 0 }).format(designer.maxBudget)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border/30 mb-8">
            <div className="flex gap-6">
              {(["portfolio", "reviews"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {tab === "reviews" && (
                    <span className="ml-2 text-xs text-muted-foreground">({designer.reviews.length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio grid */}
          {activeTab === "portfolio" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-16">
              {designer.portfolio.map((item) => (
                <button
                  key={item.id}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setSelectedImage(item.imageUrl)}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-xs font-medium text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">{item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Reviews */}
          {activeTab === "reviews" && (
            <div className="space-y-4 mb-16">
              {designer.reviews.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">No reviews yet.</p>
                </div>
              ) : (
                designer.reviews.map((r) => (
                  <div key={r.id} className="p-5 bg-card border border-card-border rounded-2xl">
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={r.clientAvatarUrl}
                        alt={r.clientName}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{r.clientName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={r.rating} />
                          <span className="text-xs text-muted-foreground">· {r.orderTitle}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed italic">"{r.comment}"</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sticky CTA banner */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/95 backdrop-blur-xl px-4 pt-3 pb-safe-or-3 md:hidden">
            <div className="flex gap-2 max-w-lg mx-auto">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl border-border/50 gap-2 text-sm">
                    <MessageCircle size={15} />
                    WhatsApp
                  </Button>
                </a>
              )}
              <Link href={user ? `/design/${designer.slug}` : "/signup"} className="flex-1">
                <Button className="w-full rounded-xl gap-2 text-sm font-medium">
                  <Sparkles size={15} />
                  AI Brief
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
