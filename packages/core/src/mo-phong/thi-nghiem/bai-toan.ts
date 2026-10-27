// Mô hình tổng quát cho đề xác suất kiểu "lấy vật từ một tập rồi xét một biến cố":
//   vật       – danh sách vật, mỗi vật có thể có màu, có số, hoặc cả hai (bi đánh số, bi màu, thẻ số, học sinh nam/nữ…)
//   cách lấy  – lấy lần lượt `so_lan` vật, có hoặc không hoàn lại (kết quả là bộ có thứ tự)
//   biến cố   – một điều kiện trên các số (tổng, tích, hiệu, thương, lớn nhất, nhỏ nhất, ghép số … chẵn/lẻ/chia hết/dư/bằng/so sánh/trong đoạn …),
//               trên màu (ít nhất 1 vật màu X, cùng màu …), đếm số vật thuộc một loại, vị trí và thứ tự lấy, hoặc ghép nhiều biến cố bằng và / hoặc / xor
// Xác suất lý thuyết được tính bằng cách đếm mọi cách lấy có thứ tự, ra phân số chính xác.
import type { BienCoBaiToan, CauHinhBaiToan, DieuKienBaiToan, KetQuaThiNghiem, LocVat, VatTongQuat } from "../../types";
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
  if (!Number.isInteger(x) || x < 2) return false;
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false;
  return true;
};

const ucln = (a: number, b: number): number => (b === 0 ? Math.abs(a) : ucln(b, a % b));
const chuSoCua = (v: number) => String(Math.abs(v));
const tongChuSo = (v: number) => [...chuSoCua(v)].reduce((s, c) => s + Number(c), 0);

/** Các điều kiện có nghĩa với cả số thực (ví dụ thương 7/2); các điều kiện còn lại chỉ xét số nguyên. */
const DK_CHO_SO_THUC = new Set<DieuKienBaiToan["loai"]>(["bang", "khac", "lon_hon", "nho_hon", "lon_hon_hoac_bang", "nho_hon_hoac_bang", "trong_doan", "ngoai_doan", "duong", "am"]);
const EPS = 1e-9;

export function thoaDieuKien(dk: DieuKienBaiToan, v: number): boolean {
  if (!Number.isFinite(v)) return false;
  if (!Number.isInteger(v) && !DK_CHO_SO_THUC.has(dk.loai)) return false;
  switch (dk.loai) {
    case "chan":
      return v % 2 === 0;
    case "le":
      return Math.abs(v) % 2 === 1;
    case "nguyen_to":
      return laNguyenTo(v);
    case "hop_so":
      return v >= 4 && !laNguyenTo(v);
    case "chia_het":
      return dk.k > 0 && v % dk.k === 0;
    case "khong_chia_het":
      return dk.k > 0 && v % dk.k !== 0;
    case "uoc_cua":
      return v > 0 && dk.k % v === 0;
    case "du":
      return dk.m > 0 && ((v % dk.m) + dk.m) % dk.m === dk.r;
    case "bang":
      return Math.abs(v - dk.k) < EPS;
    case "khac":
      return Math.abs(v - dk.k) >= EPS;
    case "lon_hon":
      return v > dk.k + EPS;
    case "nho_hon":
      return v < dk.k - EPS;
    case "lon_hon_hoac_bang":
      return v > dk.k - EPS;
    case "nho_hon_hoac_bang":
      return v < dk.k + EPS;
    case "trong_doan":
      return v > dk.k - EPS && v < dk.k2 + EPS;
    case "ngoai_doan":
      return v < dk.k - EPS || v > dk.k2 + EPS;
    case "duong":
      return v > EPS;
    case "am":
      return v < -EPS;
    case "chinh_phuong": {
      if (v < 0) return false;
      const c = Math.round(Math.sqrt(v));
      return c * c === v;
    }
    case "chu_so_khac_nhau": {
      const cs = chuSoCua(v);
      return new Set(cs).size === cs.length;
    }
    case "doi_xung": {
      const cs = chuSoCua(v);
      return cs === [...cs].reverse().join("");
    }
    case "co_chu_so":
      return chuSoCua(v).includes(String(dk.d));
    case "tan_cung":
      return Math.abs(v) % 10 === dk.d;
    case "hang_chuc":
      return Math.floor(Math.abs(v) / 10) % 10 === dk.d;
    case "hang_chuc_chan":
      return Math.abs(v) >= 10 && Math.floor(Math.abs(v) / 10) % 2 === 0;
    case "hang_chuc_le":
      return Math.abs(v) >= 10 && Math.floor(Math.abs(v) / 10) % 2 === 1;
    case "tong_chu_so":
      return tongChuSo(v) === dk.k;
  }
}

