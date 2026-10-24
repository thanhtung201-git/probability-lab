// Thí nghiệm rút thẻ đánh số 1..so_the, theo lượt. Ba chế độ:
//   tung_so  – rút 1 thẻ, ghi từng số                                    → M4 (thẻ "đặc biệt" khó rút hơn?)
//   bien_co  – rút 1 thẻ, ghi thỏa biến cố hay không (chẵn, bội của k…)  → M3 và bài tính xác suất của biến cố
//   hai_the  – rút 2 thẻ có/không hoàn lại, ghi số thẻ thỏa biến cố      → so sánh có/không hoàn lại
// Số trên thẻ chính là giá trị "mặt" của mỗi lần rút.
import type { BienCoThe, CauHinhThe, KetQuaThiNghiem } from "../../types";
import { GIOI_HAN } from "../../schema";
import { PhanSo } from "../phan-so";
import { taoRng, type Rng } from "../rng";
import { phanPhoiDem } from "../to-hop";
import type { KhoaKetQua, LuotXucXac, SoLieuXucXac } from "./xuc-xac";

const laNguyenTo = (x: number) => {
  if (x < 2) return false;
  for (let i = 2; i * i <= x; i++) if (x % i === 0) return false;
  return true;
};

/** Thẻ số `x` có thỏa biến cố không. */
export function thoaBienCo(bc: BienCoThe, x: number): boolean {
  const k = bc.k ?? 0;
  switch (bc.kieu) {
    case "chan":
      return x % 2 === 0;
    case "le":
      return x % 2 === 1;
    case "boi":
      return k > 0 && x % k === 0;
    case "nguyen_to":
      return laNguyenTo(x);
    case "lon_hon":
      return x > k;
    case "nho_hon":
      return x < k;
    case "tap_hop":
      return bc.so?.includes(x) ?? false;
  }
}

/**
 * Đọc danh sách số giáo viên gõ cho biến cố tự chọn: "2, 5, 7", "2 5 7" hay có khoảng "3-6, 9".
 * Trả về các số từ 1 đến GIOI_HAN.SO_THE_TOI_DA đã sắp xếp, không trùng; null khi gõ sai hoặc trống.
 */
export function docTapSo(text: string): number[] | null {
  const phan = text.split(/[,;\s]+/).filter(Boolean);
  if (!phan.length) return null;
  const kq = new Set<number>();
  for (const p of phan) {
    const m = p.match(/^(\d{1,6})(?:-(\d{1,6}))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a < 1 || b > GIOI_HAN.SO_THE_TOI_DA || a > b) return null;
    for (let x = a; x <= b; x++) kq.add(x);
  }
  return [...kq].sort((x, y) => x - y);
}

/** Mô tả biến cố bằng lời, ví dụ "số chẵn", "bội của 3". */
export function moTaBienCo(bc: BienCoThe): string {
  switch (bc.kieu) {
    case "chan":
      return "số chẵn";
    case "le":
      return "số lẻ";
    case "boi":
      return `bội của ${bc.k}`;
    case "nguyen_to":
      return "số nguyên tố";
    case "lon_hon":
      return `số lớn hơn ${bc.k}`;
    case "nho_hon":
      return `số nhỏ hơn ${bc.k}`;
    case "tap_hop":
      return `một trong các số ${(bc.so ?? []).join(", ")}`;
  }
}

/** Các số thỏa biến cố trong 1..so_the. */
export const cacSoThuanLoi = (soThe: number, bc: BienCoThe): number[] =>
  Array.from({ length: soThe }, (_, i) => i + 1).filter((x) => thoaBienCo(bc, x));

export function cacKhoaThe(ch: CauHinhThe): KhoaKetQua[] {
  const N = ch.so_the;
  if (ch.che_do === "tung_so") {
    return Array.from({ length: N }, (_, i) => ({ khoa: String(i + 1), nhan: `Thẻ ${i + 1}`, xac_suat: new PhanSo(1, N) }));
  }
  const a = cacSoThuanLoi(N, ch.bien_co).length;
  const ten = moTaBienCo(ch.bien_co);
  if (ch.che_do === "bien_co") {
    return [
      { khoa: "co", nhan: `Thuận lợi (${ten})`, xac_suat: new PhanSo(a, N) },
      { khoa: "khong", nhan: "Không thuận lợi", xac_suat: new PhanSo(N - a, N) },
    ];
  }
  return phanPhoiDem(N, a, 2, ch.hoan_lai).map((p, k) => ({ khoa: String(k), nhan: `${k} thẻ ${ten}`, xac_suat: p }));
}

/** Một lượt thí nghiệm. */
export function motLuotThe(ch: CauHinhThe, rng: Rng): LuotXucXac {
  const N = ch.so_the;
  const rut = () => Math.floor(rng() * N) + 1;
  if (ch.che_do === "hai_the") {
    const a = rut();
    let b = rut();
    // Không hoàn lại: rút lại cho đến khi khác thẻ đã rút (tương đương chọn đều trong phần còn lại).
    while (!ch.hoan_lai && b === a) b = rut();
    const dem = [a, b].filter((x) => thoaBienCo(ch.bien_co, x)).length;
    return { mat: [a, b], khoa: String(dem) };
  }
  const x = rut();
  if (ch.che_do === "tung_so") return { mat: [x], khoa: String(x) };
  return { mat: [x], khoa: thoaBienCo(ch.bien_co, x) ? "co" : "khong" };
}

export const soMatHienThiThe = (ch: CauHinhThe) => (ch.che_do === "hai_the" ? 2 : 1);

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

export function tongHopThe(ch: CauHinhThe, sl: SoLieuXucXac): KetQuaThiNghiem {
  const khoa = cacKhoaThe(ch);
  const chinh = khoa.find((k) => k.khoa === ch.theo_doi[0]) ?? khoa[0]!;
  const n = sl.so_ghi_nhan;
  const tanSuat = (k: string) => (n ? (sl.dem[k] ?? 0) / n : 0);
  const moTa = ch.theo_doi
    .map((k) => `${khoa.find((x) => x.khoa === k)?.nhan.toLowerCase() ?? k} xuất hiện ${so(sl.dem[k] ?? 0)} lần (${pt(tanSuat(k))})`)
    .join(", ");
  return {
    cau_hinh: ch,
    tan_so: { ...sl.dem },
    tan_suat: tanSuat(chinh.khoa),
    ly_thuyet: chinh.xac_suat.toString(),
    ly_thuyet_so: chinh.xac_suat.soThuc(),
    du_lieu_bieu_do: [],
    chi_tiet: { so_luot: sl.so_luot, so_ghi_nhan: sl.so_ghi_nhan, mo_ta: moTa },
  };
}

/** Chạy theo lô `so_lan_goi_y` lượt. */
export function chayThe(ch: CauHinhThe): KetQuaThiNghiem {
  const rng = taoRng(ch.seed);
  const sl: SoLieuXucXac = { so_luot: 0, so_ghi_nhan: 0, dem: {} };
  for (let i = 0; i < ch.so_lan_goi_y; i++) {
    const l = motLuotThe(ch, rng);
    sl.so_luot++;
    if (l.khoa === null) continue;
    sl.so_ghi_nhan++;
    sl.dem[l.khoa] = (sl.dem[l.khoa] ?? 0) + 1;
  }
  return tongHopThe(ch, sl);
}
