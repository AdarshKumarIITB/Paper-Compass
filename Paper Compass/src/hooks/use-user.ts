import { useMutation } from "@tanstack/react-query";
import { calibrateDepth } from "@/lib/api";
import type { DepthLevel } from "@/lib/types";

export function useCalibrateDepth() {
  return useMutation({
    mutationFn: (depth: DepthLevel) => calibrateDepth(depth),
  });
}
