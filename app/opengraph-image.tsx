import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt = "Moneyrails · Know where your money goes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-on-light.png");
  const logoData = fs.readFileSync(logoPath);
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

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
          backgroundColor: "#F7F6FC",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={logoBase64}
            alt="Moneyrails"
            style={{
              height: "64px",
              width: "auto",
            }}
          />
        </div>

        {/* Headline & Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "960px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#17191C",
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
              color: "#5E636B",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Record your income, expenses, giving and money you&apos;ve lent in seconds.
            See clear monthly totals and spending habits on your phone or laptop.
          </p>
        </div>

        {/* Feature Highlights */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "#ECE8FC",
              color: "#5B3FD1",
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
              backgroundColor: "#ECE8FC",
              color: "#5B3FD1",
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
              backgroundColor: "#ECE8FC",
              color: "#5B3FD1",
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
