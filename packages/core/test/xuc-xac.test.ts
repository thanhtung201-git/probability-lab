import { describe, expect, it } from "vitest";
import { cacGiaTri, gieoXucXac, PhanSo, phanPhoiLyThuyet, taoRng } from "../src";

describe("xúc xắc – lý thuyết", () => {
  it("một con: mỗi mặt 1/6", () => {
    const pp = phanPhoiLyThuyet(1);
    expect(pp.map((x) => x.gia_tri)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const x of pp) expect(x.xac_suat.toString()).toBe("1/6");
  });

  it("tổng hai con: 36 kết quả, P(7) = 1/6, P(2) = P(12) = 1/36", () => {
    const pp = phanPhoiLyThuyet(2);
    expect(pp.map((x) => x.gia_tri)).toEqual(cacGiaTri(2));
    expect(pp.reduce((s, x) => s + x.so_cach, 0)).toBe(36);
    const p = (v: number) => pp.find((x) => x.gia_tri === v)!.xac_suat.toString();
    expect(p(7)).toBe("1/6");
    expect(p(2)).toBe("1/36");
    expect(p(12)).toBe("1/36");
    expect(p(6)).toBe("5/36");
  });

  it("tổng xác suất bằng 1", () => {
    for (const n of [1, 2] as const) {
      const tong = phanPhoiLyThuyet(n).reduce((s, x) => s.cong(x.xac_suat), PhanSo.KHONG);
      expect(tong.toString()).toBe("1");
    }
  });
});

describe("xúc xắc – gieo", () => {
  it("cùng seed cho cùng dãy kết quả", () => {
    const a = taoRng(9);
    const b = taoRng(9);
    for (let i = 0; i < 50; i++) expect(gieoXucXac(a, 2)).toEqual(gieoXucXac(b, 2));
  });

  it("mặt luôn từ 1 đến 6, tổng hai con từ 2 đến 12", () => {
    const rng = taoRng(1);
    for (let i = 0; i < 5000; i++) {
      const { mat, gia_tri } = gieoXucXac(rng, 2);
      for (const m of mat) expect(m >= 1 && m <= 6).toBe(true);
      expect(gia_tri).toBe(mat[0]! + mat[1]!);
    }
  });

  it("60.000 lần gieo: tần suất mỗi mặt lệch khỏi 1/6 dưới 1%", () => {
    const rng = taoRng(2026);
    const dem = [0, 0, 0, 0, 0, 0];
    const n = 60_000;
    for (let i = 0; i < n; i++) dem[gieoXucXac(rng, 1).gia_tri - 1]!++;
    for (const d of dem) expect(Math.abs(d / n - 1 / 6)).toBeLessThan(0.01);
  });
});
