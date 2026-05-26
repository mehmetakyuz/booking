"use client";

import { useEffect, useRef, useState } from "react";
import { bootstrap } from "@/lib/booking/bootstrap";
import { BookingInit, BookingProvider } from "@/lib/booking/context";
import { generateSessionId } from "@/lib/booking/session";
import { readSnapshotFromUrl } from "@/lib/booking/url-state";
import { BookingShell } from "@/components/shell/BookingShell";
import { Spinner } from "@/components/ui/Spinner";

export function BookingApp({ offerId }: { offerId: string }) {
  const [init, setInit] = useState<BookingInit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const snapshot = readSnapshotFromUrl();
    const sessionId = snapshot?.sid ?? generateSessionId();
    bootstrap(offerId, sessionId, snapshot)
      .then(setInit)
      .catch((e) => setError((e as Error).message));
  }, [offerId]);

  if (error) {
    return (
      <div className="empty-state" style={{ paddingTop: 120 }}>
        <h3>We couldn&apos;t load this offer</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!init) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <Spinner />
        <span style={{ color: "var(--grey-darkest)" }}>Loading your booking…</span>
      </div>
    );
  }

  return (
    <BookingProvider init={init}>
      <BookingShell />
    </BookingProvider>
  );
}
