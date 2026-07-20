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
import { useSignup, useSaveSharedOnboarding } from "@workspace/api-client-react";
import { useAuth } from "../../../context/auth";
import { useToast } from "@/hooks/use-toast";
import { setToken } from "@/lib/token-storage";
import { type SignupInputRole } from "@workspace/api-client-react";
import { GoogleSignInButton } from "../GoogleSignInButton";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

const accountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountStepProps {
  role: SignupInputRole;
  onComplete: () => void;
}

export function AccountStep({ role, onComplete }: AccountStepProps) {
  const { toast } = useToast();
  const { refetchUser } = useAuth();
  const signupMutation = useSignup();
  const saveSharedMutation = useSaveSharedOnboarding();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      whatsapp: "",
      city: "",
      country: "",
    },
  });

  const onSubmit = async (data: AccountFormValues) => {
    try {
      const result = await signupMutation.mutateAsync({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          role,
        },
      });
      if (result?.token) setToken(result.token);

      saveSharedMutation.mutateAsync({
        data: {
          phone: data.phone,
          whatsapp: data.whatsapp,
          city: data.city,
          country: data.country,
        }
      }).catch(() => {
        // Non-critical — user can update these in their profile later
      });

      await refetchUser();
      onComplete();
    } catch (error: unknown) {
      // Determine user-facing message from the API error
      let description = "Something went wrong. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("409")) {
          description = "That email is already registered. Try signing in instead.";
        } else {
          // Show the real server error so it's debuggable
          description = error.message;
        }
      }
      toast({
        title: "Signup failed",
        description,
        variant: "destructive",
      });
      console.error("[Signup error]", error);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <LocationAutocomplete
            cityValue={form.watch("city")}
            countryValue={form.watch("country")}
            onCityChange={(v) => form.setValue("city", v, { shouldValidate: true })}
            onCountryChange={(v) => form.setValue("country", v, { shouldValidate: true })}
            cityError={form.formState.errors.city?.message}
            countryError={form.formState.errors.country?.message}
            showLabels={true}
            labelClassName="text-sm font-medium text-foreground"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+44 7000 000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+44 7000 000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full mt-6" disabled={signupMutation.isPending || saveSharedMutation.isPending}>
            {signupMutation.isPending || saveSharedMutation.isPending ? "Creating account..." : "Continue"}
          </Button>
        </form>
      </Form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">Or</span>
        </div>
      </div>

      <GoogleSignInButton role={role} />
    </>
  );
}