/** Giá trị của đại lượng trên một bộ vật đã lấy (theo thứ tự lấy). Thương cho 0 ở số chia thì không xác định (NaN). */
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
    case "hieu":
      return so[0]! - so.slice(1).reduce((a, b) => a + b, 0);
    case "hieu_tuyet_doi":
      return Math.max(...so) - Math.min(...so);
    case "thuong":
      return so[1] === 0 || so[1] === undefined ? NaN : so[0]! / so[1]!;
    case "tong_binh_phuong":
      return so.reduce((a, b) => a + b * b, 0);
    case "binh_phuong_tong": {
      const t = so.reduce((a, b) => a + b, 0);
      return t * t;
    }
  }
}

/** Vật có thuộc loại `l` không (mọi ràng buộc có mặt trong `l` phải cùng thỏa). */
export function khopLoc(l: LocVat, v: VatTongQuat): boolean {
  if (l.mau !== undefined && v.mau !== l.mau) return false;
  if (l.so !== undefined && v.so !== l.so) return false;
  if (l.dk !== undefined && (v.so === undefined || !thoaDieuKien(l.dk, v.so))) return false;
  return true;
}

/** Một biến cố (có thể ghép nhiều tầng) có xảy ra với bộ vật đã lấy không, đã tính cả `khong` của nó. */
function thoaMotBienCo(bc: BienCoBaiToan, vs: VatTongQuat[]): boolean {
  let thoa: boolean;
  switch (bc.kieu) {
    case "gop": {
      const kq = bc.cac.map((c) => thoaMotBienCo(c, vs));
      thoa = bc.phep === "va" ? kq.every(Boolean) : bc.phep === "hoac" ? kq.some(Boolean) : kq.filter(Boolean).length === 1;
      break;
    }
    case "so":
      thoa = thoaDieuKien(bc.dieu_kien, giaTriDaiLuong(bc.dai_luong, vs));
      break;
    case "mau": {
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
      break;
    }
    case "quan_he": {
      const so = vs.map((v) => v.so ?? 0);
      switch (bc.loai) {
        case "bang_nhau":
          thoa = so.every((x) => x === so[0]);
          break;
        case "khac_nhau":
          thoa = new Set(so).size === so.length;
          break;
        case "cung_chan_le":
          thoa = so.every((x) => Math.abs(x) % 2 === Math.abs(so[0]!) % 2);
          break;
        case "nguyen_to_cung_nhau":
          thoa = so.reduce((g, x) => ucln(g, x), 0) === 1;
          break;
        case "tang_dan":
          thoa = so.every((x, i) => i === 0 || x > so[i - 1]!);
          break;
        case "giam_dan":
          thoa = so.every((x, i) => i === 0 || x < so[i - 1]!);
          break;
      }
      break;
    }
    case "dem": {
      const d = vs.filter((v) => khopLoc(bc.loc, v)).length;
      thoa =
        bc.so_sanh === "bang"
          ? d === bc.k
          : bc.so_sanh === "it_nhat"
            ? d >= bc.k
            : bc.so_sanh === "nhieu_nhat"
              ? d <= bc.k
              : bc.so_sanh === "trong_doan"
                ? d >= bc.k && d <= (bc.k2 ?? bc.k)
                : d === vs.length;
      break;
    }
    case "dem_bang":
      thoa = vs.filter((v) => khopLoc(bc.a, v)).length === vs.filter((v) => khopLoc(bc.b, v)).length;
      break;
    case "vi_tri": {
      const v = bc.lan === "cuoi" ? vs[vs.length - 1] : vs[bc.lan - 1];
      thoa = v !== undefined && khopLoc(bc.loc, v);
      break;
    }
    case "truoc_sau":
      thoa = vs.some((a, i) => khopLoc(bc.truoc, a) && vs.some((b, j) => j > i && khopLoc(bc.sau, b)));
      break;
    case "dung_thu_tu":
      thoa = vs.length === bc.day.length && bc.day.every((l, i) => khopLoc(l, vs[i]!));
      break;
    case "lien_tiep": {
      let chuoi = 0;
      let max = 0;
      for (const v of vs) {
        chuoi = khopLoc(bc.loc, v) ? chuoi + 1 : 0;
        max = Math.max(max, chuoi);
      }
      thoa = max >= bc.k;
      break;
    }
  }
  return bc.khong ? !thoa : thoa;
}

/** Bộ vật đã lấy có thỏa biến cố không (đã tính cả "phủ định"). */
export function thoaBienCoBaiToan(ch: Pick<CauHinhBaiToan, "bien_co" | "phu_dinh">, vs: VatTongQuat[]): boolean {
  const thoa = thoaMotBienCo(ch.bien_co, vs);
  return ch.phu_dinh ? !thoa : thoa;
}

