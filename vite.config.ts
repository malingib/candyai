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
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/jsx-runtime") || id.includes("/node_modules/react/") || id.includes("/node_modules/scheduler/")) {
              return "vendor-react";
            }
            if (id.includes("react-router") || id.includes("@remix-run/router")) {
              return "vendor-router";
            }
            if (id.includes("@radix-ui") || id.includes("vaul") || id.includes("react-remove-scroll") || id.includes("use-sidecar") || id.includes("use-callback-ref") || id.includes("react-style-singleton")) {
              return "vendor-ui";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            if (id.includes("lucide-react")) {
              return "vendor-lucide";
            }
            if (id.includes("date-fns")) {
              return "vendor-date";
            }
            if (id.includes("react-markdown") || id.includes("unified") || id.includes("/node_modules/remark-") || id.includes("/node_modules/rehype-") || id.includes("/node_modules/mdast-") || id.includes("/node_modules/micromark") || id.includes("/node_modules/vfile") || id.includes("/node_modules/unist-") || id.includes("/node_modules/hast-") || id.includes("property-information") || id.includes("trough") || id.includes("bail") || id.includes("ccount") || id.includes("trim-lines") || id.includes("zwitch") || id.includes("html-void-elements") || id.includes("style-to-object") || id.includes("comma-separated-tokens") || id.includes("space-separated-tokens") || id.includes("decode-named-character-reference") || id.includes("html-url-attributes")) {
              return "vendor-md-core";
            }
            if (id.includes("react-syntax-highlighter") || id.includes("highlight.js") || id.includes("/node_modules/refractor") || id.includes("/node_modules/lowlight") || id.includes("parse-entities")) {
              return "vendor-md-highlight";
            }
            if (id.includes("framer-motion") || id.includes("/node_modules/motion-dom/") || id.includes("/node_modules/motion-utils/")) {
              return "vendor-animation";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("sonner") || id.includes("next-themes")) {
              return "vendor-toast";
            }
            if (id.includes("react-helmet")) {
              return "vendor-helmet";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("cmdk")) {
              return "vendor-cmdk";
            }
            if (id.includes("embla-carousel")) {
              return "vendor-carousel";
            }
            if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
              return "vendor-forms";
            }
            return "vendor-misc";
          }
        },
      },
    },
    chunkSizeWarningLimit: 250,
  },
}));
