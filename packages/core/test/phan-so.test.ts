import { describe, expect, it } from "vitest";
import { PhanSo } from "../src";

describe("PhanSo", () => {
  it("tự rút gọn", () => {
    expect(new PhanSo(2, 4).toString()).toBe("1/2");
    expect(new PhanSo(6, 3).toString()).toBe("2");
    expect(new PhanSo(1, -2).toString()).toBe("-1/2");
  });

  it("cộng, trừ, nhân, chia đúng", () => {
    const a = new PhanSo(1, 2);
    const b = new PhanSo(1, 3);
    expect(a.cong(b).toString()).toBe("5/6");
    expect(a.tru(b).toString()).toBe("1/6");
    expect(a.nhan(b).toString()).toBe("1/6");
    expect(a.chia(b).toString()).toBe("3/2");
  });

  it("không làm tròn với số rất nhỏ", () => {
    let p = PhanSo.MOT;
    for (let i = 0; i < 12; i++) p = p.nhan(new PhanSo(1, 1000));
    expect(p.mau).toBe(10n ** 36n);
  });

  it("báo lỗi khi mẫu bằng 0 hoặc chia cho 0", () => {
    expect(() => new PhanSo(1, 0)).toThrow();
    expect(() => PhanSo.MOT.chia(PhanSo.KHONG)).toThrow();
  });
});
