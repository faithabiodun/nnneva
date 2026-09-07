"use client";

/**
 * The boundary of last resort: a failure in the root layout itself, where no
 * styling or shell can be relied on. It replaces the whole document, so it
 * carries its own html and body and inlines what little it needs.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf7f4",
          color: "#1c2b26",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "20px",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Nnneva could not load</h1>
          <p style={{ marginTop: 10, lineHeight: 1.6, color: "#5c6b66" }}>
            Something went wrong before the page could start. Nothing you have saved is
            affected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#1f6b54",
              color: "#fff",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
