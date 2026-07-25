import { type SignupInputRole } from "@workspace/api-client-react";
import { User, Scissors, Sparkles } from "lucide-react";

interface RoleStepProps {
  onSelect: (role: SignupInputRole) => void;
}

export function RoleStep({ onSelect }: RoleStepProps) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* ── Client Card ── */}
      <button
        onClick={() => onSelect("CLIENT")}
        className="group relative flex flex-col items-center gap-5 p-8 bg-card border border-border rounded-2xl
                   hover:border-primary/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]
                   transition-all duration-300 text-left"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10
                        flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <User className="w-8 h-8 text-orange-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-serif font-medium mb-1.5 text-foreground">I'm looking for a designer</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Commission bespoke pieces from talented fashion designers.
            Chat with Aria, our AI stylist, to create your perfect brief.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-orange-400/70 group-hover:text-orange-400 transition-colors">
          <Sparkles className="w-3 h-3" />
          <span>Browse marketplace &middot; AI fashion assistant &middot; Order tracking</span>
        </div>
      </button>

      {/* ── Designer Card ── */}
      <button
        onClick={() => onSelect("DESIGNER")}
        className="group relative flex flex-col items-center gap-5 p-8 bg-card border border-border rounded-2xl
                   hover:border-primary/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]
                   transition-all duration-300 text-left"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10
                        flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Scissors className="w-8 h-8 text-orange-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-serif font-medium mb-1.5 text-foreground">I'm a fashion designer</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Showcase your portfolio, receive commissions, and manage your
            fashion business with AI-powered tools.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-orange-400/70 group-hover:text-orange-400 transition-colors">
          <Sparkles className="w-3 h-3" />
          <span>AI Studio &middot; Client management &middot; Production guides</span>
        </div>
      </button>
    </div>
  );
}
