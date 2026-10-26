import { describe, expect, it } from "vitest";
import { FORM_MO_MAC_DINH, khongGianMau, loiGiaiHocSinh, moTaBaiMo, taoVatTuNguon, xacSuatBaiToan, xayBaiMo, type CauHinhBaiToan, type FormMo } from "../src";

const tinh = (f: FormMo) => {
  const kq = xayBaiMo(f);
  if ("loi" in kq) throw new Error(kq.loi);
  const ch: CauHinhBaiToan = { ...kq.cau_hinh, seed: 1 };
  return { p: xacSuatBaiToan(ch), gs: khongGianMau(ch, 60), ch };
};

describe("bài toán mở", () => {
  it("số lẻ có 2 chữ số, chọn 1 số: P(chính phương) = 3/45 = 1/15", () => {
    const { p, gs } = tinh(FORM_MO_MAC_DINH);
    expect(gs.tong).toBe(45);
    expect(gs.thoa).toBe(3);
    expect(p.toString()).toBe("1/15");
    expect(gs.ds?.filter((k) => k.thoa).map((k) => k.nhan)).toEqual([...["(25)", "(49)", "(81)"]]);
  });

  it("túi 4 bi, lấy 2 không hoàn lại, tổng lẻ: 2/3", () => {
    const { p } = tinh({
      nguon: { kieu: "danh_so", n: 4 },
      ten_vat: "bi",
      so_lan: 2,
      hoan_lai: false,
      bien_co: { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "le" } },
      phu_dinh: false,
    });
    expect(p.toString()).toBe("2/3");
  });

  it("ghép và / hoặc / không", () => {
    const base: FormMo = { ...FORM_MO_MAC_DINH, nguon: { kieu: "day_so", tu: 1, den: 20, buoc: 1, loc: [] } };
    const chan = { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chan" } } as const;
    const chiaHet3 = { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chia_het", k: 3 } } as const;
    expect(tinh({ ...base, bien_co: { kieu: "gop", phep: "va", cac: [chan, chiaHet3] } }).gs.thoa).toBe(3); // 6, 12, 18
    expect(tinh({ ...base, bien_co: { kieu: "gop", phep: "hoac", cac: [chan, chiaHet3] } }).gs.thoa).toBe(13); // 10 + 6 - 3
    expect(tinh({ ...base, bien_co: { kieu: "gop", phep: "va", cac: [chan, { ...chiaHet3, khong: true }] } }).gs.thoa).toBe(7); // chẵn nhưng không chia hết 3
    expect(tinh({ ...base, bien_co: chan, phu_dinh: true }).gs.thoa).toBe(10);
  });

  it("các bộ lọc của dãy số", () => {
    const so = (loc: FormMo["nguon"] & { kieu: "day_so" }) => {
      const v = taoVatTuNguon(loc);
      return "vat" in v ? v.vat.map((x) => x.so) : v.loi;
    };
    const day = { kieu: "day_so" as const, tu: 10, den: 40, buoc: 1 };
    expect(so({ ...day, loc: [{ dk: { loai: "nguyen_to" } }] })).toEqual([11, 13, 17, 19, 23, 29, 31, 37]);
    expect(so({ ...day, loc: [{ dk: { loai: "chu_so_khac_nhau" }, khong: true }] })).toEqual([11, 22, 33]);
    expect(so({ ...day, loc: [{ dk: { loai: "co_chu_so", d: 3 } }, { dk: { loai: "chan" } }] })).toEqual([30, 32, 34, 36, 38]);
    expect(so({ ...day, tu: 50, den: 10, loc: [] })).toMatch(/lớn hơn/);
  });

  it("mô tả bài bằng lời để đối chiếu", () => {
    expect(moTaBaiMo(FORM_MO_MAC_DINH, 45)).toContain("Chọn ngẫu nhiên 1 số từ 45 số");
    expect(moTaBaiMo(FORM_MO_MAC_DINH, 45)).toContain("chính phương");
  });
});

describe("lời giải cho học sinh", () => {
  it("số lẻ 2 chữ số, chính phương: đủ bước và đúng số liệu", () => {
    const kq = xayBaiMo(FORM_MO_MAC_DINH);
    if ("loi" in kq) throw new Error(kq.loi);
    const lg = loiGiaiHocSinh({ ...kq.cau_hinh, seed: 1 });
    const chu = JSON.stringify(lg);
    expect(lg.buoc).toHaveLength(4);
    expect(lg.xac_suat).toBe("1/15");
    expect(chu).toContain("(99 − 11) : 2 + 1 = 45");
    expect(chu).toContain("25 = 5²");
    expect(chu).toContain("chia cả tử và mẫu cho 3");
    expect(lg.ket_luan).toContain("1/15");
  });

  it("lấy 2 bi không hoàn lại: quy tắc nhân và lưu ý", () => {
    const kq = xayBaiMo({ nguon: { kieu: "danh_so", n: 4 }, ten_vat: "bi", so_lan: 2, hoan_lai: false, bien_co: { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "le" } }, phu_dinh: false });
    if ("loi" in kq) throw new Error(kq.loi);
    const lg = loiGiaiHocSinh({ ...kq.cau_hinh, seed: 1 });
    expect(JSON.stringify(lg)).toContain("4 × 3 = 12");
    expect(lg.xac_suat).toBe("2/3");
    expect(lg.luu_y.length).toBeGreaterThan(0);
  });
});

describe("lời giải học sinh cho vật cùng màu", () => {
  it("6 trắng 4 đen, lấy 2 có hoàn lại, đúng 2 trắng: gom nhóm 6 × 6 = 36", () => {
    const kq = xayBaiMo({ nguon: { kieu: "theo_mau", nhom: "trắng 6, đen 4" }, ten_vat: "bi", so_lan: 2, hoan_lai: true, bien_co: { kieu: "mau", loai: "dung", mau: "trắng", k: 2 }, phu_dinh: false });
    if ("loi" in kq) throw new Error(kq.loi);
    const lg = loiGiaiHocSinh({ ...kq.cau_hinh, seed: 1 });
    const chu = JSON.stringify(lg);
    expect(chu).toContain("(trắng, trắng): 6 × 6 = 36 cách");
    expect(chu).not.toContain("(trắng, trắng); (trắng, trắng)");
    expect(lg.xac_suat).toBe("9/25");
  });

  it("không hoàn lại: số bi giảm dần (6 × 5 = 30)", () => {
    const kq = xayBaiMo({ nguon: { kieu: "theo_mau", nhom: "trắng 6, đen 4" }, ten_vat: "bi", so_lan: 2, hoan_lai: false, bien_co: { kieu: "mau", loai: "dung", mau: "trắng", k: 2 }, phu_dinh: false });
    if ("loi" in kq) throw new Error(kq.loi);
    expect(JSON.stringify(loiGiaiHocSinh({ ...kq.cau_hinh, seed: 1 }))).toContain("(trắng, trắng): 6 × 5 = 30 cách");
  });
});
