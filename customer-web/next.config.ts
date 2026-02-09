import type { NextConfig } from "next";

// Use 127.0.0.1 so connections hit IPv4; localhost can resolve to ::1 and fail if server binds to 127.0.0.1
const backendOrigin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**", port: "8000" },
      { protocol: "http", hostname: "localhost", pathname: "/**", port: "8000" },
      { protocol: "http", hostname: "customer-api", pathname: "/**", port: "8000" },
    ],
  },
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
