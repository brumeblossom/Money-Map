import { ImageResponse } from "next/og";

export const alt = "Money Map — Know where your money goes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#2A1F66",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand Logo & Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#5B3FD1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            {/* Logo Mark: 4 pill segments */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                width: "36px",
                height: "36px",
                gap: "4px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "5px",
                  backgroundColor: "#FFFFFF",
                }}
              />
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "5px",
                  backgroundColor: "rgba(255,255,255,0.7)",
                }}
              />
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "5px",
                  backgroundColor: "rgba(255,255,255,0.7)",
                }}
              />
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "5px",
                  backgroundColor: "#ECE8FC",
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
            }}
          >
            Money Map
          </span>
        </div>

        {/* Headline & Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "960px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Know where your money goes.
          </h1>
          <p
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "#ECE8FC",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Record your income, expenses, giving and money you&apos;ve lent in seconds.
            See clear monthly totals and spending habits on your phone or laptop.
          </p>
        </div>

        {/* Feature Highlights */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            <span>⚡ Record in seconds</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            <span>📊 Clear habits & totals</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            <span>🔒 100% Private & Offline-first</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
