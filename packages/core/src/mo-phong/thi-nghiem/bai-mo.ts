// Bài toán "mở": ghép nguồn vật + cách lấy + biến cố từ các khối có sẵn, rồi dựng ra cấu hình của bài toán tổng quát
// (bai-toan.ts). Mọi thứ phía sau (tính xác suất, liệt kê, thí nghiệm, lời giải) dùng chung bộ máy của bài toán tổng quát.
import { CauHinhBaiToanSchema, GIOI_HAN } from "../../schema";
import type { BienCoBaiToan, CauHinhBaiToan, DieuKienBaiToan, VatTongQuat } from "../../types";
import { docVatTongQuat } from "./bai-toan-form";
import { moTaBienCoBaiToan, thoaDieuKien } from "./bai-toan";

/** Một bộ lọc trên các số của dãy: giữ lại số thỏa `dk` (hoặc không thỏa, nếu `khong`). */
export interface LocSo {
  dk: DieuKienBaiToan;
  khong?: boolean;
}

export type NguonMo =
  /** Mọi số nguyên từ `tu` đến `den` (bước `buoc`) thỏa tất cả bộ lọc, ví dụ "số lẻ có 2 chữ số". */
  | { kieu: "day_so"; tu: number; den: number; buoc: number; loc: LocSo[] }
  /** Tự liệt kê các số: "11 13 25", "1-5, 8". Mỗi số 0 đến 999. */
  | { kieu: "ds_so"; text: string }
  | { kieu: "danh_so"; n: number }
  | { kieu: "theo_mau"; nhom: string }
  | { kieu: "mau_va_so"; nhom: string };

export interface FormMo {
  nguon: NguonMo;
  ten_vat: string;
  so_lan: number;
  hoan_lai: boolean;
  bien_co: BienCoBaiToan;
  phu_dinh: boolean;
}

export const NGUON_MO_MAC_DINH: NguonMo = { kieu: "day_so", tu: 10, den: 99, buoc: 1, loc: [{ dk: { loai: "le" } }] };

