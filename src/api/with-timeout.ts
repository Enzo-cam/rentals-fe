/**
 * A signal that aborts after `ms` or when `parent` aborts. `AbortSignal.any` and `AbortSignal.timeout` are not used
 * because `any` only exists since Safari 17.4 and Next 16 supports Safari 16.4.
 * Call `clear` when the request is over, so the timer and the listener do not outlive it.
 */
export function withTimeout(parent: AbortSignal, ms: number) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parent.reason);
  const timer = setTimeout(
    () => controller.abort(new DOMException("Timed out", "TimeoutError")),
    ms,
  );
  if (parent.aborted) onParentAbort();
  else parent.addEventListener("abort", onParentAbort, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      parent.removeEventListener("abort", onParentAbort);
    },
  };
}
