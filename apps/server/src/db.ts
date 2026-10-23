// Lưu trữ SQLite bằng module node:sqlite có sẵn trong Node.js (không cần biên dịch thư viện ngoài).
import { DatabaseSync } from "node:sqlite";
import { CONFIG } from "./config";

export const db = new DatabaseSync(CONFIG.dbPath);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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
`);

// Cơ sở dữ liệu tạo từ phiên bản cũ chưa có cột de_bai (đề giáo viên tự nhập).
if (!(db.prepare("PRAGMA table_info(phien)").all() as { name: string }[]).some((c) => c.name === "de_bai")) {
  db.exec("ALTER TABLE phien ADD COLUMN de_bai TEXT");
}

// Cơ sở dữ liệu cũ chưa có cột giai_thich (lời giải thích dành cho nhóm sau 3 bước).
if (!(db.prepare("PRAGMA table_info(luot_lam)").all() as { name: string }[]).some((c) => c.name === "giai_thich")) {
  db.exec("ALTER TABLE luot_lam ADD COLUMN giai_thich TEXT");
}

export type Dong = Record<string, unknown>;

export const lay = (sql: string, ...thamSo: (string | number | null)[]) =>
  db.prepare(sql).get(...thamSo) as Dong | undefined;
export const layNhieu = (sql: string, ...thamSo: (string | number | null)[]) =>
  db.prepare(sql).all(...thamSo) as Dong[];
export const chay = (sql: string, ...thamSo: (string | number | null)[]) => db.prepare(sql).run(...thamSo);
