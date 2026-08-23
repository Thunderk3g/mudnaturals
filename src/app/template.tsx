import type { ReactNode } from "react";

/**
 * The route transition, and the whole of it.
 *
 * Next remounts `template.tsx` on every navigation while `layout.tsx` persists,
 * so a plain CSS entry animation on a fresh element replays each time. No
 * router events, no exit animation, no state — the header, footer and cart sit
 * in the layout above this and never blink.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
