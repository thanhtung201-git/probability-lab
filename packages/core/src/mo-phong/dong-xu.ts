import type { MatDongXu } from "../types";
import type { Rng } from "./rng";

/** Tung một đồng xu có xác suất ra ngửa là `pNgua`. */
export function tungMotLan(rng: Rng, pNgua: number): MatDongXu {
  return rng() < pNgua ? "N" : "S";
}

/** Tung `n` lần, trả về dãy kết quả. */
export function tung(rng: Rng, n: number, pNgua: number): MatDongXu[] {
  const kq: MatDongXu[] = new Array(n);
  for (let i = 0; i < n; i++) kq[i] = tungMotLan(rng, pNgua);
  return kq;
}

/**
 * Chọn các điểm vẽ biểu đồ để không vẽ hàng chục nghìn điểm:
 * từng lần đến 100, cách 10 đến 1.000, cách 100 đến 10.000, cách 1.000 sau đó.
 */
export function laDiemVe(i: number, tong: number): boolean {
  if (i === tong) return true;
  if (i <= 100) return true;
  if (i <= 1_000) return i % 10 === 0;
  if (i <= 10_000) return i % 100 === 0;
  return i % 1_000 === 0;
}
