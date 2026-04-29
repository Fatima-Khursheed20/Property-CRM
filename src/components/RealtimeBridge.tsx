"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

/** Socket.io real-time events + periodic refresh fallback */
export function RealtimeBridge({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const notify = () => {
      window.dispatchEvent(new CustomEvent("crm:refresh"));
      router.refresh();
    };

    let socket: ReturnType<typeof io> | undefined;
    try {
      socket = io({
        path: "/socket.io/",
        transports: ["websocket", "polling"],
      });
      socket.on("lead:created", notify);
      socket.on("lead:updated", notify);
      socket.on("lead:deleted", notify);
    } catch {
      /* Socket unavailable (e.g. `next dev` without custom server) — polling still runs */
    }

    const poll = window.setInterval(notify, 20000);

    return () => {
      try {
        socket?.disconnect();
      } catch {
        /* ignore */
      }
      window.clearInterval(poll);
    };
  }, [router]);

  return <>{children}</>;
}