export const FORM_MO_MAC_DINH: FormMo = {
  nguon: NGUON_MO_MAC_DINH,
  ten_vat: "số",
  so_lan: 1,
  hoan_lai: false,
  bien_co: { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chinh_phuong" } },
  phu_dinh: false,
};

/** Tạo danh sách vật từ nguồn; trả về thông báo lỗi bằng tiếng Việt nếu nguồn chưa hợp lệ. */
export function taoVatTuNguon(n: NguonMo): { vat: VatTongQuat[] } | { loi: string } {
  switch (n.kieu) {
    case "day_so": {
      if (![n.tu, n.den, n.buoc].every(Number.isInteger)) return { loi: "Dãy số cần các số nguyên" };
      if (n.tu < 0 || n.den > 999) return { loi: "Các số trong dãy phải từ 0 đến 999" };
      if (n.tu > n.den) return { loi: "Số bắt đầu không được lớn hơn số kết thúc" };
      if (n.buoc < 1) return { loi: "Bước nhảy phải từ 1 trở lên" };
      const vat: VatTongQuat[] = [];
      for (let x = n.tu; x <= n.den; x += n.buoc) if (n.loc.every((l) => thoaDieuKien(l.dk, x) !== (l.khong ?? false))) vat.push({ so: x });
      if (vat.length < 2) return { loi: "Dãy số sau khi lọc còn dưới 2 số, hãy nới điều kiện" };
      if (vat.length > GIOI_HAN.SO_VAT_TOI_DA) return { loi: `Dãy có ${vat.length} số, tối đa ${GIOI_HAN.SO_VAT_TOI_DA}` };
      return { vat };
    }
    case "ds_so": {
      const phan = n.text.split(/[,;\s]+/).filter(Boolean);
      const so: number[] = [];
      for (const p of phan) {
        const m = p.match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
        if (!m) return { loi: `Không hiểu “${p}”. Viết các số từ 0 đến 999, cách nhau bằng dấu cách hoặc phẩy (có thể viết 1-5)` };
        const a = Number(m[1]);
        const b = m[2] === undefined ? a : Number(m[2]);
        if (a > b) return { loi: `Khoảng “${p}” bị ngược` };
        for (let x = a; x <= b; x++) so.push(x);
      }
      if (so.length < 2) return { loi: "Cần ít nhất 2 số" };
      if (so.length > GIOI_HAN.SO_VAT_TOI_DA) return { loi: `Tối đa ${GIOI_HAN.SO_VAT_TOI_DA} số` };
      return { vat: so.map((x) => ({ so: x })) };
    }
    case "danh_so":
      return docVatTongQuat({ che_do_vat: "danh_so", n: n.n, nhom: "" });
    case "theo_mau":
    case "mau_va_so":
      return docVatTongQuat({ che_do_vat: n.kieu, n: 0, nhom: n.nhom });
  }
}

/** Dựng cấu hình thí nghiệm (chưa có seed) từ biểu mẫu, đã kiểm tra bằng schema của lõi. */
export function xayBaiMo(f: FormMo): { cau_hinh: Omit<CauHinhBaiToan, "seed"> } | { loi: string } {
  const v = taoVatTuNguon(f.nguon);
  if ("loi" in v) return v;
  const cau_hinh: Omit<CauHinhBaiToan, "seed"> = {
    loai: "bai_toan",
    che_do: "bai_toan",
    vat: v.vat,
    ten_vat: f.ten_vat.trim() || "vật",
    so_lan: Math.round(f.so_lan),
    hoan_lai: f.hoan_lai,
    bien_co: f.bien_co,
    ...(f.phu_dinh ? { phu_dinh: true } : {}),
    theo_doi: ["co"],
    so_lan_goi_y: 1000,
  };
  const kq = CauHinhBaiToanSchema.safeParse({ ...cau_hinh, seed: 1 });
  if (!kq.success) return { loi: kq.error.issues[0]?.message ?? "Cấu hình chưa hợp lệ" };
  return { cau_hinh };
}

/** Mô tả nguồn bằng lời, ví dụ "các số từ 10 đến 99 thỏa: là số lẻ". */
export function moTaNguon(n: NguonMo): string {
  switch (n.kieu) {
    case "day_so": {
      const loc = n.loc.map((l) => `${l.khong ? "không " : ""}${moTaDK(l.dk)}`);
      return `các số từ ${n.tu} đến ${n.den}${n.buoc > 1 ? ` (bước ${n.buoc})` : ""}${loc.length ? `, giữ lại số ${loc.join(" và ")}` : ""}`;
    }
    case "ds_so":
      return `các số ${n.text.trim()}`;
    case "danh_so":
      return `${n.n} vật đánh số từ 1 đến ${n.n}`;
    case "theo_mau":
      return `các vật: ${n.nhom.trim()}`;
    case "mau_va_so":
      return `các vật: ${n.nhom.trim()}`;
  }
}

const moTaDK = (dk: DieuKienBaiToan) => moTaBienCoBaiToan({ bien_co: { kieu: "so", dai_luong: "tong", dieu_kien: dk }, ten_vat: "vật", so_lan: 1 }).replace(/^tổng các số /, "");

/** Câu mô tả cả bài bằng lời để người dùng đối chiếu với đề trước khi tin kết quả. */
export function moTaBaiMo(f: FormMo, soVat: number): string {
  const tv = f.ten_vat.trim() || "vật";
  const lay = f.so_lan === 1 ? `Chọn ngẫu nhiên 1 ${tv}` : `Lấy lần lượt ${f.so_lan} ${tv}, ${f.hoan_lai ? "có hoàn lại" : "không hoàn lại"}`;
  const bc = moTaBienCoBaiToan({ bien_co: f.bien_co, phu_dinh: f.phu_dinh, ten_vat: tv, so_lan: f.so_lan });
  const dai = f.bien_co.kieu === "so" && f.so_lan === 1 ? " (xét trực tiếp số vừa chọn)" : "";
  return `${lay} từ ${soVat} ${tv} (${moTaNguon(f.nguon)}). Tính xác suất biến cố: ${bc}${dai}.`;
}


