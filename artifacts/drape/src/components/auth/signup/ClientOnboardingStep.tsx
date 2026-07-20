import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSaveClientOnboarding } from "@workspace/api-client-react";
import { useAuth } from "../../../context/auth";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

const PRESET_STYLES = [
  "Minimalist", "Maximalist", "Streetwear", "Formal", "Bohemian", 
  "Avant-garde", "Classic", "Romantic", "Athleisure", "Vintage"
];

const clientOnboardingSchema = z.object({
  stylePreferences: z.array(z.string()),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  styleNote: z.string().optional(),
});

type ClientOnboardingValues = z.infer<typeof clientOnboardingSchema>;

interface ClientOnboardingStepProps {
  onComplete: () => void;
}

export function ClientOnboardingStep({ onComplete }: ClientOnboardingStepProps) {
  const { toast } = useToast();
  const { refetchUser } = useAuth();
  const saveMutation = useSaveClientOnboarding();

  const form = useForm<ClientOnboardingValues>({
    resolver: zodResolver(clientOnboardingSchema),
    defaultValues: {
      stylePreferences: [],
      budgetMin: 500,
      budgetMax: 5000,
      styleNote: "",
    },
  });

  const onSubmit = async (data: ClientOnboardingValues) => {
    try {
      await saveMutation.mutateAsync({
        data,
      });
      await refetchUser();
      onComplete();
    } catch (error) {
      toast({
        title: "Error saving preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = async () => {
    try {
      await saveMutation.mutateAsync({ data: {} });
      await refetchUser();
      onComplete();
    } catch {
      // Non-critical skip — navigate anyway
      onComplete();
    }
  };

  const selectedStyles = form.watch("stylePreferences");

  const toggleStyle = (style: string) => {
    const current = new Set(selectedStyles);
    if (current.has(style)) {
      current.delete(style);
    } else {
      current.add(style);
    }
    form.setValue("stylePreferences", Array.from(current), { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <FormField
          control={form.control}
          name="stylePreferences"
          render={() => (
            <FormItem>
              <FormLabel>Style Preferences</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_STYLES.map((style) => {
                  const isSelected = selectedStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-transparent border-border hover:border-primary text-foreground"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <label className="text-sm font-medium leading-none">Budget Range (USD)</label>
          <div className="flex justify-between text-sm text-muted-foreground font-mono">
            <span>${form.watch("budgetMin")}</span>
            <span>${form.watch("budgetMax")}</span>
          </div>
          <Slider
            min={0}
            max={20000}
            step={100}
            value={[form.watch("budgetMin"), form.watch("budgetMax")]}
            onValueChange={([min, max]) => {
              form.setValue("budgetMin", min);
              form.setValue("budgetMax", max);
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="styleNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Style Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell designers about your unique requirements, body type, or inspirations..." 
                  className="resize-none h-32"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Complete Setup"}
          </Button>
          <Button type="button" variant="outline" onClick={handleSkip} className="flex-1 sm:flex-none">
            Skip for now
          </Button>
        </div>
      </form>
    </Form>
  );
}