/** Tên một vật để hiển thị: "đỏ 3", "3" hoặc "đỏ". */
export const nhanVat = (v: VatTongQuat) => (v.mau !== undefined && v.so !== undefined ? `${v.mau} ${v.so}` : v.so !== undefined ? String(v.so) : (v.mau ?? "?"));

export const TEN_DAI_LUONG = {
  tong: "tổng các số",
  tich: "tích các số",
  lon_nhat: "số lớn nhất",
  nho_nhat: "số nhỏ nhất",
  ghep: "số ghép được (theo thứ tự lấy)",
  hieu: "hiệu (lần 1 trừ lần 2)",
  hieu_tuyet_doi: "hiệu hai số (số lớn trừ số bé)",
  thuong: "thương (lần 1 chia lần 2)",
  tong_binh_phuong: "tổng bình phương các số",
  binh_phuong_tong: "bình phương của tổng các số",
} as const;

export function moTaDieuKien(dk: DieuKienBaiToan): string {
  switch (dk.loai) {
    case "chan":
      return "là số chẵn";
    case "le":
      return "là số lẻ";
    case "nguyen_to":
      return "là số nguyên tố";
    case "hop_so":
      return "là hợp số";
    case "chia_het":
      return `chia hết cho ${dk.k}`;
    case "khong_chia_het":
      return `không chia hết cho ${dk.k}`;
    case "uoc_cua":
      return `là ước của ${dk.k}`;
    case "du":
      return `chia ${dk.m} dư ${dk.r}`;
    case "bang":
      return `bằng ${dk.k}`;
    case "khac":
      return `khác ${dk.k}`;
    case "lon_hon":
      return `lớn hơn ${dk.k}`;
    case "nho_hon":
      return `nhỏ hơn ${dk.k}`;
    case "lon_hon_hoac_bang":
      return `lớn hơn hoặc bằng ${dk.k}`;
    case "nho_hon_hoac_bang":
      return `nhỏ hơn hoặc bằng ${dk.k}`;
    case "trong_doan":
      return `từ ${dk.k} đến ${dk.k2}`;
    case "ngoai_doan":
      return `nhỏ hơn ${dk.k} hoặc lớn hơn ${dk.k2}`;
    case "duong":
      return "là số dương";
    case "am":
      return "là số âm";
    case "chinh_phuong":
      return "là số chính phương";
    case "chu_so_khac_nhau":
      return "có các chữ số khác nhau";
    case "doi_xung":
      return "là số đối xứng (đọc xuôi ngược như nhau)";
    case "co_chu_so":
      return `có chữ số ${dk.d}`;
    case "tan_cung":
      return `có chữ số tận cùng bằng ${dk.d}`;
    case "hang_chuc":
      return `có chữ số hàng chục bằng ${dk.d}`;
    case "hang_chuc_chan":
      return "có chữ số hàng chục là số chẵn";
    case "hang_chuc_le":
      return "có chữ số hàng chục là số lẻ";
    case "tong_chu_so":
      return `có tổng các chữ số bằng ${dk.k}`;
  }
}

/** Đồng xu / xúc xắc được quy về bài toán tổng quát: mỗi mặt là một vật, mỗi lần tung / gieo là một lần lấy có hoàn lại. */
export const laMatDongXu = (tenVat?: string) => tenVat === "mặt đồng xu";
export const laMatXucXac = (tenVat?: string) => tenVat === "mặt xúc xắc";

/** Tên một loại vật bằng lời: "thẻ số 8", "bi màu đỏ", "mặt ngửa", "học sinh là số chẵn". */
export function moTaLoc(l: LocVat, tv: string): string {
  const mat = laMatDongXu(tv) || laMatXucXac(tv);
  const phan: string[] = [];
  if (l.mau !== undefined) phan.push(mat ? l.mau : `màu ${l.mau}`);
  if (l.so !== undefined) phan.push(mat ? String(l.so) : `số ${l.so}`);
  if (l.dk !== undefined) phan.push(moTaDieuKien(l.dk));
  return `${mat ? "mặt" : tv}${phan.length ? " " : ""}${phan.join(" ")}`;
}

const TEN_QUAN_HE = {
  bang_nhau: "các số lấy ra bằng nhau",
  khac_nhau: "các số lấy ra đôi một khác nhau",
  cung_chan_le: "các số lấy ra cùng chẵn hoặc cùng lẻ",
  nguyen_to_cung_nhau: "các số lấy ra nguyên tố cùng nhau (ước chung lớn nhất bằng 1)",
  tang_dan: "các số lấy ra tăng dần theo thứ tự lấy",
  giam_dan: "các số lấy ra giảm dần theo thứ tự lấy",
} as const;

