import type { NextConfig } from "next";

// Use 127.0.0.1 so connections hit IPv4; localhost can resolve to ::1 and fail if server binds to 127.0.0.1
const backendOrigin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
