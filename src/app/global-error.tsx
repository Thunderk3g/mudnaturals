"use client";

import { copy } from "@/content/copy";

/** The root layout has failed, so this renders its own document and leans on
 *  nothing — no fonts, no stylesheet, no shell. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#F7F4EE",
          color: "#1C1A17",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          margin: 0,
          padding: "6rem 1.25rem",
        }}
      >
        <main style={{ margin: "0 auto", maxWidth: "34rem" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.25rem", fontWeight: 400, margin: 0 }}>
            {copy.errors.genericTitle}
          </h1>
          <p style={{ color: "#6B645A", lineHeight: 1.6, marginTop: "1.25rem" }}>{copy.errors.genericBody}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#B4552D",
              border: 0,
              borderRadius: "2px",
              color: "#F7F4EE",
              cursor: "pointer",
              fontSize: "1rem",
              marginTop: "2rem",
              padding: "0.875rem 1.75rem",
            }}
          >
            {copy.errors.tryAgain}
          </button>
        </main>
      </body>
    </html>
  );
}
