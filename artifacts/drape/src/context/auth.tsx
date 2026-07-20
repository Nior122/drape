import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, useLogin, useSignup, useLogout } from "@workspace/api-client-react";
import { type AuthUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { clearToken } from "@/lib/token-storage";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>;
  signup: ReturnType<typeof useSignup>;
  logout: ReturnType<typeof useLogout>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });

  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    clearToken();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    try {
      await logoutMutation.mutateAsync(undefined);
    } catch {
      // Clear local state even if the API call fails
    }
  };

  const logoutMutWithOverride = {
    ...logoutMutation,
    mutate: handleLogout,
    mutateAsync: handleLogout,
  } as unknown as ReturnType<typeof useLogout>;

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        login: loginMutation,
        signup: signupMutation,
        logout: logoutMutWithOverride,
        refetchUser: async () => {
          await refetch();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
