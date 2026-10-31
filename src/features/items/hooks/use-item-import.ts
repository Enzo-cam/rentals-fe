import { useMutation, useQueryClient } from "@tanstack/react-query";

import { itemKeys } from "../api/keys";
import { confirmItemImport, previewItemImport } from "../api/requests";

/**
 * The preview and the confirmation are two mutations, and the text that was sent is the `variables` of each: the
 * screen compares it with what the person has now. The API does not take an `Idempotency-Key` here, so
 * `confirmOnce` asks the cache and not the render: two fast taps can arrive before React re-renders. A new preview
 * clears the last confirmation, so a marked preview of a 422 does not outlive the text it was about.
 */
export function useItemImport() {
  const queryClient = useQueryClient();
  const confirmKey = itemKeys.importConfirm();
  const preview = useMutation({
    mutationKey: itemKeys.importPreview(),
    mutationFn: previewItemImport,
  });
  const confirm = useMutation({
    mutationKey: confirmKey,
    mutationFn: confirmItemImport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
  function previewText(text: string) {
    confirm.reset();
    preview.mutate(text);
  }
  function confirmOnce(text: string, onCreated: () => void) {
    if (queryClient.isMutating({ mutationKey: confirmKey }) > 0) return;
    confirm.mutate(text, { onSuccess: onCreated });
  }
  return { preview, confirm, previewText, confirmOnce };
}
