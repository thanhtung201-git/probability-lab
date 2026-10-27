// Chuyển kết quả AI đọc đề (các trường phẳng, trường không dùng là null) thành biến cố có kiểu rõ ràng của bài toán tổng quát.
// AI chỉ điền biểu mẫu; mọi con số xác suất vẫn do bộ đếm chính xác tính ra.
import type { BienCoBaiToan, DaiLuongBaiToan, DieuKienBaiToan, LocVat } from "../../types";
import type { NguonMo } from "./bai-mo";

export interface DkAI {
  loai: DieuKienBaiToan["loai"];
  k: number | null;
  k2: number | null;
  m: number | null;
  r: number | null;
  d: number | null;
  khong: boolean;
}

export interface LocAI {
  mau: string | null;
  so: number | null;
  dk: DkAI | null;
}

export interface BienCoAI {
  kieu: "so" | "mau" | "quan_he" | "dem" | "dem_bang" | "vi_tri" | "truoc_sau" | "dung_thu_tu" | "lien_tiep";
  dai_luong: DaiLuongBaiToan | null;
  dk: DkAI | null;
  mau_loai: "it_nhat" | "dung" | "cung_mau" | "khac_mau" | null;
  mau: string | null;
  k_mau: number | null;
  quan_he: Extract<BienCoBaiToan, { kieu: "quan_he" }>["loai"] | null;
  /** Loại vật chính: vật cần đếm, vật ở vị trí cần xét, vật lấy trước, vế a của "bằng nhau". */
  loc: LocAI | null;
  /** Loại vật thứ hai: vật lấy sau, vế b của "bằng nhau". */
  loc2: LocAI | null;
  /** Dãy các loại vật theo từng lần lấy (chỉ dùng cho "dung_thu_tu"). */
  day: LocAI[];
  so_sanh: Extract<BienCoBaiToan, { kieu: "dem" }>["so_sanh"] | null;
  /** Số k của "dem" và của "lien_tiep". */
  k_dem: number | null;
  k_dem2: number | null;
  /** Lần lấy cần xét cho "vi_tri": 1, 2, 3, 4; số 0 nghĩa là lần lấy cuối cùng. */
  lan: number | null;
  khong: boolean;
}

/** Điều kiện trên số từ các trường phẳng của AI; tham số thiếu lấy giá trị mặc định (người dùng sẽ thấy và sửa ở biểu mẫu). */
export function dieuKienTuAI(x: DkAI): DieuKienBaiToan {
  const k = x.k ?? 0;
  switch (x.loai) {
    case "chan":
    case "le":
    case "nguyen_to":
    case "hop_so":
    case "duong":
    case "am":
    case "chinh_phuong":
    case "chu_so_khac_nhau":
    case "doi_xung":
    case "hang_chuc_chan":
    case "hang_chuc_le":
      return { loai: x.loai };
    case "chia_het":
    case "khong_chia_het":
    case "uoc_cua":
      return { loai: x.loai, k: Math.max(1, k) };
    case "bang":
    case "khac":
    case "lon_hon":
    case "nho_hon":
    case "lon_hon_hoac_bang":
    case "nho_hon_hoac_bang":
    case "tong_chu_so":
      return { loai: x.loai, k };
    case "trong_doan":
    case "ngoai_doan":
      return { loai: x.loai, k, k2: x.k2 ?? k };
    case "du":
      return { loai: "du", m: x.m ?? 3, r: x.r ?? 0 };
    case "co_chu_so":
    case "tan_cung":
    case "hang_chuc":
      return { loai: x.loai, d: x.d ?? 0 };
  }
}

function locTuAI(l: LocAI | null): LocVat {
  if (!l) return {};
  return {
    ...(l.mau ? { mau: l.mau } : {}),
    ...(l.so !== null ? { so: l.so } : {}),
    ...(l.dk ? { dk: dieuKienTuAI(l.dk) } : {}),
  };
}

