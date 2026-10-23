import { describe, expect, it } from "vitest";
import { lietKeDay, PhanSo, xacSuatCoDieuKien, xacSuatDay } from "../src";

const MOT_PHAN_HAI = new PhanSo(1, 2);

describe("xác suất lý thuyết", () => {
  it("liệt kê đủ 2^n dãy, không trùng", () => {
    const ds = lietKeDay(4);
    expect(ds).toHaveLength(16);
    expect(new Set(ds).size).toBe(16);
  });

  it("hai dãy cùng độ dài có cùng xác suất với đồng xu cân đối (M4)", () => {
    expect(xacSuatDay("NSNSSN", MOT_PHAN_HAI).toString()).toBe("1/64");
    expect(xacSuatDay("NNNNNN", MOT_PHAN_HAI).toString()).toBe("1/64");
  });

  it("đồng xu lệch: P(NNS) với p = 7/10 là 7/10 · 7/10 · 3/10 = 147/1000", () => {
    expect(xacSuatDay("NNS", new PhanSo(7, 10)).toString()).toBe("147/1000");
  });

  it("sau 5 lần ngửa, lần thứ 6 ra sấp vẫn là 1/2 (M1)", () => {
    expect(xacSuatCoDieuKien(5, "N", "S", MOT_PHAN_HAI).toString()).toBe("1/2");
  });

  it("điều kiện không phụ thuộc lịch sử cả với đồng xu lệch", () => {
    expect(xacSuatCoDieuKien(3, "S", "N", new PhanSo(3, 10)).toString()).toBe("3/10");
  });

  it("báo lỗi khi điều kiện không thể xảy ra", () => {
    expect(() => xacSuatCoDieuKien(2, "N", "N", PhanSo.KHONG)).toThrow();
  });
});
