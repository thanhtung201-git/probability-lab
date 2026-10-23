import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PLAB_WEB_PORT ?? 5173),
    // PLAB_API cho phép trỏ giao diện sang một máy chủ khác (ví dụ bản chạy thử).
    proxy: { "/api": process.env.PLAB_API ?? "http://localhost:3001" },
  },
});
