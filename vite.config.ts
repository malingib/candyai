import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/jsx-runtime")) {
              return "vendor-react";
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("@radix-ui") || id.includes("vaul")) {
              return "vendor-ui";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            if (id.includes("lucide-react")) {
              return "vendor-lucide";
            }
            if (id.includes("date-fns")) {
              return "vendor-date";
            }
            if (id.includes("react-markdown")) {
              return "vendor-md-core";
            }
            if (id.includes("react-syntax-highlighter")) {
              return "vendor-md-highlight";
            }
            if (id.includes("framer-motion")) {
              return "vendor-animation";
            }
            if (id.includes("cmdk")) {
              return "vendor-cmdk";
            }
            if (id.includes("embla-carousel")) {
              return "vendor-carousel";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            return "vendor-misc";
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
}));