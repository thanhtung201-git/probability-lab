import { config as napEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Trên Vercel hàm chạy từ một bản gộp (api/index.mjs), nên gốc dự án là thư mục làm việc của hàm. */
const TREN_VERCEL = Boolean(process.env.VERCEL);
export const GOC_DU_AN = TREN_VERCEL ? process.cwd() : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

napEnv({ path: path.join(GOC_DU_AN, ".env"), quiet: true });

export const CONFIG = {
  port: Number(process.env.PORT ?? 3001),
  /** Vercel chỉ cho ghi vào /tmp và dữ liệu ở đó là tạm thời (mất khi hàm khởi động lại). */
  /** Có hai biến này thì dùng Turso (bắt buộc khi chạy trên Vercel); không có thì dùng file SQLite cục bộ. */
  tursoUrl: process.env.TURSO_DATABASE_URL?.trim() || null,
  tursoToken: process.env.TURSO_AUTH_TOKEN?.trim() || null,
  dbPath: TREN_VERCEL ? "/tmp/probability-lab.db" : path.resolve(GOC_DU_AN, process.env.DB_PATH ?? "probability-lab.db"),
  /** PLAB_TAT_AI=1 buộc chạy bằng bộ luật dù .env có khóa (dùng khi chạy thử, không tốn tiền API). */
  groqApiKey: process.env.PLAB_TAT_AI === "1" ? null : process.env.GROQ_API_KEY?.trim() || null,
  /** Mô hình Groq hỗ trợ structured outputs chế độ strict. */
  groqModel: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b",
  groqTimeoutMs: Number(process.env.GROQ_TIMEOUT_MS ?? 20000),
  thuMucData: path.join(GOC_DU_AN, "data"),
  /** Thư mục giao diện đã build (npm run build); có thì máy chủ phục vụ luôn giao diện, không cần chạy riêng. */
  thuMucGiaoDien: path.join(GOC_DU_AN, "apps/web/dist"),
  /** Mật khẩu chung tùy chọn, dạng "ten:matkhau". Để trống thì ai có đường dẫn cũng dùng được. */
  basicAuth: process.env.PLAB_BASIC_AUTH?.trim() || null,
  /** Số lần gọi chức năng dùng AI tối đa mỗi phút cho mỗi địa chỉ IP, để khóa Groq không bị lạm dụng. */
  gioiHanAIMoiPhut: Number(process.env.PLAB_GIOI_HAN_AI ?? 60),
};
