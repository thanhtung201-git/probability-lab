// Thí nghiệm đồng xu cân đối theo lượt, cùng cách tổ chức với xúc xắc (xuc-xac.ts). Ba chế độ:
//   phan_phoi  – tung 1 đồng (ghi N/S) hoặc 2-3 đồng (ghi số mặt ngửa)   → M2, M3
//   dieu_kien  – sau k lần liên tiếp cùng ra một mặt, lần kế tiếp ra gì?    → M1
//   day        – một dãy cụ thể (NNNNNN) so với dãy khác (NSNSSN)           → M4
// Mặt đồng xu biểu diễn bằng số để dùng chung giao diện với xúc xắc: 1 = ngửa, 2 = sấp.
import type { CauHinhDongXuTT, KetQuaThiNghiem, MatDongXu } from "../../types";
import { xacSuatCoDieuKien } from "../ly-thuyet";
import { PhanSo } from "../phan-so";
import { taoRng, type Rng } from "../rng";
import type { KhoaKetQua, LuotXucXac, SoLieuXucXac } from "./xuc-xac";

const MOT_PHAN_HAI = new PhanSo(1, 2);
export const NGUA = 1;
export const SAP = 2;

/** Tung một đồng xu cân đối. */
export const tungMotDongXu = (rng: Rng): number => (rng() < 0.5 ? NGUA : SAP);

export const chuMat = (m: number): MatDongXu => (m === NGUA ? "N" : "S");
export const noiDayChu = (mat: number[]) => mat.map(chuMat).join("");
const nhanMat = (m: MatDongXu) => (m === "N" ? "Ngửa" : "Sấp");

/** Số cách có đúng `k` mặt ngửa khi tung `n` đồng xu: C(n, k). */
const toHop = (n: number, k: number): number => {
  let kq = 1;
  for (let i = 1; i <= k; i++) kq = (kq * (n - k + i)) / i;
  return Math.round(kq);
};

/** Các kết quả được ghi nhận và xác suất lý thuyết của từng kết quả (tính bằng liệt kê, phân số chính xác). */
export function cacKhoaDongXu(ch: CauHinhDongXuTT): KhoaKetQua[] {
  switch (ch.che_do) {
    case "phan_phoi": {
      if (ch.so_dong_xu === 1) {
        return [
          { khoa: "N", nhan: "Ngửa", xac_suat: MOT_PHAN_HAI },
          { khoa: "S", nhan: "Sấp", xac_suat: MOT_PHAN_HAI },
        ];
      }
      const n = ch.so_dong_xu;
      return Array.from({ length: n + 1 }, (_, k) => ({
        khoa: String(k),
        nhan: `${k} ngửa`,
        xac_suat: new PhanSo(toHop(n, k), 2 ** n),
      }));
    }
    case "dieu_kien": {
      const lap = ch.mat;
      return (["N", "S"] as const).map((b) => ({
        khoa: b,
        nhan: nhanMat(b),
        xac_suat: xacSuatCoDieuKien(ch.so_lan_truoc, lap, b, MOT_PHAN_HAI),
      }));
    }
    case "day":
      return [
        { khoa: "a", nhan: ch.day_a, xac_suat: new PhanSo(1, 2 ** ch.day_a.length) },
        { khoa: "b", nhan: ch.day_b, xac_suat: new PhanSo(1, 2 ** ch.day_b.length) },
      ];
  }
}

/** Một lượt thí nghiệm. */
export function motLuotDongXu(ch: CauHinhDongXuTT, rng: Rng): LuotXucXac {
  switch (ch.che_do) {
    case "phan_phoi": {
      const mat = Array.from({ length: ch.so_dong_xu }, () => tungMotDongXu(rng));
      const ngua = mat.filter((m) => m === NGUA).length;
      return { mat, khoa: ch.so_dong_xu === 1 ? chuMat(mat[0]!) : String(ngua) };
    }
    case "dieu_kien": {
      const lap = ch.mat === "N" ? NGUA : SAP;
      const mat: number[] = [];
      for (let i = 0; i < ch.so_lan_truoc; i++) {
        const m = tungMotDongXu(rng);
        mat.push(m);
        if (m !== lap) return { mat, khoa: null };
      }
      const cuoi = tungMotDongXu(rng);
      mat.push(cuoi);
      return { mat, khoa: chuMat(cuoi) };
    }
    case "day": {
      const mat = Array.from({ length: ch.day_a.length }, () => tungMotDongXu(rng));
      const s = noiDayChu(mat);
      return { mat, khoa: s === ch.day_a ? "a" : s === ch.day_b ? "b" : "khac" };
    }
  }
}

/** Số đồng xu hiển thị trong một lượt. */
export const soMatHienThiDongXu = (ch: CauHinhDongXuTT) =>
  ch.che_do === "phan_phoi" ? ch.so_dong_xu : ch.che_do === "dieu_kien" ? ch.so_lan_truoc + 1 : ch.day_a.length;

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

/** Đổi số liệu phòng thí nghiệm sang dạng kết quả chung, để tạo phản hồi và lưu trữ. */
export function tongHopDongXu(ch: CauHinhDongXuTT, sl: SoLieuXucXac): KetQuaThiNghiem {
  const khoa = cacKhoaDongXu(ch);
  const chinh = khoa.find((k) => k.khoa === ch.theo_doi[0]) ?? khoa[0]!;
  const n = ch.che_do === "day" ? sl.so_luot : sl.so_ghi_nhan;
  const tanSuat = (k: string) => (n ? (sl.dem[k] ?? 0) / n : 0);

  let moTa: string;
  if (ch.che_do === "dieu_kien") {
    moTa =
      `có ${so(sl.so_ghi_nhan)} lượt mà ${ch.so_lan_truoc} lần đầu đều ra ${nhanMat(ch.mat).toLowerCase()}; ` +
      `ở lần kế tiếp, ngửa xuất hiện ${so(sl.dem.N ?? 0)} lần (${pt(tanSuat("N"))}), sấp xuất hiện ${so(sl.dem.S ?? 0)} lần (${pt(tanSuat("S"))})`;
  } else if (ch.che_do === "day") {
    moTa = (["a", "b"] as const)
      .map((k) => `dãy ${k === "a" ? ch.day_a : ch.day_b} xuất hiện ${so(sl.dem[k] ?? 0)} lần (${pt(tanSuat(k))})`)
      .join(", ");
  } else {
    moTa = ch.theo_doi
      .map((k) => {
        const kk = khoa.find((x) => x.khoa === k);
        return `${ch.so_dong_xu === 1 ? kk?.nhan.toLowerCase() : `${kk?.nhan}`} xuất hiện ${so(sl.dem[k] ?? 0)} lần (${pt(tanSuat(k))})`;
      })
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
export function chayDongXuTT(ch: CauHinhDongXuTT): KetQuaThiNghiem {
  const rng = taoRng(ch.seed);
  const sl: SoLieuXucXac = { so_luot: 0, so_ghi_nhan: 0, dem: {} };
  for (let i = 0; i < ch.so_lan_goi_y; i++) {
    const l = motLuotDongXu(ch, rng);
    sl.so_luot++;
    if (l.khoa === null) continue;
    sl.so_ghi_nhan++;
    sl.dem[l.khoa] = (sl.dem[l.khoa] ?? 0) + 1;
  }
  return tongHopDongXu(ch, sl);
}
