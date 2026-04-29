import { useQuery, useMutation } from "@tanstack/react-query";
import { searchPapers, getPaper, submitPaper, uploadPaperPdf, getLibrary } from "@/lib/api";

export function useSearchPapers(
  query: string,
  timeRange?: string,
  sort?: string,
) {
  return useQuery({
    queryKey: ["papers", "search", query, timeRange, sort],
    queryFn: () => searchPapers(query, timeRange, sort),
    enabled: query.length > 0,
    retry: 1,
    staleTime: 60 * 1000,
  });
}

export function usePaper(id: string | undefined) {
  return useQuery({
    queryKey: ["paper", id],
    queryFn: () => getPaper(id!),
    enabled: !!id,
  });
}

export function useSubmitPaper() {
  return useMutation({
    mutationFn: (input: { type: string; value: string }) => submitPaper(input),
  });
}

export function useUploadPaperPdf() {
  return useMutation({
    mutationFn: (file: File) => uploadPaperPdf(file),
  });
}

export function useLibrary() {
  return useQuery({
    queryKey: ["library"],
    queryFn: getLibrary,
  });
}
