// Thí nghiệm lấy bi từ hộp, theo lượt, cùng cách tổ chức với xúc xắc và đồng xu. Hai chế độ:
//   phan_phoi  – lấy 1 bi (ghi màu) hoặc 2-3 bi có/không hoàn lại (ghi số bi màu mục tiêu)  → M3 và so sánh có/không hoàn lại
//   dieu_kien  – có hoàn lại: sau k lần liên tiếp cùng ra một màu, lần kế tiếp ra màu gì?     → M1
// Mỗi bi lấy ra được biểu diễn bằng số = chỉ số nhóm màu + 1 (để dùng chung giao diện với xúc xắc).
import type { CauHinhBi, KetQuaThiNghiem, NhomBi } from "../../types";
import { PhanSo } from "../phan-so";
import { taoRng, type Rng } from "../rng";
import { phanPhoiDem } from "../to-hop";
import type { KhoaKetQua, LuotXucXac, SoLieuXucXac } from "./xuc-xac";

export const tongBi = (hop: NhomBi[]) => hop.reduce((s, g) => s + g.so, 0);

/** Danh sách phẳng chỉ số nhóm của từng viên bi, ví dụ [0,0,0,1,1] cho 3 đỏ và 2 xanh. */
const danhSachBi = (hop: NhomBi[]): number[] => hop.flatMap((g, i) => Array<number>(g.so).fill(i));

const chiSoMau = (hop: NhomBi[], ten: string) => hop.findIndex((g) => g.ten === ten);

type BiPhanPhoi = Extract<CauHinhBi, { che_do: "phan_phoi" }>;

/** Cấu hình ghi nhận "có / không thỏa" một biến cố (ít nhất 1 bi màu X, cùng màu, khác màu) thay vì đếm số bi. */
export const laSuKienBi = (ch: CauHinhBi): ch is BiPhanPhoi & { su_kien: "it_nhat" | "cung_mau" | "khac_mau" } =>
  ch.che_do === "phan_phoi" && ch.so_lay > 1 && (ch.su_kien === "it_nhat" || ch.su_kien === "cung_mau" || ch.su_kien === "khac_mau");

/** Mô tả biến cố bằng lời, ví dụ "có ít nhất 1 bi vàng". */
export function moTaSuKienBi(ch: BiPhanPhoi): string {
  switch (ch.su_kien) {
    case "it_nhat":
      return `có ít nhất 1 bi ${ch.mau_muc_tieu}`;
    case "cung_mau":
      return "hai bi cùng màu";
    case "khac_mau":
      return "hai bi khác màu";
    default:
      return `số bi ${ch.mau_muc_tieu}`;
  }
}

const thoaSuKien = (ch: BiPhanPhoi, rut: number[], dich: number): boolean =>
  ch.su_kien === "it_nhat" ? rut.includes(dich) : ch.su_kien === "cung_mau" ? rut.every((g) => g === rut[0]) : rut[0] !== rut[1];

/** Xác suất biến cố, đếm trực tiếp mọi cách lấy có thứ tự (khác viên bi nếu không hoàn lại) bằng phân số chính xác. */
function xacSuatSuKienBi(ch: BiPhanPhoi): PhanSo {
  const ds = danhSachBi(ch.hop);
  const N = ds.length;
  const dich = chiSoMau(ch.hop, ch.mau_muc_tieu);
  let tong = 0n;
  let thoa = 0n;
  const rut: number[] = [];
  const dung: boolean[] = Array(N).fill(false);
  const duyet = () => {
    if (rut.length === ch.so_lay) {
      tong++;
      if (thoaSuKien(ch, rut, dich)) thoa++;
      return;
    }
    for (let i = 0; i < N; i++) {
      if (!ch.hoan_lai && dung[i]) continue;
      dung[i] = true;
      rut.push(ds[i]!);
      duyet();
      rut.pop();
      dung[i] = false;
    }
  };
  duyet();
  return new PhanSo(thoa, tong);
}