/** Một lần lấy bằng lời: "đầu tiên", "cuối cùng", "thứ 2". */
const tenLan = (lan: number | "cuoi") => (lan === "cuoi" ? "cuối cùng" : lan === 1 ? "đầu tiên" : `ở lần thứ ${lan}`);

/** Biến cố bằng lời, ví dụ "tổng các số chia 3 dư 1" hoặc "có ít nhất 1 bi màu đỏ". */
function moTaMotBienCo(bc: BienCoBaiToan, tv: string, soLan: number): string {
  let s: string;
  const ngu = laMatDongXu(tv) || laMatXucXac(tv);
  switch (bc.kieu) {
    case "gop": {
      const noi = bc.phep === "va" ? " và " : bc.phep === "hoac" ? " hoặc " : " hoặc (chỉ đúng một trong hai) ";
      s = bc.cac.map((c) => (c.kieu === "gop" ? `(${moTaMotBienCo(c, tv, soLan)})` : moTaMotBienCo(c, tv, soLan))).join(noi);
      break;
    }
    case "so":
      s = `${soLan === 1 ? `${tv} được chọn` : TEN_DAI_LUONG[bc.dai_luong]} ${moTaDieuKien(bc.dieu_kien)}`;
      break;
    case "mau":
      if (ngu) {
        const mat = "mặt";
        if (bc.loai === "it_nhat") s = `có ít nhất 1 lần ra ${mat} ${bc.mau}`;
        else if (bc.loai === "dung") s = `có đúng ${bc.k} lần ra ${mat} ${bc.mau}`;
        else if (bc.loai === "cung_mau") s = `các lần ${laMatDongXu(tv) ? "tung" : "gieo"} đều ra cùng một mặt`;
        else s = `hai lần ${laMatDongXu(tv) ? "tung" : "gieo"} ra hai mặt khác nhau`;
      } else if (bc.loai === "it_nhat") s = `có ít nhất 1 ${tv} màu ${bc.mau}`;
      else if (bc.loai === "dung") s = `có đúng ${bc.k} ${tv} màu ${bc.mau}`;
      else if (bc.loai === "cung_mau") s = `các ${tv} lấy ra cùng màu`;
      else s = `hai ${tv} lấy ra khác màu`;
      break;
    case "quan_he":
      s = TEN_QUAN_HE[bc.loai];
      break;
    case "dem": {
      const loai = moTaLoc(bc.loc, tv);
      s =
        bc.so_sanh === "tat_ca"
          ? `tất cả các ${tv} lấy ra đều thuộc loại: ${loai}`
          : bc.so_sanh === "bang"
            ? `có đúng ${bc.k} ${loai}`
            : bc.so_sanh === "it_nhat"
              ? `có ít nhất ${bc.k} ${loai}`
              : bc.so_sanh === "nhieu_nhat"
                ? `có nhiều nhất ${bc.k} ${loai}`
                : `có từ ${bc.k} đến ${bc.k2 ?? bc.k} ${loai}`;
      break;
    }
    case "dem_bang":
      s = `số ${moTaLoc(bc.a, tv)} bằng số ${moTaLoc(bc.b, tv)}`;
      break;
    case "vi_tri":
      s = `${moTaLoc(bc.loc, tv)} được lấy ${tenLan(bc.lan)}`;
      break;
    case "truoc_sau":
      s = `${moTaLoc(bc.truoc, tv)} được lấy trước ${moTaLoc(bc.sau, tv)}`;
      break;
    case "dung_thu_tu":
      s = `các ${tv} được lấy đúng theo thứ tự: ${bc.day.map((l) => (l.so !== undefined && l.mau === undefined && !l.dk ? String(l.so) : l.mau !== undefined && l.so === undefined && !l.dk ? l.mau : moTaLoc(l, tv))).join(", ")}`;
      break;
    case "lien_tiep":
      s = `có ${bc.k} lần lấy liên tiếp đều ra ${moTaLoc(bc.loc, tv)}`;
      break;
  }
  return bc.khong ? `không xảy ra: ${s}` : s;
}

export function moTaBienCoBaiToan(ch: Pick<CauHinhBaiToan, "bien_co" | "phu_dinh" | "ten_vat" | "so_lan">): string {
  const s = moTaMotBienCo(ch.bien_co, ch.ten_vat ?? "vật", ch.so_lan);
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
  const khongThoa = bc.kieu === "so" ? (bc.khong ?? false) : false;
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
            .map(([gia_tri, so_cach]) => ({ gia_tri, so_cach, thoa: (thoaDieuKien(bc.dieu_kien, gia_tri) !== khongThoa) !== (ch.phu_dinh ?? false) }))
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
