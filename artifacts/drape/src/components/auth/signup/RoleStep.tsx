import { type SignupInputRole } from "@workspace/api-client-react";
import { User, Scissors } from "lucide-react";

interface RoleStepProps {
  onSelect: (role: SignupInputRole) => void;
}

export function RoleStep({ onSelect }: RoleStepProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <button
        onClick={() => onSelect("CLIENT")}
        className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl hover:border-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(201,168,76,0.15)] group"
      >
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium mb-2 font-serif">I'm looking for a designer</h3>
        <p className="text-sm text-muted-foreground text-center">
          Commission bespoke pieces and browse the marketplace.
        </p>
      </button>

      <button
        onClick={() => onSelect("PRODUCER")}
        className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl hover:border-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(201,168,76,0.15)] group"
      >
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
          <Scissors className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium mb-2 font-serif">I'm a designer / tailor</h3>
        <p className="text-sm text-muted-foreground text-center">
          Showcase your portfolio and receive custom commissions.
        </p>
      </button>
    </div>
  );
}
