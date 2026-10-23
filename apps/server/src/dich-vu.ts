// Nghiệp vụ: chẩn đoán lượt làm, chấm rubric, tổng hợp cho bảng giáo viên.
import {
  bienDich,
  chanDoanBangLuat,
  chiSoChuyenDoi,
  hopNhat,
  type CauHinhThiNghiem,
  type MaNgoNhan,
  type MucRubric,
  type TinhHuong,
} from "@plab/core";
import { randomUUID } from "node:crypto";
import { locThongTin } from "./an-danh";
import { chay, lay, layNhieu, type Dong } from "./db";
import { chamRubricBangLLM, chanDoanBangLLM } from "./llm/groq";
import { THU_VIEN_NGO_NHAN } from "./thu-vien";

export class LoiNghiepVu extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const docJson = <T>(v: unknown) => JSON.parse(String(v)) as T;

export async function chanDoanLan1(luot: Dong, th: TinhHuong, noiDung: string) {
  const text = locThongTin(noiDung);
  const luat = chanDoanBangLuat(text, THU_VIEN_NGO_NHAN, th);
  const llm = await chanDoanBangLLM(text, th, THU_VIEN_NGO_NHAN);
  const cd = hopNhat(luat, llm, text);
  const bd = bienDich(cd, th, THU_VIEN_NGO_NHAN, Number(luot.seed));
  const id = randomUUID();

  chay(
    `INSERT INTO chan_doan (id, luot_id, ma_ngo_nhan, can_cu, gia_thuyet, do_tin_cay, cau_hoi_goi_mo, nguon, can_duyet, ly_do_duyet, ket_qua_luat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    String(luot.id),
    cd.ma_ngo_nhan,
    cd.can_cu,
    JSON.stringify(cd.gia_thuyet),
    cd.do_tin_cay,
    cd.cau_hoi_goi_mo,
    cd.nguon,
    cd.can_duyet ? 1 : 0,
    cd.ly_do_duyet,
    JSON.stringify(luat),
  );
  chay(`INSERT INTO thi_nghiem (luot_id, cau_hinh, ly_do) VALUES (?, ?, ?)`, String(luot.id), JSON.stringify(bd.cau_hinh), bd.ly_do);
  return { chan_doan: { id, ...cd }, thi_nghiem: { cau_hinh: bd.cau_hinh, ly_do: bd.ly_do } };
}

/** Chấm rubric bằng AI; không có AI thì ước lượng từ bộ luật (hiểu đúng → 3, ngộ nhận → 1). */
export async function chamRubric(th: TinhHuong, noiDung: string) {
  const text = locThongTin(noiDung);
  const llm = await chamRubricBangLLM(text, th);
  if (llm) return { muc: llm.muc as MucRubric, nhan_xet: llm.nhan_xet, nguon: "llm" };
  const luat = chanDoanBangLuat(text, THU_VIEN_NGO_NHAN, th);
  if (luat.ma_ngo_nhan === "M0") return { muc: 3 as MucRubric, nhan_xet: "Ước lượng từ bộ luật, chờ giáo viên xác nhận", nguon: "luat" };
  if (luat.ma_ngo_nhan && luat.ma_ngo_nhan !== "KXD")
    return { muc: 1 as MucRubric, nhan_xet: "Ước lượng từ bộ luật, chờ giáo viên xác nhận", nguon: "luat" };
  return { muc: null, nhan_xet: "Chưa chấm được, chờ giáo viên", nguon: "luat" };
}

export function trangThaiLuot(luotId: string) {
  const luot = lay(`SELECT * FROM luot_lam WHERE id = ?`, luotId);
  if (!luot) throw new LoiNghiepVu("Không tìm thấy lượt làm", 404);
  const traLoi = layNhieu(`SELECT * FROM tra_loi WHERE luot_id = ? ORDER BY lan`, luotId);
  const cd = lay(
    `SELECT c.*, d.ket_luan, d.ma_sua FROM chan_doan c LEFT JOIN danh_gia_gv d ON d.chan_doan_id = c.id WHERE c.luot_id = ?`,
    luotId,
  );
  const tn = lay(`SELECT * FROM thi_nghiem WHERE luot_id = ?`, luotId);
  return {
    luot: { ...luot, giai_thich: undefined } as Dong,
    giai_thich: luot.giai_thich ? JSON.parse(String(luot.giai_thich)) : null,
    tra_loi: traLoi,
    chan_doan: cd ? { ...cd, gia_thuyet: docJson(cd.gia_thuyet), can_duyet: cd.can_duyet === 1 } : null,
    thi_nghiem: tn
      ? { cau_hinh: docJson<CauHinhThiNghiem>(tn.cau_hinh), ly_do: tn.ly_do, tom_tat: tn.tom_tat ? docJson(tn.tom_tat) : null }
      : null,
  };
}

/** Mã cuối cùng của một chẩn đoán: mã giáo viên sửa nếu có, ngược lại mã của hệ thống. */
const maCuoi = (r: Dong) => (r.ma_sua ? String(r.ma_sua) : r.ma_ngo_nhan ? String(r.ma_ngo_nhan) : null) as MaNgoNhan | null;

export function tongQuanPhien(phienId: string) {
  const nhom = layNhieu(
    `SELECT l.id, l.ma_nhom, c.id AS chan_doan_id, c.ma_ngo_nhan, c.do_tin_cay, c.nguon, c.can_duyet, c.ly_do_duyet,
            c.can_cu, d.ket_luan, d.ma_sua,
            (SELECT noi_dung FROM tra_loi WHERE luot_id = l.id AND lan = 1) AS lan1,
            (SELECT noi_dung FROM tra_loi WHERE luot_id = l.id AND lan = 2) AS lan2,
            (SELECT noi_dung FROM tra_loi WHERE luot_id = l.id AND lan = 3) AS lan3,
            (SELECT muc_rubric FROM tra_loi WHERE luot_id = l.id AND lan = 1) AS muc1,
            (SELECT muc_rubric FROM tra_loi WHERE luot_id = l.id AND lan = 2) AS muc2,
            (SELECT muc_rubric FROM tra_loi WHERE luot_id = l.id AND lan = 3) AS muc3
       FROM luot_lam l
       LEFT JOIN chan_doan c ON c.luot_id = l.id
       LEFT JOIN danh_gia_gv d ON d.chan_doan_id = c.id
      WHERE l.phien_id = ?
      ORDER BY l.ma_nhom`,
    phienId,
  );

  const banDo: Record<string, number> = { M0: 0, M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, M6: 0, KXD: 0 };
  for (const n of nhom) {
    const ma = maCuoi(n);
    if (ma) banDo[ma] = (banDo[ma] ?? 0) + 1;
  }
  const hangCho = nhom.filter((n) => n.chan_doan_id && n.can_duyet === 1 && !n.ket_luan);
  const chuyenDoi = chiSoChuyenDoi(
    nhom.map((n) => ({ lan1: (n.muc1 as MucRubric | null) ?? null, lan3: (n.muc3 as MucRubric | null) ?? null })),
  );
  return {
    ban_do: banDo,
    nhom: nhom.map((n): Dong => ({ ...n, ma_cuoi: maCuoi(n), can_duyet: n.can_duyet === 1 })),
    hang_cho: hangCho.map((n) => n.chan_doan_id),
    chuyen_doi: chuyenDoi,
  };
}

const oCsv = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function xuatCsv(phienId: string): string {
  const { nhom } = tongQuanPhien(phienId);
  const cot = ["ma_nhom", "lan1", "ma_he_thong", "nguon", "do_tin_cay", "danh_gia_gv", "ma_gv_sua", "ma_cuoi", "lan2", "lan3", "muc1", "muc2", "muc3"];
  const dong = nhom.map((n) =>
    [n.ma_nhom, n.lan1, n.ma_ngo_nhan, n.nguon, n.do_tin_cay, n.ket_luan, n.ma_sua, n.ma_cuoi, n.lan2, n.lan3, n.muc1, n.muc2, n.muc3]
      .map(oCsv)
      .join(","),
  );
  return "﻿" + [cot.join(","), ...dong].join("\n");
}
