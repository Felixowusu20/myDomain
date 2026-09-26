"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function isChromeControl(el: Element) {
  if (el.closest("[data-no-loader]")) return true;
  const label = (el.getAttribute("aria-label") ?? "").toLowerCase();
  return label === "open menu" || label === "close menu" || label === "toggle menu";
}

function isInternalNavLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return url.pathname !== window.location.pathname || url.search !== window.location.search;
  } catch {
    return href.startsWith("/") && !href.startsWith("//");
  }
}

export function ClickLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const showTimer = useRef<number>(0);

  useEffect(() => {
    window.clearTimeout(showTimer.current);
    setActive(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const node = event.target instanceof Element ? event.target : null;
      const anchor = node?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (isChromeControl(anchor) || !isInternalNavLink(anchor)) return;
      window.clearTimeout(showTimer.current);
      showTimer.current = window.setTimeout(() => setActive(true), 160);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(showTimer.current);
    };
  }, []);

  if (!active) return null;

  return <div className="route-progress" role="status" aria-live="polite" aria-label="Loading" />;
}
