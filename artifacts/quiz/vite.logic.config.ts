import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, "src/lib/quiz-logic.ts"),
      name: "MhbQuiz",
      formats: ["iife"],
      fileName: () => "quiz-logic.js",
    },
    outDir: "public",
    emptyOutDir: false,
  },
});
