// Gộp máy chủ Express thành một tệp duy nhất cho hàm Vercel (api/index.mjs).
import { build } from "esbuild";

await build({
  entryPoints: ["apps/server/src/index.ts"],
  outfile: "api/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["node:*"],
  plugins: [
    {
      // Chỉ chặn đúng "@libsql/client" (bản có phần gốc); "@libsql/client/web" vẫn được gộp vào.
      name: "libsql-native-external",
      setup: (b) => b.onResolve({ filter: /^@libsql\/client$/ }, (a) => ({ path: a.path, external: true })),
    },
  ],
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
