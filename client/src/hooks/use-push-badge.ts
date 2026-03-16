import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

/**
 * Listens for PUSH_RECEIVED messages from the Service Worker and
 * immediately invalidates the unread notification count so every
 * badge in the UI refreshes without a page reload.
 */
export function usePushBadge() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_RECEIVED") {
        queryClient.invalidateQueries({
          queryKey: ["/api/notifications/unread-count"],
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);
}
