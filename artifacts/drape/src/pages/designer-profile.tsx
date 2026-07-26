import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, MapPin, Clock, BadgeCheck, ArrowLeft, MessageCircle, Sparkles,
  ExternalLink, Calendar, Share2, Heart, Shield, Award, BookOpen,
  ChevronDown, ChevronUp, Facebook, Linkedin, Instagram, Mail,
  CheckCircle, Users, Briefcase, Ruler, Scissors, Palette,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

function formatPrice(min: number | null, max: number | null, currency = "NGN") {
  if (!min && !max) return "Contact for pricing";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size}
          className={s <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

function ShareMenu({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const shares = [
    { name: "Facebook", href: `https://facebook.com/sharer.php?u=${encodedUrl}`, icon: Facebook },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, icon: MessageCircle },
    { name: "LinkedIn", href: `https://linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: Linkedin },
    { name: "X (Twitter)", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, icon: MessageCircle }, // placeholder
    { name: "Pinterest", href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`, icon: Palette },
  ];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-card-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-card-border rounded-xl shadow-2xl p-2 z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
          {shares.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setOpen(false)}>
              <s.icon className="h-4 w-4" /> {s.name}
            </a>
          ))}
          <button onClick={() => { navigator.clipboard?.writeText(url); setOpen(false); }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Link className="h-4 w-4" /> Copy Link
          </button>
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="font-serif text-4xl text-foreground mb-3">Designer not found</h1>
        <p className="text-muted-foreground mb-6">This designer hasn't set up their public profile yet.</p>
        <Link href="/marketplace"><Button className="rounded-full">Browse Designers</Button></Link>
      </div>
    </div>
  );
}

