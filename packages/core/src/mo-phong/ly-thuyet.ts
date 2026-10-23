// Xác suất lý thuyết, tính bằng liệt kê và phân số chính xác (không dùng AI, không làm tròn).
import type { MatDongXu } from "../types";
import { PhanSo } from "./phan-so";

export function xacSuatMat(mat: MatDongXu, pNgua: PhanSo): PhanSo {
  return mat === "N" ? pNgua : PhanSo.MOT.tru(pNgua);
}

/** Xác suất ra đúng một dãy cụ thể, ví dụ "NSNSSN". */
export function xacSuatDay(day: string, pNgua: PhanSo): PhanSo {
  let p = PhanSo.MOT;
  for (const c of day) p = p.nhan(xacSuatMat(c as MatDongXu, pNgua));
  return p;
}

/** Liệt kê mọi dãy độ dài `n` gồm N và S. */
export function lietKeDay(n: number): string[] {
  const kq: string[] = [];
  for (let m = 0; m < 2 ** n; m++) {
    let s = "";
    for (let i = n - 1; i >= 0; i--) s += (m >> i) & 1 ? "S" : "N";
    kq.push(s);
  }
  return kq;
}

/**
 * P(lần thứ k+1 ra `bienCo` | k lần đầu đều ra `ketQuaLap`),
 * tính bằng cách liệt kê toàn bộ 2^(k+1) dãy rồi chia hai tổng xác suất.
 */
export function xacSuatCoDieuKien(
  soLanTruoc: number,
  ketQuaLap: MatDongXu,
  bienCo: MatDongXu,
  pNgua: PhanSo,
): PhanSo {
  const dieuKien = ketQuaLap.repeat(soLanTruoc);
  let pDieuKien = PhanSo.KHONG;
  let pCaHai = PhanSo.KHONG;
  for (const day of lietKeDay(soLanTruoc + 1)) {
    if (!day.startsWith(dieuKien)) continue;
    const p = xacSuatDay(day, pNgua);
    pDieuKien = pDieuKien.cong(p);
    if (day.endsWith(bienCo)) pCaHai = pCaHai.cong(p);
  }
  if (pDieuKien.laKhong()) throw new Error("Điều kiện không thể xảy ra với xác suất đã cho");
  return pCaHai.chia(pDieuKien);
}
