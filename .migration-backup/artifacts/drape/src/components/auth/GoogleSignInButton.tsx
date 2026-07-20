import React, { useEffect, useRef } from "react";
import { useGoogleAuth } from "@workspace/api-client-react";
import { useAuth } from "../../context/auth";
import { useToast } from "@/hooks/use-toast";
import { AuthUserRole } from "@workspace/api-client-react/src/generated/api.schemas";

interface GoogleSignInButtonProps {
  role?: AuthUserRole;
}

export function GoogleSignInButton({ role }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const googleAuthMutation = useGoogleAuth();
  const { refetchUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const handleCredentialResponse = async (response: any) => {
      try {
        await googleAuthMutation.mutateAsync({
          data: {
            idToken: response.credential,
            role,
          },
        });
        refetchUser();
      } catch (error) {
        toast({
          title: "Sign in failed",
          description: "Could not sign in with Google. Please try again.",
          variant: "destructive",
        });
      }
    };

    const loadScript = () => {
      if (window.google?.accounts?.id) {
        initializeGoogle();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;
      
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      
      if (containerRef.current) {
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          logo_alignment: "center",
        });
      }
    };

    loadScript();
  }, [role, refetchUser, toast, googleAuthMutation]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="w-full flex justify-center mt-4">
      <div ref={containerRef} className="w-full overflow-hidden flex justify-center" />
    </div>
  );
}
