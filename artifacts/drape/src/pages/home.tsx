import { Link } from "wouter";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/shared/Navbar";
import { DesignerCard } from "@/components/marketplace/DesignerCard";
import { MOCK_DESIGNERS } from "@/data/designers";
import {
  ArrowRight, Sparkles, MessageCircle, Image, CheckCircle2,
  FileText, Ruler, Send, Star, Scissors, Palette, Users,
  Shield, Zap, Globe, Quote,
} from "lucide-react";

const FEATURED = MOCK_DESIGNERS.filter((d) => d.verified).slice(0, 3);

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: MessageCircle,
    title: "Describe your vision",
    desc: "Chat with Aria, our AI style consultant. Tell her the occasion, the colours, the fabrics — in your own words.",
  },
  {
    step: "02",
    icon: FileText,
    title: "Aria builds your brief",
    desc: "As you talk, Aria extracts every detail into a structured brief — occasion, aesthetic, silhouette, budget, and timeline.",
  },
  {
    step: "03",
    icon: Image,
    title: "See your concept",
    desc: "Aria generates visual concepts tailored to your brief. Browse, compare, and select the one that captures your vision.",
  },
  {
    step: "04",
    icon: CheckCircle2,
    title: "Review and confirm",
    desc: "Read back your complete brief. Request changes if needed. Confirm only when every detail is exactly right.",
  },
  {
    step: "05",
    icon: Ruler,
    title: "Designer receives everything",
    desc: "The designer gets your confirmed brief, selected concept, measurements, and all your notes — no ambiguity.",
  },
  {
    step: "06",
    icon: Scissors,
    title: "Your garment is made",
    desc: "Your designer brings your vision to life. Track progress, communicate directly, and receive something singular.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Drape completely transformed how I find and work with fashion designers. The AI brief builder saved me hours of back-and-forth.",
    name: "Amara O.",
    role: "Client, Lagos",
    rating: 5,
  },
  {
    quote: "As a designer, Drape gives me everything I need to run my business — from client acquisition to production management.",
    name: "Chidi E.",
    role: "Designer, Abuja",
    rating: 5,
  },
  {
    quote: "The quality of designers on Drape is exceptional. My wedding gown was beyond anything I could have imagined.",
    name: "Yetunde A.",
    role: "Client, Ibadan",
    rating: 5,
  },
];

const STATS = [
  { value: "80+", label: "Fashion Designers" },
  { value: "550+", label: "Completed Projects" },
  { value: "40+", label: "Cities in Nigeria" },
  { value: "98%", label: "Satisfaction Rate" },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero Section ── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-secondary/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[96px] pointer-events-none" />

        <div className="max-w-app relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8 animate-fade-in-up">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Fashion Marketplace
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl text-foreground font-bold leading-[1.05] tracking-tight mb-6 animate-fade-in-up stagger-1">
              Where Vision Meets
              <span className="text-gradient block mt-1">Craftsmanship</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up stagger-2">
              Nigeria's premier platform connecting you with exceptional fashion designers.
              Describe your vision once — our AI handles the rest.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-3">
              {user ? (
                <Link href="/marketplace">
                  <Button size="lg" className="rounded-full h-12 px-8 text-sm gap-2">
                    Browse Designers <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="rounded-full h-12 px-8 text-sm gap-2">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-sm">
                      Browse Designers
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Social proof */}
            <div className="mt-12 sm:mt-16 flex items-center justify-center gap-8 sm:gap-12 animate-fade-in-up stagger-4">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl sm:text-3xl font-serif text-foreground font-bold">{s.value}</span>
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Designers ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-app">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight">Featured Designers</h2>
              <p className="text-muted-foreground mt-2">Hand-picked talents ready to bring your vision to life</p>
            </div>
            <Link href="/marketplace" className="hidden sm:flex items-center gap-1.5 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED.map((d) => (
              <DesignerCard key={d.id} designer={d} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/marketplace">
              <Button variant="ghost" className="rounded-full text-sm gap-2">
                View all designers <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
        <div className="max-w-app">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
              From idea to outfit, effortlessly
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Six simple steps. AI handles the complexity. You enjoy the experience.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">Step {item.step}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-app">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-6">
                <Zap className="h-3 w-3" /> AI-Powered
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight mb-4">
                Meet Aria — Your AI Style Consultant
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                No more endless emails or confusing briefs. Aria asks the right questions,
                understands your style, and generates a complete fashion brief automatically.
              </p>
              <ul className="space-y-3">
                {[
                  "Natural conversation — just describe what you want",
                  "AI extracts every detail into a structured brief",
                  "Visual concepts generated from your description",
                  "Seamlessly forward to your chosen designer",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-border p-8 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm italic">"I need a stunning ankara dress for a wedding in Lagos next month..."</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs text-primary font-mono">Aria is listening...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
        <div className="max-w-app">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
              Loved by designers and clients
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Hear from the Drape community
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card-premium p-6">
                <Quote className="h-6 w-6 text-primary/30 mb-4" />
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <div className="ml-auto flex">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-app">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5 border border-border p-12 sm:p-20 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[96px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight mb-4">
                Ready to create something extraordinary?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join Nigeria's fastest-growing fashion marketplace. Whether you're a designer or a client, Drape is where fashion happens.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {user ? (
                  <Link href="/marketplace">
                    <Button size="lg" className="rounded-full h-12 px-8 gap-2">
                      Start Exploring <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="rounded-full h-12 px-8 gap-2">
                        Get Started Free <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/marketplace">
                      <Button variant="outline" size="lg" className="rounded-full h-12 px-8">
                        Browse Marketplace
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-12">
        <div className="max-w-app">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="font-serif text-xl text-primary font-bold">Drape</span>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs">
                Nigeria's premier AI-powered fashion marketplace connecting clients with exceptional designers.
              </p>
            </div>
            {[
              { title: "Platform", links: ["Marketplace", "How it Works", "AI Studio", "Pricing"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Support", links: ["Help Center", "Terms of Service", "Privacy Policy", "FAQ"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 Drape. All rights reserved.</p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span className="text-xs">Nigeria</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
