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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSaveProducerOnboarding } from "@workspace/api-client-react";
import { useAuth } from "../../../context/auth";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

const PRESET_SPECIALTIES = [
  "Tailoring", "Bridal", "Streetwear", "Evening Wear", "Leather", 
  "Knitwear", "Denim", "Embroidery", "Alterations", "Pattern Making"
];

const producerOnboardingSchema = z.object({
  studioName: z.string().min(1, "Studio name is required"),
  studioType: z.enum(["SOLO", "STUDIO"]),
  specialties: z.array(z.string()).min(1, "Select at least one specialty"),
  bio: z.string().min(10, "Bio should be at least 10 characters"),
  priceMin: z.number().min(0),
  priceMax: z.number().min(0),
  instagram: z.string().optional(),
});

type ProducerOnboardingValues = z.infer<typeof producerOnboardingSchema>;

interface ProducerOnboardingStepProps {
  onComplete: () => void;
}

export function ProducerOnboardingStep({ onComplete }: ProducerOnboardingStepProps) {
  const { toast } = useToast();
  const { refetchUser } = useAuth();
  const saveMutation = useSaveProducerOnboarding();

  const form = useForm<ProducerOnboardingValues>({
    resolver: zodResolver(producerOnboardingSchema),
    defaultValues: {
      studioName: "",
      studioType: "SOLO",
      specialties: [],
      bio: "",
      priceMin: 100,
      priceMax: 2000,
      instagram: "",
    },
  });

  const onSubmit = async (data: ProducerOnboardingValues) => {
    try {
      await saveMutation.mutateAsync({
        data,
      });
      await refetchUser();
      onComplete();
    } catch (error) {
      toast({
        title: "Error saving profile",
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
      onComplete();
    }
  };

  const selectedSpecialties = form.watch("specialties");

  const toggleSpecialty = (spec: string) => {
    const current = new Set(selectedSpecialties);
    if (current.has(spec)) {
      current.delete(spec);
    } else {
      current.add(spec);
    }
    form.setValue("specialties", Array.from(current), { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="studioName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Studio / Brand Name</FormLabel>
                <FormControl>
                  <Input placeholder="Maison Drape" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studioType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Setup</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="SOLO" />
                      </FormControl>
                      <FormLabel className="font-normal">Solo Independent Designer</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="STUDIO" />
                      </FormControl>
                      <FormLabel className="font-normal">Studio / Team</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specialties"
          render={() => (
            <FormItem>
              <FormLabel>Specialties</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_SPECIALTIES.map((spec) => {
                  const isSelected = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-transparent border-border hover:border-primary text-foreground"
                      }`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <label className="text-sm font-medium leading-none">Typical Price Range (USD)</label>
          <div className="flex justify-between text-sm text-muted-foreground font-mono">
            <span>${form.watch("priceMin")}</span>
            <span>${form.watch("priceMax")}</span>
          </div>
          <Slider
            min={0}
            max={10000}
            step={50}
            value={[form.watch("priceMin"), form.watch("priceMax")]}
            onValueChange={([min, max]) => {
              form.setValue("priceMin", min);
              form.setValue("priceMax", max);
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio / About</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell clients about your experience, approach, and signature style..." 
                  className="resize-none h-24"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instagram Handle (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="@maisondrape" {...field} />
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
