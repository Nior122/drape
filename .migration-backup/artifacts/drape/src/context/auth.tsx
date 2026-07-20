import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, useLogin, useSignup, useLogout } from "@workspace/api-client-react";
import { AuthUser } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>;
  signup: ReturnType<typeof useSignup>;
  logout: ReturnType<typeof useLogout>;
  refetchUser: () => void;
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
    await logoutMutation.mutateAsync(undefined);
    queryClient.setQueryData(getGetMeQueryKey(), null);
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
        refetchUser: () => {
          refetch();
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
