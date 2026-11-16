"use client";

import { Check, RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { placeOrder } from "@/app/(app)/pos/actions";
import {
  listPendingOrders,
  OUTBOX_CHANGED_EVENT,
  removePendingOrder,
} from "@/lib/offline-outbox";

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

export function OfflineSyncBar() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushOutbox = useCallback(async () => {
    const pending = await listPendingOrders().catch(() => []);
    setPendingCount(pending.length);

    if (!navigator.onLine || pending.length === 0 || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    const syncedBills: number[] = [];

    try {
      for (const entry of pending) {
        if (!navigator.onLine) break;
        const result = await placeOrder(entry.payload);
        if ("error" in result) {
          break;
        }
        await removePendingOrder(entry.id);
        syncedBills.push(result.billNo);
      }
    } catch {
      // Connection dropped mid-sync; remaining orders stay safely in IndexedDB.
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      const remaining = await listPendingOrders().catch(() => []);
      setPendingCount(remaining.length);

      if (syncedBills.length > 0) {
        const billText =
          syncedBills.length === 1
            ? `Bill #${syncedBills[0]}`
            : `Bills ${syncedBills.map((b) => `#${b}`).join(", ")}`;
        setSyncMessage(
          `Synced ${syncedBills.length === 1 ? "offline order" : `${syncedBills.length} offline orders`} → ${billText}`,
        );
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => setSyncMessage(null), 6000);
      }
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void flushOutbox();
    }, 0);

    function handleOutboxChange() {
      void flushOutbox();
    }

    window.addEventListener("online", handleOutboxChange);
    window.addEventListener(OUTBOX_CHANGED_EVENT, handleOutboxChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOutboxChange);
      window.removeEventListener(OUTBOX_CHANGED_EVENT, handleOutboxChange);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [flushOutbox]);

  if (isOnline && pendingCount === 0 && !syncing && !syncMessage) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-control border border-hairline bg-card px-3.5 py-2.5 text-xs"
    >
      {!isOnline ? (
        <span className="flex items-center gap-2 font-medium text-accent-text">
          <WifiOff size={14} strokeWidth={1.5} aria-hidden />
          Offline mode — orders queue on this device
          {pendingCount > 0 ? (
            <span className="font-mono text-ink-2">
              ({pendingCount} pending)
            </span>
          ) : null}
        </span>
      ) : syncing ? (
        <span className="flex items-center gap-2 font-medium text-ink-2">
          <RefreshCw size={14} strokeWidth={1.5} className="animate-spin" aria-hidden />
          Syncing {pendingCount} queued {pendingCount === 1 ? "order" : "orders"}…
        </span>
      ) : pendingCount > 0 ? (
        <>
          <span className="font-medium text-accent-text">
            {pendingCount} queued {pendingCount === 1 ? "order" : "orders"} waiting to sync
          </span>
          <button
            type="button"
            onClick={() => void flushOutbox()}
            className="font-medium text-ink underline underline-offset-2"
          >
            Sync now
          </button>
        </>
      ) : syncMessage ? (
        <span className="flex items-center gap-2 font-medium text-positive">
          <Check size={14} strokeWidth={1.5} aria-hidden />
          {syncMessage}
        </span>
      ) : null}
    </div>
  );
}
