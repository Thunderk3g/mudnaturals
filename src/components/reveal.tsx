"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Fade-and-rise, once, when a section arrives in view.
 *
 * The rule that makes this safe: the server renders no state attribute at all,
 * so the first paint is the finished page. On mount we measure — anything
 * already on screen is left alone, anything below the fold is hidden (invisibly,
 * since it is below the fold) and released when it scrolls up. That avoids the
 * three ways this pattern normally goes wrong: a blank hero before hydration, a
 * permanently blank page with JavaScript off, and layout shift. Opacity and
 * transform never move anything.
 *
 * `prefers-reduced-motion: reduce` short-circuits the whole thing — the element
 * keeps its plain server markup and no attribute is ever written.
 */
export function Reveal({
  children,
  className = "",
  as = "div",
  stagger = false,
  step = 90,
}: {
  children: ReactNode;
  className?: string;
  /** A staggered grid usually wants to be the list itself, not a wrapper. */
  as?: "div" | "ul";
  /** Animate the direct children in sequence instead of the container. */
  stagger?: boolean;
  /** Milliseconds between children. */
  step?: number;
}) {
  const node = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"out" | "in" | null>(null);

  // A callback ref rather than useRef<T> so one component can render either tag.
  const attach = useCallback((el: HTMLElement | null) => {
    node.current = el;
  }, []);

  useEffect(() => {
    const el = node.current;
    if (!el) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    // Already visible at first paint: never hide it.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setState("out");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("in");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const props = {
    ref: attach,
    className,
    ...(state ? { "data-reveal": state } : {}),
    ...(stagger ? { "data-stagger": "", style: { "--stagger": `${step}ms` } as CSSProperties } : {}),
  };

  return as === "ul" ? <ul {...props}>{children}</ul> : <div {...props}>{children}</div>;
}
