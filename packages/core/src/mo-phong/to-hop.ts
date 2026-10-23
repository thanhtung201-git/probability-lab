// Tổ hợp và phân phối số phần tử "thuận lợi" khi lấy ngẫu nhiên từ một tập, tính bằng phân số chính xác.
import { PhanSo } from "./phan-so";

/** C(n, k) dưới dạng BigInt; 0 nếu k ngoài [0, n]. */
export function toHop(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  let kq = 1n;
  for (let i = 1; i <= k; i++) kq = (kq * BigInt(n - k + i)) / BigInt(i);
  return kq;
}

/**
 * Lấy `n` phần tử từ tập `tong` phần tử, trong đó có `thuanLoi` phần tử thuận lợi.
 * Trả về xác suất có đúng k phần tử thuận lợi, với k = 0..n.
 * - Có hoàn lại: phân phối nhị thức.
 * - Không hoàn lại: phân phối siêu bội.
 */
export function phanPhoiDem(tong: number, thuanLoi: number, n: number, hoanLai: boolean): PhanSo[] {
  return Array.from({ length: n + 1 }, (_, k) =>
    hoanLai
      ? new PhanSo(
          toHop(n, k) * BigInt(thuanLoi) ** BigInt(k) * BigInt(tong - thuanLoi) ** BigInt(n - k),
          BigInt(tong) ** BigInt(n),
        )
      : new PhanSo(toHop(thuanLoi, k) * toHop(tong - thuanLoi, n - k), toHop(tong, n)),
  );
}
