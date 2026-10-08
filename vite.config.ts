import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "auralis-cards.ts",
      formats: ["es"],
      fileName: () => "auralis-cards.js",
    },
    emptyOutDir: false,
    sourcemap: true,
    minify: "oxc",
  },
});
