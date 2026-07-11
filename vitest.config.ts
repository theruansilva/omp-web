import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "omp-web-plugins/**/*.test.ts"],
  },
});
