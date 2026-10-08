"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { enqueue, flushEvents } from "@/shared/lib/analytics";
import { useAuth } from "@/shared/hook/useAuth";

const FLUSH_MS = 30_000;

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const { accessToken } = useAuth();
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;
  const firstView = useRef(true);

  useEffect(() => {
    if (pathname.includes("/dashboard")) return;
    enqueue("page_view", firstView.current ? { referrer: document.referrer } : {});
    firstView.current = false;
  }, [pathname]);

  useEffect(() => {
    const flush = () => flushEvents(tokenRef.current);
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(flush, FLUSH_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
      flush();
    };
  }, []);

  return null;
}
