import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0f172a 0%, #1d4ed8 100%)",
          color: "#f8fafc",
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
