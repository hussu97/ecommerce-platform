import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const proxyTarget = process.env.VITE_PROXY_TARGET || process.env.VITE_DISCOVERY_API_URL || "http://127.0.0.1:8004";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5175,
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: proxyTarget,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
