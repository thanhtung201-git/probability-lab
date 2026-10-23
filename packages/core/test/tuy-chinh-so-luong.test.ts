// Phòng thí nghiệm cho phép tự chọn số xúc xắc (1-6), số đồng xu (1-10), số lần liên tiếp và dãy tùy ý.
import { describe, expect, it } from "vitest";
import { cacKhoaVat, chayThiNghiem, phanPhoiLyThuyet, type CauHinhDongXuTT, type CauHinhXucXac } from "../src";

const tong = (xs: { xac_suat: { soThuc(): number } }[]) => xs.reduce((s, x) => s + x.xac_suat.soThuc(), 0);

describe("nhiều xúc xắc", () => {
  it("phân phối tổng của 3 con: 16 giá trị, tổng xác suất 1, P(10) = 27/216", () => {
    const pp = phanPhoiLyThuyet(3);
    expect(pp).toHaveLength(16);
    expect(tong(pp)).toBeCloseTo(1, 12);
    expect(pp.find((x) => x.gia_tri === 10)!.xac_suat.toString()).toBe("1/8");
    expect(pp.find((x) => x.gia_tri === 3)!.so_cach).toBe(1);
  });

  it("6 con: tổng nhỏ nhất 6, lớn nhất 36, đối xứng quanh 21", () => {
    const pp = phanPhoiLyThuyet(6);
    expect(pp[0]!.gia_tri).toBe(6);
    expect(pp.at(-1)!.gia_tri).toBe(36);
    expect(pp.find((x) => x.gia_tri === 15)!.so_cach).toBe(pp.find((x) => x.gia_tri === 27)!.so_cach);
    expect(tong(pp)).toBeCloseTo(1, 12);
  });

  it("chạy 4 con theo tổng 14 cho tần suất gần lý thuyết 146/1296", () => {
    const ch: CauHinhXucXac = { loai: "xuc_xac", che_do: "phan_phoi", so_xuc_xac: 4, theo_doi: [14], so_lan_goi_y: 50_000, seed: 7 };
    const kq = chayThiNghiem(ch);
    expect(kq.ly_thuyet).toBe("73/648");
    expect(Math.abs(kq.tan_suat - 146 / 1296)).toBeLessThan(0.01);
  });

  it("điều kiện 10 lần liên tiếp vẫn cho 1/6 (đếm trực tiếp, không liệt kê)", () => {
    const ch: CauHinhXucXac = { loai: "xuc_xac", che_do: "dieu_kien", so_lan_truoc: 10, mat: 3, theo_doi: ["ra"], so_lan_goi_y: 10, seed: 1 };
    expect(cacKhoaVat({ ...ch })[0]!.xac_suat.toString()).toBe("1/6");
  });

  it("từ chối 7 con xúc xắc", () => {
    expect(() => chayThiNghiem({ loai: "xuc_xac", che_do: "phan_phoi", so_xuc_xac: 7, theo_doi: [7], so_lan_goi_y: 10, seed: 1 } as CauHinhXucXac)).toThrow();
  });
});

describe("nhiều đồng xu", () => {
  it("10 đồng: C(10,5)/1024 = 63/256 cho 5 ngửa, 11 kết quả", () => {
    const ch: CauHinhDongXuTT = { loai: "dong_xu", che_do: "phan_phoi", so_dong_xu: 10, theo_doi: ["5"], so_lan_goi_y: 10, seed: 1 };
    const khoa = cacKhoaVat(ch);
    expect(khoa).toHaveLength(11);
    expect(khoa.find((k) => k.khoa === "5")!.xac_suat.toString()).toBe("63/256");
    expect(tong(khoa)).toBeCloseTo(1, 12);
  });

  it("dãy 10 lần tung và điều kiện 10 lần liên tiếp chạy được", () => {
    const day: CauHinhDongXuTT = { loai: "dong_xu", che_do: "day", day_a: "NNNNNNNNNN", day_b: "NSNSNSNSNS", theo_doi: ["a", "b"], so_lan_goi_y: 1000, seed: 3 };
    expect(cacKhoaVat(day)[0]!.xac_suat.toString()).toBe("1/1024");
    const dk: CauHinhDongXuTT = { loai: "dong_xu", che_do: "dieu_kien", so_lan_truoc: 10, mat: "N", theo_doi: ["S"], so_lan_goi_y: 100, seed: 3 };
    expect(cacKhoaVat(dk)[1]!.xac_suat.toString()).toBe("1/2");
  });
});

describe("biến cố tự nhập trên thẻ số", () => {
  const cauHinh = (so: number[]) => ({
    loai: "the" as const,
    che_do: "bien_co" as const,
    so_the: 10,
    bien_co: { kieu: "tap_hop" as const, so },
    theo_doi: ["co" as const],
    so_lan_goi_y: 20_000,
    seed: 5,
  });

  it("đọc danh sách số, kể cả khoảng", async () => {
    const { docTapSo } = await import("../src");
    expect(docTapSo("2, 5 ,7")).toEqual([2, 5, 7]);
    expect(docTapSo("1-4, 9, 3")).toEqual([1, 2, 3, 4, 9]);
    expect(docTapSo("")).toBeNull();
    expect(docTapSo("2, a")).toBeNull();
    expect(docTapSo("5-2")).toBeNull();
    expect(docTapSo("0, 21")).toBeNull();
  });

  it("xác suất = số thẻ thuận lợi / số thẻ", () => {
    const kq = chayThiNghiem(cauHinh([2, 3, 5, 7]));
    expect(kq.ly_thuyet).toBe("2/5");
    expect(Math.abs(kq.tan_suat - 0.4)).toBeLessThan(0.02);
  });

  it("từ chối danh sách trống hoặc trùng", () => {
    expect(() => chayThiNghiem(cauHinh([]))).toThrow();
    expect(() => chayThiNghiem(cauHinh([2, 2]))).toThrow();
  });
});
