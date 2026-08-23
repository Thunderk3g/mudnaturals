import type { ReactNode } from "react";
import { NavProgress } from "@/components/nav-progress";

/**
 * The route transition, and the whole of it.
 *
 * Next remounts `template.tsx` on every navigation while `layout.tsx` persists,
 * so a plain CSS entry animation on a fresh element replays each time. No
 * router events, no exit animation, no state — the header, footer and cart sit
 * in the layout above this and never blink.
 *
 * `NavProgress` sits here rather than in the layout for exactly that reason: a
 * remount *is* the "navigation finished" signal, so the pending bar clears
 * itself. It is a sibling of `.route-enter`, never a child — an ancestor
 * mid-`transform` becomes the containing block for `position: fixed`, and the
 * bar would ride the 10px route-in slide for 450ms.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <NavProgress />
      <div className="route-enter">{children}</div>
    </>
  );
}
