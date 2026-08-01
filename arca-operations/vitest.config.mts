import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Fara acest `root`, vitest urca in repo si incarca `vitest.config.js` al
    // site-ului Lut & Lemn, care ruleaza cu totul alte teste.
    root: import.meta.dirname,
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
