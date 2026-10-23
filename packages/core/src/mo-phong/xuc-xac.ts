// Xúc xắc 6 mặt cân đối: gieo một con, hoặc gieo hai con và lấy tổng.
// Xác suất lý thuyết tính bằng liệt kê mọi kết quả đồng khả năng, ra phân số chính xác.
import { PhanSo } from "./phan-so";
import type { Rng } from "./rng";

/** Số con xúc xắc gieo cùng lúc (1 đến 6). */
export type SoXucXac = number;
export const SO_XUC_XAC_TOI_DA = 6;

export const SO_MAT = 6;

/** Gieo một con xúc xắc: số nguyên từ 1 đến 6. */
export function gieoMotCon(rng: Rng): number {
  return Math.floor(rng() * SO_MAT) + 1;
}

/** Gieo `soXucXac` con, trả về từng mặt và giá trị ghi nhận (mặt, hoặc tổng khi gieo hai con). */
export function gieoXucXac(rng: Rng, soXucXac: SoXucXac): { mat: number[]; gia_tri: number } {
  const mat = Array.from({ length: soXucXac }, () => gieoMotCon(rng));
  return { mat, gia_tri: mat.reduce((a, b) => a + b, 0) };
}

/** Các giá trị có thể ghi nhận: 1..6 với một con, 2..12 với tổng hai con. */
export function cacGiaTri(soXucXac: SoXucXac): number[] {
  const nho = soXucXac;
  const lon = soXucXac * SO_MAT;
  return Array.from({ length: lon - nho + 1 }, (_, i) => nho + i);
}

export interface XacSuatGiaTri {
  gia_tri: number;
  /** Số kết quả đồng khả năng cho ra giá trị này. */
  so_cach: number;
  xac_suat: PhanSo;
}

/** Phân phối lý thuyết, liệt kê toàn bộ 6^n kết quả đồng khả năng. */
export function phanPhoiLyThuyet(soXucXac: SoXucXac): XacSuatGiaTri[] {
  const tong = SO_MAT ** soXucXac;
  // Đếm số cách ra từng tổng bằng cách thêm lần lượt từng con (đúng với mọi số con, không cần liệt kê 6^n kết quả).
  let cach = new Map<number, number>([[0, 1]]);
  for (let i = 0; i < soXucXac; i++) {
    const moi = new Map<number, number>();
    for (const [tongCu, c] of cach) for (let mat = 1; mat <= SO_MAT; mat++) moi.set(tongCu + mat, (moi.get(tongCu + mat) ?? 0) + c);
    cach = moi;
  }
  return cacGiaTri(soXucXac).map((gia_tri) => ({ gia_tri, so_cach: cach.get(gia_tri) ?? 0, xac_suat: new PhanSo(cach.get(gia_tri) ?? 0, tong) }));
}
