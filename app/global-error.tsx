"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f7f4ed",
          color: "#4e4e4e",
          fontFamily: '"Figtree","Helvetica Neue",Arial,sans-serif',
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 32,
            borderRadius: 24,
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,43,15,.06)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#111",
            }}
          >
            Something broke.
          </h1>
          <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7 }}>
            Atlas hit an error it could not recover from. Your data is untouched.
          </p>
          {error.digest && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#7a7a7a" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              height: 48,
              width: "100%",
              border: "none",
              borderRadius: 10,
              background: "#003511",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
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