export default function PublicDesignerProfile() {
  const params = useParams<{ idOrSlug: string }>();
  const { user } = useAuth();
  const [designer, setDesigner] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [seo, setSeo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"portfolio" | "reviews" | "about">("portfolio");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/marketplace/designers/${params.idOrSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.designer) { setDesigner(null); return; }
        setDesigner(data.designer);
        setPortfolio(data.portfolio || []);
        setReviews(data.reviews || []);
        setStats(data.stats);
        setSeo(data.seo);
        document.title = data.seo?.title || `${data.designer.name} · Drape`;
      })
      .catch(() => setDesigner(null))
      .finally(() => setLoading(false));
  }, [params.idOrSlug]);

  // Check if saved
  useEffect(() => {
    if (!user || !designer) return;
    fetch(`${API_BASE}/api/marketplace/saved-designers`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const isSaved = (data.savedDesigners || []).some((s: any) => s.designerId === designer.id);
        setSaved(isSaved);
      })
      .catch(() => {});
  }, [user, designer]);

  // Use existing slug or compute it
  const profileUrl = designer ? `${window.location.origin}/designer/${designer.slug || params.idOrSlug}` : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-20 h-20 rounded-full bg-muted mx-auto" />
          <div className="h-6 w-48 bg-muted rounded mx-auto" />
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!designer) return <NotFound />;

  const allImages = [
    ...(designer.portfolioUrls || []),
    ...(portfolio || []).flatMap((p: any) => p.imageUrls || []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── SEO Metadata ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: designer.brandName || designer.name,
          description: designer.bio?.slice(0, 200),
          image: allImages[0] || null,
          address: designer.location ? { "@type": "PostalAddress", addressLocality: designer.location } : undefined,
          aggregateRating: stats?.reviewCount > 0
            ? { "@type": "AggregateRating", ratingValue: stats.avgRating, reviewCount: stats.reviewCount }
            : undefined,
          url: profileUrl,
        }),
      }} />

      {/* ── Top nav ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Browse designers
          </Link>
          <div className="flex items-center gap-2">
            <ShareMenu url={profileUrl} title={designer.brandName || designer.name} />
          </div>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <div className="relative h-64 sm:h-80 md:h-96 bg-muted overflow-hidden">
        {allImages[0] ? (
          <img src={allImages[0]} alt={designer.name}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      {/* ── Profile header ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-24 relative z-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          {designer.avatar ? (
            <img src={designer.avatar} alt={designer.name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover ring-4 ring-background shadow-xl" />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-card ring-4 ring-background shadow-xl flex items-center justify-center text-3xl text-muted-foreground font-serif">
              {designer.name?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-4 sm:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight">
                {designer.brandName || designer.name}
              </h1>
              {designer.experience && designer.experience >= 5 && (
                <Badge variant="outline" className="w-fit gap-1 text-primary border-primary/30">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground mt-1">
              {designer.specialization || (designer.specialties?.[0] ?? "Fashion Designer")}
              {designer.location && <span> · {designer.location}</span>}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
              {stats && (
                <span className="flex items-center gap-1.5">
                  <StarRating rating={stats.avgRating} size={14} />
                  <span className="text-foreground font-medium">{stats.avgRating.toFixed(1)}</span>
                  <span>({stats.reviewCount} reviews)</span>
                </span>
              )}
              {designer.experience && (
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {designer.experience} years exp.</span>
              )}
              {stats?.bookingCount > 0 && (
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {stats.bookingCount} bookings</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setSaved(!saved)}
              className={`p-3 rounded-xl border transition-colors ${saved ? "border-primary/50 bg-primary/5 text-primary" : "border-card-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
              <Heart className={`h-4 w-4 ${saved ? "fill-primary" : ""}`} />
            </button>
            <Link href={user ? `/design/${designer.slug || params.idOrSlug}` : `/login?redirect=/design/${designer.slug || params.idOrSlug}`}>
              <Button className="rounded-xl gap-2 h-11">
                <Sparkles className="h-4 w-4" /> Start a Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left column: tabs content ── */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-border mb-6">
              {(["portfolio", "reviews", "about"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                    activeTab === tab ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Portfolio */}
            {activeTab === "portfolio" && (
              <div>
                {allImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {allImages.map((url: string, i: number) => (
                      <button key={i} onClick={() => setSelectedImage(url)}
                        className="aspect-[3/4] rounded-xl overflow-hidden bg-muted group cursor-pointer">
                        <img src={url} alt={`Portfolio ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : designer.portfolioDescription ? (
                  <div className="bg-card border border-card-border rounded-2xl p-6">
                    <p className="text-muted-foreground">{designer.portfolioDescription}</p>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Portfolio coming soon</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <div>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="bg-card border border-card-border rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          {r.clientAvatar ? (
                            <img src={r.clientAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              {r.clientName?.[0] || "C"}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.clientName || "Client"}</p>
                            <StarRating rating={r.rating} size={11} />
                          </div>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {r.title && <p className="font-medium text-sm text-foreground mb-1">{r.title}</p>}
                        {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                        {r.imageUrls?.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {r.imageUrls.map((u: string, i: number) => (
                              <img key={i} src={u} alt="" className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
                            ))}
                          </div>
                        )}
                        {r.designerReply && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/30">
                            <p className="text-xs text-muted-foreground mb-1">Designer response:</p>
                            <p className="text-sm text-foreground">{r.designerReply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No reviews yet. Be the first!</p>
                  </div>
                )}
              </div>
            )}

            {/* About */}
            {activeTab === "about" && (
              <div className="space-y-6">
                {designer.bio && (
                  <div className="bg-card border border-card-border rounded-2xl p-6">
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{designer.bio}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {designer.specialties?.length > 0 && (
                    <div className="bg-card border border-card-border rounded-2xl p-5">
                      <h3 className="text-sm font-medium text-foreground mb-3">Specialties</h3>
                      <div className="flex flex-wrap gap-2">
                        {designer.specialties.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {designer.studioName && (
                    <div className="bg-card border border-card-border rounded-2xl p-5">
                      <h3 className="text-sm font-medium text-foreground mb-1">Studio</h3>
                      <p className="text-muted-foreground text-sm">{designer.studioName}</p>
                      {designer.studioType && <p className="text-xs text-muted-foreground mt-1 capitalize">{designer.studioType.toLowerCase()}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* Pricing card */}
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <h3 className="font-medium text-foreground mb-2">Pricing</h3>
              <p className="text-2xl font-serif text-foreground">
                {formatPrice(designer.priceMin, designer.priceMax, designer.currency)}
              </p>
              {(designer.priceMin || designer.priceMax) && (
                <p className="text-xs text-muted-foreground mt-1">per piece</p>
              )}
            </div>

            {/* Quick info */}
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
              {designer.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{designer.location}</span>
                </div>
              )}
              {designer.experience && (
                <div className="flex items-center gap-3 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{designer.experience} years experience</span>
                </div>
              )}
              {designer.website && (
                <a href={designer.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Website
                </a>
              )}
              {designer.instagram && (
                <a href={`https://instagram.com/${designer.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-primary hover:underline">
                  <Instagram className="h-4 w-4 shrink-0" />
                  @{designer.instagram}
                </a>
              )}
            </div>

            {/* Skills */}
            {designer.specialties?.length > 0 && (
              <div className="bg-card border border-card-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-foreground mb-3">Expertise</h3>
                <div className="flex flex-wrap gap-1.5">
                  {designer.specialties.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <Link href={user ? `/design/${designer.slug || params.idOrSlug}` : `/login?redirect=/design/${designer.slug || params.idOrSlug}`}>
              <Button className="w-full rounded-xl h-12 gap-2">
                <MessageCircle className="h-4 w-4" /> Book a Consultation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Image lightbox ── */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
          <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.409 2.409M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
    </svg>
  );
}
