import { Link } from "wouter";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/shared/Navbar";
import { DesignerCard } from "@/components/marketplace/DesignerCard";
import { MOCK_DESIGNERS } from "@/data/designers";
import {
  ArrowRight, Sparkles, MessageCircle, Image, CheckCircle2,
  FileText, Ruler, Send, Star, Scissors, Palette,
} from "lucide-react";

const FEATURED = MOCK_DESIGNERS.filter((d) => d.verified).slice(0, 3);

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: MessageCircle,
    title: "Describe your vision",
    desc: "Chat with Aria, our AI style consultant. Tell her the occasion, the feeling, the colours, the fabrics — in your own words.",
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

const DESIGNER_RECEIVES = [
  { icon: FileText,     label: "Complete style brief",      desc: "Occasion, aesthetic, fabrics, silhouette, budget, and timeline in a structured document" },
  { icon: Image,        label: "Selected visual concept",   desc: "The AI-generated image you approved — a reference the designer can work directly from" },
  { icon: Ruler,        label: "Body measurements",         desc: "Your saved measurements, unit-converted and ready for pattern making" },
  { icon: MessageCircle, label: "Your exact words",          desc: "The full conversation transcript, so designers understand your intent not just your spec" },
  { icon: Palette,      label: "Colour references",         desc: "Hex codes and descriptive colour palette you described" },
  { icon: Send,         label: "Direct contact",            desc: "Your preferred contact method for the designer to reach you immediately" },
];

