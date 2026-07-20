import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetClientNotificationsQueryKey } from "@workspace/api-client-react";

export function useNotificationStream(enabled: boolean): void {
  const qc = useQueryClient();
  const activeRef = useRef(true);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    activeRef.current = true;

    let es: EventSource | null = null;

    function connect() {
      if (!activeRef.current) return;

      es = new EventSource("/api/notifications/stream", { withCredentials: true });

      es.addEventListener("notification", () => {
        void qc.invalidateQueries({ queryKey: getGetClientNotificationsQueryKey() });
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (activeRef.current) {
          retryRef.current = setTimeout(connect, 5_000);
        }
      };
    }

    connect();

    return () => {
      activeRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      es?.close();
    };
  }, [enabled, qc]);
}
