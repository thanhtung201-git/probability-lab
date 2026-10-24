// Mô hình tổng quát cho đề xác suất kiểu "lấy vật từ một tập rồi xét một biến cố":
//   vật       – danh sách vật, mỗi vật có thể có màu, có số, hoặc cả hai (bi đánh số, bi màu, thẻ số, học sinh nam/nữ…)
//   cách lấy  – lấy lần lượt `so_lan` vật, có hoặc không hoàn lại (kết quả là bộ có thứ tự)
//   biến cố   – một điều kiện trên các số (tổng, tích, lớn nhất, nhỏ nhất, ghép số … chẵn/lẻ/chia hết/dư/bằng/lớn hơn …)
//               hoặc trên màu (ít nhất 1 vật màu X, đúng k vật màu X, cùng màu, khác màu)
// Xác suất lý thuyết được tính bằng cách đếm mọi cách lấy có thứ tự, ra phân số chính xác.
import type { BienCoBaiToan, CauHinhBaiToan, DieuKienBaiToan, KetQuaThiNghiem, VatTongQuat } from "../../types";
import { PhanSo } from "../phan-so";
import { taoRng, type Rng } from "../rng";
import type { KhoaKetQua, LuotXucXac, SoLieuXucXac } from "./xuc-xac";

/** Số cách lấy có thứ tự: N^k nếu hoàn lại, N×(N−1)×… (k thừa số) nếu không. */
export function soCachLay(N: number, k: number, hoanLai: boolean): number {
  let kq = 1;
  for (let i = 0; i < k; i++) kq *= hoanLai ? N : N - i;
  return kq;
}

const laNguyenTo = (x: number) => {
  if (x < 2) return false;
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false;
  return true;
};

export function thoaDieuKien(dk: DieuKienBaiToan, v: number): boolean {
  switch (dk.loai) {
    case "chan":
      return v % 2 === 0;
    case "le":
      return Math.abs(v) % 2 === 1;
    case "nguyen_to":
      return laNguyenTo(v);
    case "chia_het":
      return dk.k > 0 && v % dk.k === 0;
    case "du":
      return dk.m > 0 && ((v % dk.m) + dk.m) % dk.m === dk.r;
    case "bang":
      return v === dk.k;
    case "lon_hon":
      return v > dk.k;
    case "nho_hon":
      return v < dk.k;
  }
}

/** Giá trị của đại lượng trên một bộ vật đã lấy (theo thứ tự lấy). */
export function giaTriDaiLuong(dl: Extract<BienCoBaiToan, { kieu: "so" }>["dai_luong"], vs: VatTongQuat[]): number {
  const so = vs.map((v) => v.so ?? 0);
  switch (dl) {
    case "tong":
      return so.reduce((a, b) => a + b, 0);
    case "tich":
      return so.reduce((a, b) => a * b, 1);
    case "lon_nhat":
      return Math.max(...so);
    case "nho_nhat":
      return Math.min(...so);
    case "ghep":
      return Number(so.join(""));
  }
}

/** Bộ vật đã lấy có thỏa biến cố không (đã tính cả "phủ định"). */
export function thoaBienCoBaiToan(ch: Pick<CauHinhBaiToan, "bien_co" | "phu_dinh">, vs: VatTongQuat[]): boolean {
  const bc = ch.bien_co;
  let thoa: boolean;
  if (bc.kieu === "so") {
    thoa = thoaDieuKien(bc.dieu_kien, giaTriDaiLuong(bc.dai_luong, vs));
  } else {
    const dem = vs.filter((v) => v.mau === bc.mau).length;
    switch (bc.loai) {
      case "it_nhat":
        thoa = dem >= 1;
        break;
      case "dung":
        thoa = dem === (bc.k ?? 0);
        break;
      case "cung_mau":
        thoa = vs.every((v) => v.mau === vs[0]!.mau);
        break;
      case "khac_mau":
        thoa = vs.length === 2 && vs[0]!.mau !== vs[1]!.mau;
        break;
    }
  }
  return ch.phu_dinh ? !thoa : thoa;
}

/** Tên một vật để hiển thị: "đỏ 3", "3" hoặc "đỏ". */
export const nhanVat = (v: VatTongQuat) => (v.mau !== undefined && v.so !== undefined ? `${v.mau} ${v.so}` : v.so !== undefined ? String(v.so) : (v.mau ?? "?"));

