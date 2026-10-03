import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the build work on GitHub Pages under /<repo>/
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          leaflet: ["leaflet"],
        },
      },
    },
  },
});
