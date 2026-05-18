import path from "node:path";
import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [vue()],
    root: path.resolve(rootDir, "ui"),
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:3011",
                changeOrigin: true,
            },
        },
    },
    build: {
        emptyOutDir: true,
        outDir: path.resolve(rootDir, "ui", "dist"),
    },
});