export const TEN_DAI_LUONG = { tong: "tổng các số", tich: "tích các số", lon_nhat: "số lớn nhất", nho_nhat: "số nhỏ nhất", ghep: "số ghép được (theo thứ tự lấy)" } as const;

export function moTaDieuKien(dk: DieuKienBaiToan): string {
  switch (dk.loai) {
    case "chan":
      return "là số chẵn";
    case "le":
      return "là số lẻ";
    case "nguyen_to":
      return "là số nguyên tố";
    case "chia_het":
      return `chia hết cho ${dk.k}`;
    case "du":
      return `chia ${dk.m} dư ${dk.r}`;
    case "bang":
      return `bằng ${dk.k}`;
    case "lon_hon":
      return `lớn hơn ${dk.k}`;
    case "nho_hon":
      return `nhỏ hơn ${dk.k}`;
  }
}

/** Biến cố bằng lời, ví dụ "tổng các số chia 3 dư 1" hoặc "có ít nhất 1 bi màu đỏ". */
/** Đồng xu / xúc xắc được quy về bài toán tổng quát: mỗi mặt là một vật, mỗi lần tung / gieo là một lần lấy có hoàn lại. */
export const laMatDongXu = (tenVat?: string) => tenVat === "mặt đồng xu";
export const laMatXucXac = (tenVat?: string) => tenVat === "mặt xúc xắc";

export function moTaBienCoBaiToan(ch: Pick<CauHinhBaiToan, "bien_co" | "phu_dinh" | "ten_vat" | "so_lan">): string {
  const bc = ch.bien_co;
  const tv = ch.ten_vat ?? "vật";
  let s: string;
  if (bc.kieu === "so") s = `${TEN_DAI_LUONG[bc.dai_luong]} ${moTaDieuKien(bc.dieu_kien)}`;
  else if (laMatDongXu(tv) || laMatXucXac(tv)) {
    const mat = "mặt";
    if (bc.loai === "it_nhat") s = `có ít nhất 1 lần ra ${mat} ${bc.mau}`;
    else if (bc.loai === "dung") s = `có đúng ${bc.k} lần ra ${mat} ${bc.mau}`;
    else if (bc.loai === "cung_mau") s = `các lần ${laMatDongXu(tv) ? "tung" : "gieo"} đều ra cùng một mặt`;
    else s = `hai lần ${laMatDongXu(tv) ? "tung" : "gieo"} ra hai mặt khác nhau`;
  } else if (bc.loai === "it_nhat") s = `có ít nhất 1 ${tv} màu ${bc.mau}`;
  else if (bc.loai === "dung") s = `có đúng ${bc.k} ${tv} màu ${bc.mau}`;
  else if (bc.loai === "cung_mau") s = `các ${tv} lấy ra cùng màu`;
  else s = `hai ${tv} lấy ra khác màu`;
  return ch.phu_dinh ? `không xảy ra: ${s}` : s;
}

/** Duyệt mọi cách lấy có thứ tự (chỉ số vật). */
function duyet(ch: Pick<CauHinhBaiToan, "vat" | "so_lan" | "hoan_lai">, fn: (chiSo: number[]) => void) {
  const N = ch.vat.length;
  const rut: number[] = [];
  const dung: boolean[] = Array(N).fill(false);
  const buoc = () => {
    if (rut.length === ch.so_lan) return fn(rut);
    for (let i = 0; i < N; i++) {
      if (!ch.hoan_lai && dung[i]) continue;
      dung[i] = true;
      rut.push(i);
      buoc();
      rut.pop();
      dung[i] = false;
    }
  };
  buoc();
}

export interface KetQuaLietKe {
  nhan: string;
  /** Giá trị của đại lượng số (nếu biến cố là kiểu số). */
  gia_tri?: number;
  thoa: boolean;
}

export interface KhongGianMau {
  tong: number;
  thoa: number;
  /** Danh sách từng kết quả, chỉ có khi không gian mẫu đủ nhỏ. */
  ds?: KetQuaLietKe[];
  /** Với biến cố kiểu số: số cách và số cách thỏa theo từng giá trị của đại lượng. */
  theo_gia_tri?: { gia_tri: number; so_cach: number; thoa: boolean }[];
}

