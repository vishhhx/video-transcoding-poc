import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(currentDirectory, "./src"),
    },
  },
  server: {
    proxy: {
      "/cloudfront-test": {
        target: "https://d3m2xvhxjhnq64.cloudfront.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cloudfront-test/, ""),
      },
    },
  },
});