/** Các kết quả được ghi nhận và xác suất lý thuyết của từng kết quả. */
export function cacKhoaBi(ch: CauHinhBi): KhoaKetQua[] {
  const N = tongBi(ch.hop);
  if (ch.che_do === "dieu_kien") {
    // Có hoàn lại nên các lần lấy độc lập: lần kế tiếp ra màu g với xác suất so_g / N.
    return ch.hop.map((g) => ({ khoa: g.ten, nhan: `Bi ${g.ten}`, xac_suat: new PhanSo(g.so, N) }));
  }
  if (ch.so_lay === 1) {
    return ch.hop.map((g) => ({ khoa: g.ten, nhan: `Bi ${g.ten}`, xac_suat: new PhanSo(g.so, N) }));
  }
  if (laSuKienBi(ch)) {
    const p = xacSuatSuKienBi(ch);
    return [
      { khoa: "co", nhan: `Thuận lợi: ${moTaSuKienBi(ch)}`, xac_suat: p },
      { khoa: "khong", nhan: "Không thuận lợi", xac_suat: PhanSo.MOT.tru(p) },
    ];
  }
  const mau = ch.hop.find((g) => g.ten === ch.mau_muc_tieu)!;
  return phanPhoiDem(N, mau.so, ch.so_lay, ch.hoan_lai).map((p, k) => ({
    khoa: String(k),
    nhan: `${k} bi ${mau.ten}`,
    xac_suat: p,
  }));
}

/** Một lượt thí nghiệm. */
export function motLuotBi(ch: CauHinhBi, rng: Rng): LuotXucXac {
  const ds = danhSachBi(ch.hop);
  const N = ds.length;
  if (ch.che_do === "dieu_kien") {
    const lap = chiSoMau(ch.hop, ch.mau_lap);
    const mat: number[] = [];
    for (let i = 0; i < ch.so_lan_truoc; i++) {
      const g = ds[Math.floor(rng() * N)]!;
      mat.push(g + 1);
      if (g !== lap) return { mat, khoa: null };
    }
    const cuoi = ds[Math.floor(rng() * N)]!;
    mat.push(cuoi + 1);
    return { mat, khoa: ch.hop[cuoi]!.ten };
  }

  const rut: number[] = [];
  if (ch.hoan_lai) {
    for (let i = 0; i < ch.so_lay; i++) rut.push(ds[Math.floor(rng() * N)]!);
  } else {
    // Không hoàn lại: chọn lần lượt trong phần còn lại.
    const conLai = [...ds];
    for (let i = 0; i < ch.so_lay; i++) rut.push(conLai.splice(Math.floor(rng() * conLai.length), 1)[0]!);
  }
  const mat = rut.map((g) => g + 1);
  if (ch.so_lay === 1) return { mat, khoa: ch.hop[rut[0]!]!.ten };
  const dich = chiSoMau(ch.hop, ch.mau_muc_tieu);
  if (laSuKienBi(ch)) return { mat, khoa: thoaSuKien(ch, rut, dich) ? "co" : "khong" };
  return { mat, khoa: String(rut.filter((g) => g === dich).length) };
}

/** Số bi hiển thị trong một lượt. */
export const soMatHienThiBi = (ch: CauHinhBi) => (ch.che_do === "dieu_kien" ? ch.so_lan_truoc + 1 : ch.so_lay);

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

export function tongHopBi(ch: CauHinhBi, sl: SoLieuXucXac): KetQuaThiNghiem {
  const khoa = cacKhoaBi(ch);
  const chinh = khoa.find((k) => k.khoa === ch.theo_doi[0]) ?? khoa[0]!;
  const n = sl.so_ghi_nhan;
  const tanSuat = (k: string) => (n ? (sl.dem[k] ?? 0) / n : 0);

  let moTa: string;
  if (ch.che_do === "dieu_kien") {
    moTa =
      `có ${so(sl.so_ghi_nhan)} lượt mà ${ch.so_lan_truoc} lần đầu đều lấy được bi ${ch.mau_lap}; ` +
      `ở lần kế tiếp, ` +
      ch.hop.map((g) => `bi ${g.ten} xuất hiện ${so(sl.dem[g.ten] ?? 0)} lần (${pt(tanSuat(g.ten))})`).join(", ");
  } else {
    moTa = ch.theo_doi
      .map((k) => `${khoa.find((x) => x.khoa === k)?.nhan.toLowerCase() ?? k} xuất hiện ${so(sl.dem[k] ?? 0)} lần (${pt(tanSuat(k))})`)
      .join(", ");
  }

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
export function chayBi(ch: CauHinhBi): KetQuaThiNghiem {
  const rng = taoRng(ch.seed);
  const sl: SoLieuXucXac = { so_luot: 0, so_ghi_nhan: 0, dem: {} };
  for (let i = 0; i < ch.so_lan_goi_y; i++) {
    const l = motLuotBi(ch, rng);
    sl.so_luot++;
    if (l.khoa === null) continue;
    sl.so_ghi_nhan++;
    sl.dem[l.khoa] = (sl.dem[l.khoa] ?? 0) + 1;
  }
  return tongHopBi(ch, sl);
}
