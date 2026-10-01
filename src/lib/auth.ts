import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export function useUserId() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return {
        id: data.session?.user.id ?? null,
        email: data.session?.user.email ?? null,
      };
    },
    staleTime: 30_000,
    retry: 2,
  });
  return {
    userId: data?.id ?? null,
    email: data?.email ?? null,
    isLoading,
    error: isError ? error : null,
    refresh: refetch,
  };
}

export function useProfile() {
  const { userId, email, isLoading: loadingUser, error: userError } = useUserId();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    retry: 2,
  });
  return {
    userId,
    email,
    profile: data ?? null,
    isLoading: loadingUser || (!!userId && isLoading),
    error: userError ?? (isError ? error : null),
    refresh: refetch,
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };
}

export function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