const WHY_IT_WORKS = [
  {
    number: "01",
    heading: "No more lost-in-translation moments",
    body: "When you say \"something elegant for an evening wedding,\" Aria asks the right follow-up questions until your vision is unambiguous. Designers receive precision, not guesswork.",
  },
  {
    number: "02",
    heading: "You approve before the designer sees it",
    body: "Nothing is sent until you read the complete brief, review your selected concept, and click confirm. You're in control at every stage.",
  },
  {
    number: "03",
    heading: "Designers quote confidently",
    body: "A complete brief means a designer can give you an accurate quote on day one — no back-and-forth, no surprises mid-production.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I told Aria I wanted something that felt like a midnight garden, and she turned that into the most precise brief I've ever seen. My designer knew exactly what to make.",
    name: "Adaeze O.",
    role: "Client, Lagos",
    rating: 5,
  },
  {
    quote: "As a designer, receiving a Drape brief is a completely different experience. I get the reference image, measurements, and a clear spec. I can quote and start on day one.",
    name: "Kemi Fashola",
    role: "Designer, Abuja",
    rating: 5,
  },
  {
    quote: "I used to spend hours on WhatsApp trying to explain what I wanted. Now I just describe it to Aria and my designer receives a professional brief. Game changer.",
    name: "Tunde A.",
    role: "Client, Port Harcourt",
    rating: 5,
  },
];

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} size={11} className="fill-primary text-primary" />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[130px]" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs tracking-[0.2em] uppercase">
            <Sparkles size={11} className="animate-pulse" />
            AI-Powered Fashion Communication
          </div>

          <h1 className="font-serif text-[clamp(2.8rem,8vw,5.5rem)] leading-[1.05] tracking-tight font-medium text-foreground mb-5">
            Describe Your Dream Outfit.
            <br />
            <span className="text-primary italic">We Handle the Rest.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            Chat with our AI style consultant. She turns your vision into a precise brief your designer can actually work from — with concepts, measurements, and no ambiguity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/marketplace">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 font-medium tracking-wide shadow-[0_0_30px_rgba(201,168,76,0.25)] hover:shadow-[0_0_40px_rgba(201,168,76,0.35)] transition-shadow"
              >
                <Sparkles size={15} className="mr-2" />
                Start Your Design Brief
              </Button>
            </Link>
            {!user && (
              <Link href="/signup?producer=true">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 h-12 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                >
                  Apply as a Designer
                </Button>
              </Link>
            )}
          </div>

          {/* Animated workflow preview */}
          <div className="mt-16 flex items-center justify-center gap-0 overflow-x-auto pb-2">
            {["Describe", "Brief built", "Concepts", "Select", "Confirm", "Designer"].map((label, i) => (
              <div key={i} className="flex items-center shrink-0">
                <div className={`flex flex-col items-center gap-1.5 px-2 md:px-3`}>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all
                    ${i < 2 ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/4 border-white/10 text-white/30"}`}>
                    {i + 1}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider whitespace-nowrap ${i < 2 ? "text-primary/70" : "text-white/20"}`}>
                    {label}
                  </span>
                </div>
                {i < 5 && (
                  <div className="w-6 md:w-8 h-px bg-gradient-to-r from-primary/20 to-white/8 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-serif text-foreground">200+</span>
              <span className="uppercase tracking-widest text-[10px]">Designers</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-serif text-foreground">40+</span>
              <span className="uppercase tracking-widest text-[10px]">Cities</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-serif text-foreground">4.9★</span>
              <span className="uppercase tracking-widest text-[10px]">Avg Rating</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-muted-foreground/40" />
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-28 px-4 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">The process</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">From Idea to Garment</h2>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              Six steps that turn a vague vision into a brief your designer can actually work from.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="p-6 bg-card border border-card-border rounded-2xl hover:border-primary/20 transition-colors group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <step.icon size={16} className="text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tracking-widest">{step.step}</span>
                </div>
                <h3 className="font-serif text-base text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Designers Receive ── */}
      <section className="py-28 px-4 bg-card/30 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">The complete package</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">What Your Designer Receives</h2>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              Not a vague description. A complete, structured brief — everything a designer needs to quote accurately and start immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DESIGNER_RECEIVES.map((item, i) => (
              <div key={i} className="flex gap-4 p-5 bg-card border border-card-border rounded-2xl hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon size={15} className="text-primary/80" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why This Works ── */}
      <section className="py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">The difference</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">Why This Changes Everything</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WHY_IT_WORKS.map((item, i) => (
              <div key={i} className="flex flex-col gap-4">
                <span className="font-serif text-5xl text-primary/20">{item.number}</span>
                <h3 className="font-serif text-xl text-foreground leading-snug">{item.heading}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Experiences</p>
            <h2 className="font-serif text-2xl md:text-3xl text-foreground">Clients and Designers Agree</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 bg-card border border-card-border rounded-2xl flex flex-col gap-4">
                <StarRating n={t.rating} />
                <blockquote className="text-sm text-foreground/80 leading-relaxed italic flex-1">"{t.quote}"</blockquote>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Designers ── */}
      <section className="py-24 px-4 border-t border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Curated for you</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Featured Designers</h2>
            </div>
            <Link
              href="/marketplace"
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED.map((d) => (
              <DesignerCard key={d.id} designer={d} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link href="/marketplace">
              <Button variant="outline" className="rounded-full border-border/50">
                View all designers
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 border-t border-border/30">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl border border-primary/10 bg-primary/5 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[80px]" />
            </div>
            <div className="relative z-10">
              <Sparkles className="mx-auto mb-5 text-primary w-8 h-8" />
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                Ready to describe your perfect outfit?
              </h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Join Drape. Describe your vision to Aria, choose a designer, and receive something made only for you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href={user ? "/marketplace" : "/signup"}>
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-12 font-medium shadow-[0_0_30px_rgba(201,168,76,0.3)]"
                  >
                    {user ? "Browse Designers" : "Create Your Account"}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
                {!user && (
                  <Link href="/marketplace">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="rounded-full px-8 h-12 text-muted-foreground hover:text-foreground"
                    >
                      Browse first
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="font-serif text-lg text-primary">Drape</span>
          <p>© {new Date().getFullYear()} Drape. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/marketplace" className="hover:text-foreground transition-colors">Designers</Link>
            <Link href="/signup?producer=true" className="hover:text-foreground transition-colors">For Designers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
