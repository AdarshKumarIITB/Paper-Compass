import { useQuery } from "@tanstack/react-query";
import { getPaper } from "@/lib/api";
import type { Paper } from "@/lib/types";

const TERMINAL_STATUSES: Paper["status"][] = [
  "ready",
  "awaiting_upload",
  "awaiting_confirmation",
  "failed",
  // legacy values that mean "done" in older rows
  "evaluated",
  "completed",
];

export function usePaperStatus(id: string | undefined) {
  return useQuery<Paper>({
    queryKey: ["paper", id],
    queryFn: () => getPaper(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 2000;
      return TERMINAL_STATUSES.includes(status) ? false : 2000;
    },
    refetchOnWindowFocus: false,
  });
}
