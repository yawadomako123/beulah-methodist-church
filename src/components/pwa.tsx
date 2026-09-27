"use client";

import clsx from "clsx";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function ServiceWorkerRegister() {
  useEffect(() => {
    // In development a service worker would serve stale code, so only register in production.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.error("Service worker registration failed", err));
  }, []);
  return null;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** "Install app" button: uses the browser's install prompt, or shows iOS "Add to Home Screen" steps. */
export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIOS());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !ios)) return null;

  return (
    <>
      <button
        type="button"
        className={clsx("flex items-center gap-2", className)}
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          } else {
            setShowIosHelp(true);
          }
        }}
      >
        <Download className="size-4" /> Install app
      </button>
      {showIosHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={() => setShowIosHelp(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ios-install-title" className="card w-full max-w-sm p-5 text-slate-800 pb-safe" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="ios-install-title" className="font-semibold">
                Install on iPhone or iPad
              </h2>
              <button type="button" aria-label="Close" onClick={() => setShowIosHelp(false)} className="rounded p-1 hover:bg-slate-100">
                <X className="size-4" />
              </button>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>
                Tap the <Share className="inline size-4 align-text-bottom" /> <strong>Share</strong> button in Safari.
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong>. The app will appear with the church logo.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
