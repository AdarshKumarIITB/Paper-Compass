import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getMe, logout as logoutApi } from "@/lib/api";
import type { User } from "@/lib/types";

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isUnauthenticated = isError && error instanceof ApiError && error.status === 401;
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], undefined);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data && !isUnauthenticated,
    isUnauthenticated,
    logout: () => logoutMutation.mutate(),
  };
}
