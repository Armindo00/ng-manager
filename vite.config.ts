import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const packageJson = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8")
  ) as { version: string };

  const isProduction = mode === "production";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        isProduction ? packageJson.version : "dev"
      ),
      "import.meta.env.VITE_APP_BUILD_DATE": JSON.stringify(
        isProduction ? new Date().toISOString() : ""
      ),
    },
  };
});
