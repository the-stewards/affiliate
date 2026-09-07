"use client";

import { useEffect, type RefObject } from "react";

// Shared by every page that can be iframed on the Squarespace site (the
// Reveal RSVP flow, the /save calendar page) with a fixed iframe height on
// the host side - any height change here (a step transition, font loading,
// a future edit) otherwise just gets clipped with an internal scrollbar.
// Posts the actual content height to the parent frame on load, on any size
// change, and once fonts finish loading, so the parent can resize the
// iframe to match. See public/rebel-embed-resize-listener.html for the
// paired script that belongs in the Squarespace embed.
//
// Measures `ref`'s own box, NOT document.documentElement/body - the <html>
// element renders at least the viewport height even when content is
// shorter (and once the parent grows the iframe once, that viewport only
// gets taller), so measuring it ratchets the height up but never back
// down. `ref` must point at a content-sized element with no min-height
// tied to the viewport (e.g. no `min-height: 100vh`).
export function useIframeAutoResize(ref: RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (window.parent === window) return;
    const el = ref.current;
    if (!el) return;

    function postHeight() {
      if (!el) return;
      window.parent.postMessage(
        { type: "rebel-embed-resize", height: Math.ceil(el.getBoundingClientRect().height) },
        "*"
      );
    }

    postHeight();
    const observer = new ResizeObserver(postHeight);
    observer.observe(el);
    document.fonts?.ready.then(postHeight).catch(() => {});

    return () => observer.disconnect();
  }, [enabled, ref]);
}
