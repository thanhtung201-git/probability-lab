import { describe, expect, it } from "vitest";
import { chayThiNghiem, taoRng, tung, type CauHinhThiNghiem } from "../src";

const CAN_DOI = { tu: 1, mau: 2 };

describe("bộ sinh ngẫu nhiên", () => {
  it("cùng seed cho cùng dãy, khác seed cho dãy khác", () => {
    expect(tung(taoRng(42), 50, 0.5)).toEqual(tung(taoRng(42), 50, 0.5));
    expect(tung(taoRng(42), 50, 0.5)).not.toEqual(tung(taoRng(43), 50, 0.5));
  });

  it("10.000 lần tung lệch khỏi 1/2 không quá 2% với nhiều seed", () => {
    for (const seed of [1, 7, 123, 2026, 99999]) {
      const kq = tung(taoRng(seed), 10_000, 0.5);
      const ngua = kq.filter((m) => m === "N").length / kq.length;
      expect(Math.abs(ngua - 0.5)).toBeLessThan(0.02);
    }
  });
});

describe("chayThiNghiem", () => {
  it("chạy lại cùng cấu hình cho đúng kết quả cũ", () => {
    const ch: CauHinhThiNghiem = { loai: "hoi_tu", moc: [10, 100, 1000], xac_suat_ngua: CAN_DOI, seed: 5 };
    expect(chayThiNghiem(ch)).toEqual(chayThiNghiem(ch));
  });

  it("M1 – có điều kiện: lần thứ 6 sau 5 lần ngửa vẫn xấp xỉ 1/2", () => {
    const kq = chayThiNghiem({
      loai: "co_dieu_kien",
      so_lan_truoc: 5,
      ket_qua_lap: "N",
      bien_co: "S",
      so_chuoi: 2000,
      xac_suat_ngua: CAN_DOI,
      seed: 11,
    });
    expect(kq.ly_thuyet).toBe("1/2");
    expect(kq.chi_tiet.so_chuoi_thoa_dieu_kien).toBe(2000);
    expect(Math.abs(kq.tan_suat - 0.5)).toBeLessThan(0.05);
    // Khoảng 1/32 số chuỗi thỏa điều kiện "5 lần ngửa liên tiếp".
    expect(Math.abs(Number(kq.chi_tiet.ty_le_thoa_dieu_kien) - 1 / 32)).toBeLessThan(0.01);
    expect((kq.tan_so.S ?? 0) + (kq.tan_so.N ?? 0)).toBe(2000);
  });

  it("M2 – hội tụ: độ lệch ở 10.000 lần nhỏ hơn 2% và có số liệu cho từng mốc", () => {
    const kq = chayThiNghiem({ loai: "hoi_tu", moc: [10, 100, 1000, 10000], xac_suat_ngua: CAN_DOI, seed: 3 });
    for (const m of [10, 100, 1000, 10000]) expect(kq.chi_tiet).toHaveProperty(`tan_suat_${m}`);
    expect(Number(kq.chi_tiet.do_lech_10000)).toBeLessThan(0.02);
    expect(kq.du_lieu_bieu_do.at(-1)).toEqual({ x: 10000, y: kq.tan_suat });
    expect(kq.du_lieu_bieu_do.length).toBeLessThan(400);
  });

  it("M4 – so sánh dãy: hai dãy có cùng lý thuyết 1/64 và tần suất gần nhau", () => {
    const kq = chayThiNghiem({
      loai: "so_sanh_day",
      day_a: "NSNSSN",
      day_b: "NNNNNN",
      so_lan: 64_000,
      xac_suat_ngua: CAN_DOI,
      seed: 8,
    });
    expect(kq.ly_thuyet).toBe("1/64");
    expect(kq.chi_tiet.ly_thuyet_b).toBe("1/64");
    expect(Math.abs(kq.tan_suat - 1 / 64)).toBeLessThan(0.004);
    expect(Math.abs(Number(kq.chi_tiet.tan_suat_b) - 1 / 64)).toBeLessThan(0.004);
  });

  it("M5 – xác suất lặp: 70% mưa thì khoảng 30% số ngày không mưa", () => {
    const kq = chayThiNghiem({ loai: "xac_suat_lap", xac_suat: { tu: 7, mau: 10 }, so_ngay: 1000, seed: 21 });
    expect(kq.ly_thuyet).toBe("7/10");
    expect(kq.chi_tiet.ly_thuyet_khong_xay_ra).toBe("3/10");
    expect(Math.abs(Number(kq.chi_tiet.ty_le_khong_xay_ra) - 0.3)).toBeLessThan(0.05);
    expect((kq.tan_so.xay_ra ?? 0) + (kq.tan_so.khong_xay_ra ?? 0)).toBe(1000);
  });

  it("từ chối cấu hình không hợp lệ", () => {
    const sai: unknown[] = [
      { loai: "hoi_tu", moc: [], xac_suat_ngua: CAN_DOI, seed: 1 },
      { loai: "hoi_tu", moc: [10], xac_suat_ngua: { tu: 3, mau: 2 }, seed: 1 },
      { loai: "so_sanh_day", day_a: "NSN", day_b: "NN", so_lan: 10, xac_suat_ngua: CAN_DOI, seed: 1 },
      { loai: "so_sanh_day", day_a: "NXN", day_b: "NNN", so_lan: 10, xac_suat_ngua: CAN_DOI, seed: 1 },
      { loai: "xac_suat_lap", xac_suat: { tu: 7, mau: 10 }, so_ngay: 10_000_000, seed: 1 },
      { loai: "khong_ton_tai", seed: 1 },
    ];
    for (const ch of sai) expect(() => chayThiNghiem(ch as CauHinhThiNghiem)).toThrow();
  });
});
