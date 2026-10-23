// Biểu mẫu nhập bài toán tổng quát (giáo viên điền hoặc AI điền sẵn) và hàm dựng cấu hình thí nghiệm từ biểu mẫu.
import { CauHinhBaiToanSchema } from "../../schema";
import type { BienCoBaiToan, CauHinhBaiToan, DieuKienBaiToan, VatTongQuat } from "../../types";

export interface FormBaiToan {
  /** "danh_so": vật đánh số 1..n; "theo_mau": "đỏ 3, xanh 2"; "mau_va_so": "đỏ: 1 2 3; xanh: 4 5". */
  che_do_vat: "danh_so" | "theo_mau" | "mau_va_so";
  n: number;
  nhom: string;
  ten_vat: string;
  so_lan: number;
  hoan_lai: boolean;
  loai_bien_co: "so" | "mau";
  dai_luong: Extract<BienCoBaiToan, { kieu: "so" }>["dai_luong"];
  dieu_kien: DieuKienBaiToan["loai"];
  k: number;
  m: number;
  r: number;
  mau_loai: Extract<BienCoBaiToan, { kieu: "mau" }>["loai"];
  mau: string;
  k_mau: number;
  phu_dinh: boolean;
}

export const FORM_BAI_TOAN_MAC_DINH: FormBaiToan = {
  che_do_vat: "danh_so",
  n: 4,
  nhom: "",
  ten_vat: "bi",
  so_lan: 2,
  hoan_lai: false,
  loai_bien_co: "so",
  dai_luong: "tong",
  dieu_kien: "du",
  k: 3,
  m: 3,
  r: 1,
  mau_loai: "it_nhat",
  mau: "",
  k_mau: 1,
  phu_dinh: false,
};

/** Đọc dãy số "1 2 3", "1,2,3" hoặc có khoảng "1-4, 7" (mỗi số 0 đến 99, giữ nguyên số lần xuất hiện). */
export function docDaySo(text: string): number[] | null {
  const phan = text.split(/[,;\s]+/).filter(Boolean);
  if (!phan.length) return null;
  const kq: number[] = [];
  for (const p of phan) {
    const m = p.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a > b) return null;
    for (let x = a; x <= b; x++) kq.push(x);
  }
  return kq;
}

/** Đọc cách mô tả tập vật; trả về danh sách vật hoặc thông báo lỗi bằng tiếng Việt. */
export function docVatTongQuat(f: Pick<FormBaiToan, "che_do_vat" | "n" | "nhom">): { vat: VatTongQuat[] } | { loi: string } {
  if (f.che_do_vat === "danh_so") {
    const n = Math.round(f.n);
    if (!(n >= 2 && n <= 30)) return { loi: "Số vật phải từ 2 đến 30" };
    return { vat: Array.from({ length: n }, (_, i) => ({ so: i + 1 })) };
  }
  const vat: VatTongQuat[] = [];
  if (f.che_do_vat === "theo_mau") {
    for (const p of f.nhom.split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
      const a = p.match(/^(.+?)\s+(\d+)$/);
      const b = p.match(/^(\d+)\s+(.+)$/);
      const ten = a ? a[1]!.trim() : b?.[2]?.trim();
      const dem = a ? Number(a[2]) : b ? Number(b[1]) : NaN;
      if (!ten || !Number.isFinite(dem)) return { loi: `Không hiểu “${p}”. Viết dạng: đỏ 3, xanh 2` };
      if (dem < 1 || dem > 30) return { loi: "Mỗi màu có từ 1 đến 30 vật" };
      for (let i = 0; i < dem; i++) vat.push({ mau: ten });
    }
  } else {
    for (const p of f.nhom.split(";").map((x) => x.trim()).filter(Boolean)) {
      const i = p.indexOf(":");
      if (i < 1) return { loi: `Không hiểu “${p}”. Viết dạng: đỏ: 1 2 3; xanh: 4 5` };
      const ten = p.slice(0, i).trim();
      const so = docDaySo(p.slice(i + 1));
      if (!so) return { loi: `Các số của màu “${ten}” chưa đúng. Viết các số từ 0 đến 99, cách nhau bằng dấu cách hoặc phẩy` };
      for (const x of so) vat.push({ mau: ten, so: x });
    }
  }
  if (vat.length < 2) return { loi: "Cần ít nhất 2 vật" };
  if (vat.length > 30) return { loi: "Tối đa 30 vật" };
  return { vat };
}

const dieuKienTuForm = (f: FormBaiToan): DieuKienBaiToan => {
  switch (f.dieu_kien) {
    case "chan":
    case "le":
    case "nguyen_to":
      return { loai: f.dieu_kien };
    case "chia_het":
      return { loai: "chia_het", k: f.k };
    case "du":
      return { loai: "du", m: f.m, r: f.r };
    default:
      return { loai: f.dieu_kien, k: f.k };
  }
};

/** Dựng cấu hình thí nghiệm (chưa có seed) từ biểu mẫu, đã kiểm tra bằng schema của lõi. */
export function xayBaiToan(f: FormBaiToan): { cau_hinh: Omit<CauHinhBaiToan, "seed"> } | { loi: string } {
  const v = docVatTongQuat(f);
  if ("loi" in v) return v;
  const bien_co: BienCoBaiToan =
    f.loai_bien_co === "so"
      ? { kieu: "so", dai_luong: f.dai_luong, dieu_kien: dieuKienTuForm(f) }
      : { kieu: "mau", loai: f.mau_loai, mau: f.mau || v.vat.find((x) => x.mau)?.mau, ...(f.mau_loai === "dung" ? { k: f.k_mau } : {}) };
  const cau_hinh: Omit<CauHinhBaiToan, "seed"> = {
    loai: "bai_toan",
    che_do: "bai_toan",
    vat: v.vat,
    ten_vat: f.ten_vat.trim() || "vật",
    so_lan: Math.round(f.so_lan),
    hoan_lai: f.hoan_lai,
    bien_co,
    ...(f.phu_dinh ? { phu_dinh: true } : {}),
    theo_doi: ["co"],
    so_lan_goi_y: 1000,
  };
  const kq = CauHinhBaiToanSchema.safeParse({ ...cau_hinh, seed: 1 });
  if (!kq.success) return { loi: kq.error.issues[0]?.message ?? "Cấu hình chưa hợp lệ" };
  return { cau_hinh };
}
