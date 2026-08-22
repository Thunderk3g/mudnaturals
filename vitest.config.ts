import path from "node:path";

// Exported as a plain object rather than through `defineConfig`: the package is
// CommonJS, so vitest loads this file as CJS, and `require("vitest/config")`
// dies on an ESM-only transitive dependency under Node 20.
export default {
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
};
