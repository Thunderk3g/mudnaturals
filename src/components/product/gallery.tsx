"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage } from "@/server/queries";
import { copy } from "@/content/copy";

/**
 * One track for every viewport: native scroll-snap gives the mobile swipe for
 * free, thumbnails and arrows drive the same scroll on desktop. No carousel
 * library, no auto-rotation, no truncated thumbnail strip — the thumbnails
 * wrap so every frame is reachable.
 */
export function Gallery({ images }: { images: ProductImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-4/5 items-center justify-center bg-paper-deep">
        <span className="spec">No image</span>
      </div>
    );
  }

  const goTo = (next: number) => {
    const track = trackRef.current;
    const clamped = Math.max(0, Math.min(images.length - 1, next));
    setIndex(clamped);
    if (!track) return;
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <div>
      <div
        ref={trackRef}
        role="region"
        aria-label={copy.product.gallery}
        tabIndex={0}
        onScroll={(e) => {
          const w = e.currentTarget.clientWidth;
          if (w > 0) setIndex(Math.round(e.currentTarget.scrollLeft / w));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-paper-deep [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <figure key={`${image.storage_path}-${i}`} className="relative aspect-4/5 w-full shrink-0 snap-center">
            <Image
              src={image.storage_path}
              alt={image.alt}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
            {image.is_scale_reference ? (
              <figcaption className="spec absolute bottom-0 left-0 bg-paper/90 px-3 py-1.5 text-ink">
                {copy.product.scaleImage}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        {images.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label={copy.a11y.previousImage}
              className="border border-rule-strong px-3 py-1 text-ink hover:border-ink disabled:opacity-40"
            >
              <span aria-hidden>&#8249;</span>
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              aria-label={copy.a11y.nextImage}
              className="border border-rule-strong px-3 py-1 text-ink hover:border-ink disabled:opacity-40"
            >
              <span aria-hidden>&#8250;</span>
            </button>
          </div>
        ) : (
          <span />
        )}
        <p className="spec tabular-nums">{copy.product.imageCounter(index + 1, images.length)}</p>
      </div>

      {images.length > 1 ? (
        <div className="mt-4 hidden flex-wrap gap-2 md:flex">
          {images.map((image, i) => (
            <button
              key={`${image.storage_path}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === index}
              aria-label={
                copy.product.imageCounter(i + 1, images.length) +
                (image.is_scale_reference ? ` — ${copy.product.scaleImage}` : "")
              }
              className={`relative aspect-4/5 w-16 overflow-hidden border bg-paper-deep ${
                i === index ? "border-ink" : "border-rule hover:border-rule-strong"
              }`}
            >
              <Image src={image.storage_path} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
