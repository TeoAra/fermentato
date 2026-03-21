import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type UpdateType = "taplist" | "bottles" | "menu" | "pub";

interface PubUpdateEvent {
  type: UpdateType;
  pubId: number;
  ts: number;
}

export function usePubLiveUpdates(pubId: number | string | null | undefined) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!pubId) return;

    const id = typeof pubId === "string" ? pubId : String(pubId);

    const es = new EventSource(`/api/pubs/${id}/live`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: PubUpdateEvent = JSON.parse(event.data);

        if (data.type === "taplist" || data.type === "pub") {
          queryClient.invalidateQueries({ queryKey: ["/api/pubs", id, "taplist"] });
        }
        if (data.type === "bottles" || data.type === "pub") {
          queryClient.invalidateQueries({ queryKey: ["/api/pubs", id, "bottles"] });
        }
        if (data.type === "menu" || data.type === "pub") {
          queryClient.invalidateQueries({ queryKey: ["/api/pubs", id, "menu", "full"] });
        }
      } catch {
      }
    };

    es.onerror = () => {
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [pubId, queryClient]);
}
