// Thí nghiệm xúc xắc theo lượt, dùng chung cho phòng thí nghiệm tương tác và cho chạy theo lô.
// Ba chế độ, mỗi chế độ kiểm chứng một kiểu ngộ nhận:
//   phan_phoi  – gieo 1 con (mặt) hoặc 2 con (tổng)            → M2, M3
//   dieu_kien  – sau k lần không ra mặt m, lần kế tiếp ra m?     → M1
//   day        – một dãy cụ thể (6-6-6) so với dãy khác (2-5-3) → M4
import type { CauHinhXucXac, KetQuaThiNghiem } from "../../types";
import { PhanSo } from "../phan-so";
import { taoRng, type Rng } from "../rng";
import { gieoMotCon, phanPhoiLyThuyet, SO_MAT } from "../xuc-xac";

export interface KhoaKetQua {
  /** Khóa ghi nhận, ví dụ "7", "ra", "a". */
  khoa: string;
  nhan: string;
  xac_suat: PhanSo;
}

export interface LuotXucXac {
  /** Các mặt đã gieo trong lượt, để hiển thị. */
  mat: number[];
  /** null khi lượt không thỏa điều kiện (chế độ dieu_kien) nên không ghi nhận. */
  khoa: string | null;
}

const MOT_PHAN_SAU = new PhanSo(1, SO_MAT);

export const noiDay = (d: number[]) => d.join("-");

/** Các kết quả được ghi nhận và xác suất lý thuyết của từng kết quả. */
export function cacKhoa(ch: CauHinhXucXac): KhoaKetQua[] {
  switch (ch.che_do) {
    case "phan_phoi":
      return phanPhoiLyThuyet(ch.so_xuc_xac).map((x) => ({
        khoa: String(x.gia_tri),
        nhan: String(x.gia_tri),
        xac_suat: x.xac_suat,
      }));
    case "dieu_kien":
      return [
        { khoa: "ra", nhan: `Ra mặt ${ch.mat}`, xac_suat: xacSuatDieuKienXucXac(ch.so_lan_truoc) },
        { khoa: "khong", nhan: `Không ra mặt ${ch.mat}`, xac_suat: PhanSo.MOT.tru(xacSuatDieuKienXucXac(ch.so_lan_truoc)) },
      ];
    case "day": {
      const p = MOT_PHAN_SAU;
      const pDay = (d: number[]) => d.reduce((s) => s.nhan(p), PhanSo.MOT);
      return [
        { khoa: "a", nhan: noiDay(ch.day_a), xac_suat: pDay(ch.day_a) },
        { khoa: "b", nhan: noiDay(ch.day_b), xac_suat: pDay(ch.day_b) },
      ];
    }
  }
}

/**
 * P(lần thứ k+1 ra mặt m | k lần đầu đều không ra m) = (số dãy k+1 lần có k lần đầu khác m và lần cuối là m) / (số dãy có k lần đầu khác m).
 * Đếm trực tiếp: tử số 5^k, mẫu số 5^k × 6, ra 1/6 vì các lần gieo độc lập (không giả định điều cần chứng minh).
 */
export function xacSuatDieuKienXucXac(soLanTruoc: number): PhanSo {
  const dayKhacMat = BigInt(SO_MAT - 1) ** BigInt(soLanTruoc);
  return new PhanSo(dayKhacMat, dayKhacMat * BigInt(SO_MAT));
}

/** Một lượt thí nghiệm. */
export function motLuot(ch: CauHinhXucXac, rng: Rng): LuotXucXac {
  switch (ch.che_do) {
    case "phan_phoi": {
      const mat = Array.from({ length: ch.so_xuc_xac }, () => gieoMotCon(rng));
      return { mat, khoa: String(mat.reduce((a, b) => a + b, 0)) };
    }
    case "dieu_kien": {
      const mat: number[] = [];
      for (let i = 0; i < ch.so_lan_truoc; i++) {
        const m = gieoMotCon(rng);
        mat.push(m);
        if (m === ch.mat) return { mat, khoa: null };
      }
      const cuoi = gieoMotCon(rng);
      mat.push(cuoi);
      return { mat, khoa: cuoi === ch.mat ? "ra" : "khong" };
    }
    case "day": {
      const mat = Array.from({ length: ch.day_a.length }, () => gieoMotCon(rng));
      const s = noiDay(mat);
      return { mat, khoa: s === noiDay(ch.day_a) ? "a" : s === noiDay(ch.day_b) ? "b" : "khac" };
    }
  }
}

/** Số mặt xúc xắc hiển thị trong một lượt. */
export const soMatHienThi = (ch: CauHinhXucXac) =>
  ch.che_do === "phan_phoi" ? ch.so_xuc_xac : ch.che_do === "dieu_kien" ? ch.so_lan_truoc + 1 : ch.day_a.length;

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

/** Số liệu tích lũy của phòng thí nghiệm. */
export interface SoLieuXucXac {
  /** Tổng số lượt đã chạy (kể cả lượt không thỏa điều kiện). */
  so_luot: number;
  /** Số lượt được ghi nhận. */
  so_ghi_nhan: number;
  dem: Record<string, number>;
}

/** Đổi số liệu phòng thí nghiệm sang dạng kết quả chung, để tạo phản hồi và lưu trữ. */
export function tongHopXucXac(ch: CauHinhXucXac, sl: SoLieuXucXac): KetQuaThiNghiem {
  const khoa = cacKhoa(ch);
  const chinh = khoa.find((k) => k.khoa === String(ch.theo_doi[0])) ?? khoa[0]!;
  const n = ch.che_do === "day" ? sl.so_luot : sl.so_ghi_nhan;
  const tanSuat = (k: string) => (n ? (sl.dem[k] ?? 0) / n : 0);

  let moTa: string;
  if (ch.che_do === "dieu_kien") {
    moTa =
      `có ${sl.so_ghi_nhan.toLocaleString("vi-VN")} lượt mà ${ch.so_lan_truoc} lần đầu không ra mặt ${ch.mat}; ` +
      `ở lần kế tiếp, mặt ${ch.mat} xuất hiện ${(sl.dem.ra ?? 0).toLocaleString("vi-VN")} lần (${pt(tanSuat("ra"))})`;
  } else {
    const theoDoi = ch.che_do === "day" ? ["a", "b"] : ch.theo_doi.map(String);
    moTa = theoDoi
      .map((k) => {
        const kk = khoa.find((x) => x.khoa === k);
        const ten = ch.che_do === "day" ? `dãy ${kk?.nhan}` : ch.so_xuc_xac > 1 ? `tổng ${k}` : `mặt ${k}`;
        return `${ten} xuất hiện ${(sl.dem[k] ?? 0).toLocaleString("vi-VN")} lần (${pt(tanSuat(k))})`;
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

/** Chạy theo lô `so_lan_goi_y` lượt (dùng khi không có phòng thí nghiệm tương tác). */
export function chayXucXac(ch: CauHinhXucXac): KetQuaThiNghiem {
  const rng = taoRng(ch.seed);
  const sl: SoLieuXucXac = { so_luot: 0, so_ghi_nhan: 0, dem: {} };
  for (let i = 0; i < ch.so_lan_goi_y; i++) {
    const l = motLuot(ch, rng);
    sl.so_luot++;
    if (l.khoa === null) continue;
    sl.so_ghi_nhan++;
    sl.dem[l.khoa] = (sl.dem[l.khoa] ?? 0) + 1;
  }
  return tongHopXucXac(ch, sl);
}