export function khongGianMau(ch: CauHinhBaiToan, gioiHanLietKe = 60): KhongGianMau {
  let tong = 0;
  let thoa = 0;
  const ds: KetQuaLietKe[] = [];
  const nho = soCachLay(ch.vat.length, ch.so_lan, ch.hoan_lai) <= gioiHanLietKe;
  const theo = new Map<number, number>();
  const bc = ch.bien_co;
  duyet(ch, (chiSo) => {
    const vs = chiSo.map((i) => ch.vat[i]!);
    const ok = thoaBienCoBaiToan(ch, vs);
    tong++;
    if (ok) thoa++;
    const gt = bc.kieu === "so" ? giaTriDaiLuong(bc.dai_luong, vs) : undefined;
    if (gt !== undefined) theo.set(gt, (theo.get(gt) ?? 0) + 1);
    if (nho) ds.push({ nhan: `(${vs.map(nhanVat).join(", ")})`, gia_tri: gt, thoa: ok });
  });
  return {
    tong,
    thoa,
    ds: nho ? ds : undefined,
    theo_gia_tri:
      bc.kieu === "so"
        ? [...theo.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([gia_tri, so_cach]) => ({ gia_tri, so_cach, thoa: thoaDieuKien(bc.dieu_kien, gia_tri) !== (ch.phu_dinh ?? false) }))
        : undefined,
  };
}

/** Xác suất biến cố, phân số chính xác. */
export function xacSuatBaiToan(ch: CauHinhBaiToan): PhanSo {
  const k = khongGianMau(ch, 0);
  return new PhanSo(k.thoa, k.tong);
}

export const cacKhoaBaiToan = (ch: CauHinhBaiToan): KhoaKetQua[] => {
  const p = xacSuatBaiToan(ch);
  return [
    { khoa: "co", nhan: `Thuận lợi: ${moTaBienCoBaiToan(ch)}`, xac_suat: p },
    { khoa: "khong", nhan: "Không thuận lợi", xac_suat: PhanSo.MOT.tru(p) },
  ];
};

/** Một lượt: lấy ngẫu nhiên `so_lan` vật; mat là chỉ số vật + 1 để giao diện vẽ đúng vật. */
export function motLuotBaiToan(ch: CauHinhBaiToan, rng: Rng): LuotXucXac {
  const N = ch.vat.length;
  const chiSo: number[] = [];
  if (ch.hoan_lai) {
    for (let i = 0; i < ch.so_lan; i++) chiSo.push(Math.floor(rng() * N));
  } else {
    const conLai = Array.from({ length: N }, (_, i) => i);
    for (let i = 0; i < ch.so_lan; i++) chiSo.push(conLai.splice(Math.floor(rng() * conLai.length), 1)[0]!);
  }
  const thoa = thoaBienCoBaiToan(ch, chiSo.map((i) => ch.vat[i]!));
  return { mat: chiSo.map((i) => i + 1), khoa: thoa ? "co" : "khong" };
}

export const soMatHienThiBaiToan = (ch: CauHinhBaiToan) => ch.so_lan;

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

export function tongHopBaiToan(ch: CauHinhBaiToan, sl: SoLieuXucXac): KetQuaThiNghiem {
  const khoa = cacKhoaBaiToan(ch);
  const chinh = khoa.find((k) => k.khoa === ch.theo_doi[0]) ?? khoa[0]!;
  const n = sl.so_ghi_nhan;
  const tanSuat = (k: string) => (n ? (sl.dem[k] ?? 0) / n : 0);
  const moTa = ch.theo_doi
    .map((k) => `${k === "co" ? `biến cố “${moTaBienCoBaiToan(ch)}”` : "không thuận lợi biến cố"} xuất hiện ${so(sl.dem[k] ?? 0)} lần (${pt(tanSuat(k))})`)
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

export function chayBaiToan(ch: CauHinhBaiToan): KetQuaThiNghiem {
  const rng = taoRng(ch.seed);
  const sl: SoLieuXucXac = { so_luot: 0, so_ghi_nhan: 0, dem: {} };
  for (let i = 0; i < ch.so_lan_goi_y; i++) {
    const l = motLuotBaiToan(ch, rng);
    sl.so_luot++;
    sl.so_ghi_nhan++;
    sl.dem[l.khoa!] = (sl.dem[l.khoa!] ?? 0) + 1;
  }
  return tongHopBaiToan(ch, sl);
}
