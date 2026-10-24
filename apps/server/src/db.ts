// Lưu trữ libSQL (SQLite): trên Vercel dùng Turso để mọi instance chung một cơ sở dữ liệu; chạy máy cá nhân thì dùng file cục bộ.
import type { InValue } from "@libsql/client";
import { CONFIG } from "./config";

// Bản web (thuần JavaScript, gọi qua HTTPS) dùng cho Turso nên chạy được trên Vercel; bản đầy đủ có phần gốc (native) chỉ dùng cho file cục bộ.
// Trong bản gộp cho Vercel, "@libsql/client" bị đánh dấu external (scripts/build-vercel.mjs) nên nhánh file cục bộ không bao giờ nạp.
const { createClient } = CONFIG.tursoUrl ? await import("@libsql/client/web") : await import("@libsql/client");

export const db = CONFIG.tursoUrl
  ? createClient({ url: CONFIG.tursoUrl.replace(/^libsql:/, "https:"), authToken: CONFIG.tursoToken ?? undefined })
  : createClient({ url: `file:${CONFIG.dbPath}` });

const SCHEMA = `

CREATE TABLE IF NOT EXISTS phien (
  id TEXT PRIMARY KEY,
  tinh_huong_id TEXT NOT NULL,
  tao_luc TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS luot_lam (
  id TEXT PRIMARY KEY,
  phien_id TEXT NOT NULL REFERENCES phien(id),
  ma_nhom TEXT NOT NULL,
  seed INTEGER NOT NULL,
  tao_luc TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (phien_id, ma_nhom)
);

CREATE TABLE IF NOT EXISTS tra_loi (
  luot_id TEXT NOT NULL REFERENCES luot_lam(id),
  lan INTEGER NOT NULL CHECK (lan IN (1, 2, 3)),
  noi_dung TEXT NOT NULL,
  muc_rubric INTEGER,
  nhan_xet TEXT,
  nguon_cham TEXT,
  tao_luc TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (luot_id, lan)
);

CREATE TABLE IF NOT EXISTS chan_doan (
  id TEXT PRIMARY KEY,
  luot_id TEXT NOT NULL UNIQUE REFERENCES luot_lam(id),
  ma_ngo_nhan TEXT NOT NULL,
  can_cu TEXT NOT NULL,
  gia_thuyet TEXT NOT NULL,
  do_tin_cay REAL NOT NULL,
  cau_hoi_goi_mo TEXT NOT NULL,
  nguon TEXT NOT NULL,
  can_duyet INTEGER NOT NULL,
  ly_do_duyet TEXT,
  ket_qua_luat TEXT NOT NULL,
  tao_luc TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS thi_nghiem (
  luot_id TEXT PRIMARY KEY REFERENCES luot_lam(id),
  cau_hinh TEXT NOT NULL,
  ly_do TEXT NOT NULL,
  tom_tat TEXT
);

-- Bài toán giáo viên soạn và lưu lại để dùng nhiều lần (nội dung là một tình huống đã qua kiểm tra schema).
CREATE TABLE IF NOT EXISTS bai_tu_nhap (
  id TEXT PRIMARY KEY,
  tinh_huong TEXT NOT NULL,
  tao_luc TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS danh_gia_gv (
  chan_doan_id TEXT PRIMARY KEY REFERENCES chan_doan(id),
  ket_luan TEXT NOT NULL CHECK (ket_luan IN ('dung', 'chua_phu_hop', 'sai')),
  ma_sua TEXT,
  ghi_chu TEXT,
  tao_luc TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

async function khoiTao() {
  if (!CONFIG.tursoUrl) await db.executeMultiple("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await db.executeMultiple(SCHEMA);
  // Cơ sở dữ liệu tạo từ phiên bản cũ thiếu cột: de_bai (đề giáo viên tự nhập), giai_thich (lời giải thích sau 3 bước).
  const themCot = async (bang: string, cot: string) => {
    const r = await db.execute(`PRAGMA table_info(${bang})`);
    if (!r.rows.some((c) => c.name === cot)) await db.execute(`ALTER TABLE ${bang} ADD COLUMN ${cot} TEXT`);
  };
  await themCot("phien", "de_bai");
  await themCot("luot_lam", "giai_thich");
}

// Khởi tạo một lần cho mỗi instance; nếu lỗi thì lần gọi sau thử lại thay vì kẹt ở lỗi cũ.
let chuanBi = khoiTao();
const doiSanSang = () => (chuanBi = chuanBi.catch(() => khoiTao()));

export type Dong = Record<string, unknown>;

const thanhDong = (columns: string[], row: ArrayLike<unknown>): Dong => Object.fromEntries(columns.map((c, i) => [c, row[i]]));

export const lay = async (sql: string, ...thamSo: InValue[]): Promise<Dong | undefined> => {
  await doiSanSang();
  const r = await db.execute({ sql, args: thamSo });
  return r.rows[0] ? thanhDong(r.columns, r.rows[0]) : undefined;
};
export const layNhieu = async (sql: string, ...thamSo: InValue[]): Promise<Dong[]> => {
  await doiSanSang();
  const r = await db.execute({ sql, args: thamSo });
  return r.rows.map((row) => thanhDong(r.columns, row));
};
export const chay = async (sql: string, ...thamSo: InValue[]) => {
  await doiSanSang();
  const r = await db.execute({ sql, args: thamSo });
  return { changes: r.rowsAffected };
};
