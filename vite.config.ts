import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "auralis-cards.js",
    },
    sourcemap: true,
    minify: "oxc",
  },
});
