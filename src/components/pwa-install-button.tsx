"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/modal";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeStandalone(onStoreChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onStoreChange);
  window.addEventListener("appinstalled", onStoreChange);
  return () => {
    mq.removeEventListener("change", onStoreChange);
    window.removeEventListener("appinstalled", onStoreChange);
  };
}

function getIsStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getIsStandalone,
    () => true,
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setHelpOpen(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return;
    }
    setHelpOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label="Install app on device"
        className={
          compact
            ? "inline-flex min-h-11 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            : "flex min-h-9 w-full items-center gap-2.5 rounded-control px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-ink"
        }
      >
        <Download size={compact ? 15 : 18} strokeWidth={1.5} aria-hidden />
        <span>{compact ? "Install" : "Install app"}</span>
      </button>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        titleId={titleId}
        title="Install FRY POS"
      >
        <div className="flex flex-col gap-4 text-sm text-ink-2">
          <p>
            Install FRY POS on your phone or tablet home screen for full-screen counter mode and offline queueing.
          </p>

          <div className="rounded-control border border-hairline bg-bg p-3.5">
            <p className="font-medium text-ink">iPhone &amp; iPad (Safari)</p>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 ps-5 text-xs leading-relaxed">
              <li>
                Tap the <Share size={13} strokeWidth={1.5} className="inline" aria-hidden />{" "}
                <strong>Share</strong> button in Safari&apos;s toolbar.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
            </ol>
          </div>

          <div className="rounded-control border border-hairline bg-bg p-3.5">
            <p className="font-medium text-ink">Android &amp; Desktop (Chrome / Edge)</p>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 ps-5 text-xs leading-relaxed">
              <li>
                Open the browser menu (<strong>⋮</strong>) or install icon in the address bar.
              </li>
              <li>
                Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </li>
            </ol>
          </div>

          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="btn btn-primary w-full text-sm"
          >
            Got it
          </button>
        </div>
      </Modal>
    </>
  );
}