/** Biến cố lá từ các trường phẳng của AI. `mauDau` là màu dùng khi AI quên điền màu cần xét. */
export function bienCoTuAI(b: BienCoAI, mauDau = ""): BienCoBaiToan {
  const khong = b.khong ? { khong: true as const } : {};
  switch (b.kieu) {
    case "so":
      return { kieu: "so", dai_luong: b.dai_luong ?? "tong", dieu_kien: b.dk ? dieuKienTuAI(b.dk) : { loai: "chan" }, ...khong };
    case "mau":
      return { kieu: "mau", loai: b.mau_loai ?? "it_nhat", mau: b.mau || mauDau, ...(b.mau_loai === "dung" ? { k: b.k_mau ?? 1 } : {}), ...khong };
    case "quan_he":
      return { kieu: "quan_he", loai: b.quan_he ?? "khac_nhau", ...khong };
    case "dem":
      return {
        kieu: "dem",
        loc: locTuAI(b.loc),
        so_sanh: b.so_sanh ?? "it_nhat",
        k: b.k_dem ?? 1,
        ...(b.so_sanh === "trong_doan" ? { k2: b.k_dem2 ?? b.k_dem ?? 1 } : {}),
        ...khong,
      };
    case "dem_bang":
      return { kieu: "dem_bang", a: locTuAI(b.loc), b: locTuAI(b.loc2), ...khong };
    case "vi_tri":
      return { kieu: "vi_tri", lan: !b.lan || b.lan <= 0 ? "cuoi" : b.lan, loc: locTuAI(b.loc), ...khong };
    case "truoc_sau":
      return { kieu: "truoc_sau", truoc: locTuAI(b.loc), sau: locTuAI(b.loc2), ...khong };
    case "dung_thu_tu":
      return { kieu: "dung_thu_tu", day: b.day.map(locTuAI), ...khong };
    case "lien_tiep":
      return { kieu: "lien_tiep", loc: locTuAI(b.loc), k: b.k_dem ?? 2, ...khong };
  }
}

export interface NguonAI {
  nguon_kieu: "day_so" | "ds_so" | "danh_so" | "theo_mau" | "mau_va_so";
  tu: number | null;
  den: number | null;
  buoc: number | null;
  loc: DkAI[];
  text: string | null;
  n: number | null;
  nhom: string | null;
}

/** Nguồn vật từ các trường phẳng của AI; tham số thiếu lấy giá trị mặc định để người dùng thấy và sửa. */
export function nguonTuAI(d: NguonAI): NguonMo {
  switch (d.nguon_kieu) {
    case "day_so":
      return { kieu: "day_so", tu: d.tu ?? 10, den: d.den ?? 99, buoc: d.buoc ?? 1, loc: d.loc.map((l) => ({ dk: dieuKienTuAI(l), ...(l.khong ? { khong: true as const } : {}) })) };
    case "ds_so":
      return { kieu: "ds_so", text: d.text ?? "" };
    case "danh_so":
      return { kieu: "danh_so", n: d.n ?? 4 };
    default:
      return { kieu: d.nguon_kieu, nhom: d.nhom ?? "" };
  }
}

const locRong = (l: LocAI | null) => !l || (!l.mau && l.so === null && !l.dk);

/**
 * Điều AI còn thiếu để dựng được biến cố (null nếu đủ). Dùng để thử lại hoặc báo người dùng,
 * thay vì âm thầm điền giá trị mặc định rồi tính ra một xác suất của đề khác.
 */
export function thieuBienCo(b: BienCoAI): string | null {
  switch (b.kieu) {
    case "so":
      return b.dk ? null : "thiếu điều kiện trên số (chẵn, lẻ, bằng k …)";
    case "mau":
      return b.mau_loai ? null : "thiếu kiểu biến cố theo màu";
    case "quan_he":
      return b.quan_he ? null : "thiếu quan hệ giữa các số";
    case "dem":
      return locRong(b.loc) || !b.so_sanh ? "thiếu loại vật cần đếm hoặc cách so sánh số lượng" : null;
    case "dem_bang":
      return locRong(b.loc) || locRong(b.loc2) ? "thiếu một trong hai loại vật cần so sánh số lượng" : null;
    case "vi_tri":
      return locRong(b.loc) || b.lan === null ? "thiếu loại vật hoặc lần lấy" : null;
    case "truoc_sau":
      return locRong(b.loc) || locRong(b.loc2) ? "thiếu một trong hai loại vật cần so thứ tự" : null;
    case "dung_thu_tu":
      return b.day.length === 0 || b.day.some(locRong) ? "dãy thứ tự lấy chưa đầy đủ" : null;
    case "lien_tiep":
      return locRong(b.loc) || b.k_dem === null ? "thiếu loại vật hoặc số lần liên tiếp" : null;
  }
}
