import type { CreateOrderInput } from "./validators";

const DB_NAME = "fry-pos-offline";
const DB_VERSION = 1;
const OUTBOX_STORE = "outbox";
const META_STORE = "meta";

export const OUTBOX_CHANGED_EVENT = "fry-outbox-changed";

export type PendingOfflineOrder = {
  id: string;
  localSeq: number;
  payload: CreateOrderInput;
  queuedAt: string;
};

type MetaRecord = {
  key: string;
  value: unknown;
};

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open offline DB"));
  });
}

function notifyOutboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT));
  }
}

export async function enqueueOfflineOrder(
  payload: CreateOrderInput,
): Promise<PendingOfflineOrder> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([OUTBOX_STORE, META_STORE], "readwrite");
    const outbox = tx.objectStore(OUTBOX_STORE);
    const meta = tx.objectStore(META_STORE);

    const seqReq = meta.get("offline-seq");
    let queuedRecord: PendingOfflineOrder | null = null;

    seqReq.onsuccess = () => {
      const prevSeq =
        typeof (seqReq.result as MetaRecord | undefined)?.value === "number"
          ? ((seqReq.result as MetaRecord).value as number)
          : 0;
      const nextSeq = prevSeq + 1;
      meta.put({ key: "offline-seq", value: nextSeq });

      queuedRecord = {
        id: payload.id,
        localSeq: nextSeq,
        payload,
        queuedAt: new Date().toISOString(),
      };
      outbox.put(queuedRecord);
    };

    tx.oncomplete = () => {
      db.close();
      notifyOutboxChanged();
      if (queuedRecord) resolve(queuedRecord);
      else reject(new Error("Failed to queue offline order"));
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to queue offline order"));
    };
  });
}

export async function listPendingOrders(): Promise<PendingOfflineOrder[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const req = tx.objectStore(OUTBOX_STORE).getAll();

    req.onsuccess = () => {
      const list = (req.result as PendingOfflineOrder[]) ?? [];
      list.sort(
        (a, b) =>
          a.payload.placedAt.localeCompare(b.payload.placedAt) ||
          a.localSeq - b.localSeq,
      );
      resolve(list);
    };

    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to read offline outbox"));
    };
  });
}

export async function removePendingOrder(id: string): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    tx.objectStore(OUTBOX_STORE).delete(id);

    tx.oncomplete = () => {
      db.close();
      notifyOutboxChanged();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to remove synced order"));
    };
  });
}

export async function saveCachedMenu(data: unknown): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put({
      key: "pos-menu",
      value: { savedAt: new Date().toISOString(), data },
    });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to save cached menu"));
    };
  });
}
