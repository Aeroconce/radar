import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Rellena las variables de entorno antes de cargar nada: src/lib/env.ts
    // valida al importarse y sin esto no se puede probar lo que dependa de el.
    setupFiles: ["./tests/setup.ts"],
  },
});
