import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig(({ mode }) => {
  const isFirefox = mode === "firefox";

  return {
    publicDir: "public",
    plugins: [
      webExtension({
        manifest: `manifest.${isFirefox ? "firefox" : "chrome"}.json`,
      }),
    ],
    build: {
      outDir: `dist/${isFirefox ? "firefox" : "chrome"}`,
      emptyOutDir: true,
      target: "es2020",
      rollupOptions: {
        output: {
          inlineDynamicImports: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    esbuild: {
      target: "es2020",
    },
  };
});
