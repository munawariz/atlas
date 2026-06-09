"use client"; // Error boundaries must be Client Components

// Last-resort boundary for errors in the root/app layout itself (where the segment
// error.tsx can't reach). Replaces the root layout, so it must ship its own <html>/
// <body> and inline styles. Kept dependency-free on purpose.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0e14",
          color: "#e6edf3",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <title>Something went wrong · Atlas</title>
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <h1 style={{ fontWeight: 500, margin: "0.75rem 0 0.25rem" }}>Something went wrong</h1>
        <p style={{ color: "#8a939e", maxWidth: 320, margin: 0 }}>
          A temporary error occurred. Please try again.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => unstable_retry()}
            style={{ background: "#3fb950", color: "#0b0e14", border: 0, borderRadius: 14, padding: "10px 20px", fontWeight: 600 }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ background: "transparent", color: "#8a939e", border: "1px solid #232c3a", borderRadius: 14, padding: "10px 20px" }}
          >
            Reload
          </button>
        </div>
        {error.digest && <p style={{ color: "#586069", fontSize: 11, marginTop: 16 }}>ref: {error.digest}</p>}
      </body>
    </html>
  );
}
