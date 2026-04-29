import { useQuery } from "@tanstack/react-query";
import { getEvaluation } from "@/lib/api";

export function useEvaluation(paperId: string | undefined) {
  return useQuery({
    queryKey: ["evaluation", paperId],
    queryFn: () => getEvaluation(paperId!),
    enabled: !!paperId,
  });
}
