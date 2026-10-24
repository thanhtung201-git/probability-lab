import { describe, expect, it } from "vitest";
import {
  cacKhoaVat,
  cacSoThuanLoi,
  chayThiNghiem,
  loiGiai,
  moTaBienCo,
  motLuotVat,
  PhanSo,
  phanPhoiDem,
  soMatHienThiVat,
  taoRng,
  thoaBienCo,
  toHop,
  type CauHinhBi,
  type CauHinhThe,
  type CauHinhVat,
} from "../src";

const bi = (che: object, hop = [{ ten: "đỏ", so: 3 }, { ten: "xanh", so: 2 }]): CauHinhBi =>
  ({ loai: "bi", hop, so_lan_goi_y: 1000, seed: 1, ...che }) as CauHinhBi;
const the = (che: object, soThe = 10): CauHinhThe => ({ loai: "the", so_the: soThe, so_lan_goi_y: 1000, seed: 1, ...che }) as CauHinhThe;

describe("tổ hợp và phân phối", () => {
  it("C(n, k)", () => {
    expect(toHop(5, 2)).toBe(10n);
    expect(toHop(10, 0)).toBe(1n);
    expect(toHop(4, 5)).toBe(0n);
  });

  it("3 đỏ, 2 xanh, lấy 2: không hoàn lại 1/10, 3/5, 3/10; có hoàn lại 4/25, 12/25, 9/25", () => {
    expect(phanPhoiDem(5, 3, 2, false).map(String)).toEqual(["1/10", "3/5", "3/10"]);
    expect(phanPhoiDem(5, 3, 2, true).map(String)).toEqual(["4/25", "12/25", "9/25"]);
  });

  it("tổng các xác suất bằng 1", () => {
    for (const hoanLai of [true, false]) {
      const tong = phanPhoiDem(12, 5, 3, hoanLai).reduce((s, p) => s.cong(p), PhanSo.KHONG);
      expect(tong.toString()).toBe("1");
    }
  });
});

describe("hộp bi", () => {
  it("lấy 1 bi: xác suất theo tỉ lệ, không phải 1/2 mỗi màu", () => {
    const khoa = cacKhoaVat(bi({ che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: "đỏ", theo_doi: ["đỏ"] }, [{ ten: "đỏ", so: 1 }, { ten: "xanh", so: 9 }]));
    expect(khoa.map((k) => `${k.khoa}:${k.xac_suat}`)).toEqual(["đỏ:1/10", "xanh:9/10"]);
  });

  it("lấy 2 bi không hoàn lại: 3/10 cả hai đỏ (không phải 9/25)", () => {
    const khoa = cacKhoaVat(bi({ che_do: "phan_phoi", so_lay: 2, hoan_lai: false, mau_muc_tieu: "đỏ", theo_doi: ["2"] }));
    expect(khoa.map((k) => k.xac_suat.toString())).toEqual(["1/10", "3/5", "3/10"]);
    expect(khoa[2]!.nhan).toBe("2 bi đỏ");
  });

  it("không hoàn lại: hộp 1 đỏ 1 xanh, lấy 2 luôn được đúng 1 đỏ", () => {
    const ch = bi({ che_do: "phan_phoi", so_lay: 2, hoan_lai: false, mau_muc_tieu: "đỏ", theo_doi: ["1"] }, [{ ten: "đỏ", so: 1 }, { ten: "xanh", so: 1 }]);
    const rng = taoRng(4);
    for (let i = 0; i < 300; i++) {
      const l = motLuotVat(ch, rng);
      expect(l.khoa).toBe("1");
      expect(new Set(l.mat).size).toBe(2);
    }
  });

  it("có điều kiện: loại lượt khi lấy màu khác, các màu lần kế tiếp theo tỉ lệ", () => {
    const ch = bi({ che_do: "dieu_kien", so_lan_truoc: 2, mau_lap: "xanh", theo_doi: ["đỏ"] }, [{ ten: "đỏ", so: 3 }, { ten: "xanh", so: 7 }]);
    expect(cacKhoaVat(ch).map((k) => `${k.khoa}:${k.xac_suat}`)).toEqual(["đỏ:3/10", "xanh:7/10"]);
    const rng = taoRng(9);
    let giu = 0;
    for (let i = 0; i < 4000; i++) {
      const l = motLuotVat(ch, rng);
      if (l.khoa === null) expect(l.mat.at(-1)).toBe(1); // gặp bi đỏ (nhóm 0) trước khi đủ 2 lần xanh
      else {
        giu++;
        expect(l.mat.slice(0, 2)).toEqual([2, 2]);
      }
    }
    expect(Math.abs(giu / 4000 - 0.49)).toBeLessThan(0.03); // (7/10)^2
    expect(soMatHienThiVat(ch)).toBe(3);
  });

  it("chạy theo lô 20.000 lượt: tần suất gần lý thuyết", () => {
    const kq = chayThiNghiem({ ...bi({ che_do: "phan_phoi", so_lay: 2, hoan_lai: false, mau_muc_tieu: "đỏ", theo_doi: ["2"] }), so_lan_goi_y: 20_000 });
    expect(kq.ly_thuyet).toBe("3/10");
    expect(Math.abs(kq.tan_suat - 0.3)).toBeLessThan(0.015);
  });

  it("từ chối cấu hình sai", () => {
    const sai: object[] = [
      bi({ che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: "đỏ", theo_doi: ["đỏ"] }, [{ ten: "đỏ", so: 1 }, { ten: "đỏ", so: 2 }]),
      bi({ che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: "đỏ", theo_doi: ["đỏ"] }, [{ ten: "đỏ", so: 20 }, { ten: "xanh", so: 11 }]),
      bi({ che_do: "phan_phoi", so_lay: 2, hoan_lai: true, mau_muc_tieu: "tím", theo_doi: ["1"] }),
      bi({ che_do: "dieu_kien", so_lan_truoc: 2, mau_lap: "tím", theo_doi: ["đỏ"] }),
      bi({ che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: "đỏ", theo_doi: ["đỏ"] }, [{ ten: "đỏ", so: 3 }]),
    ];
    for (const ch of sai) expect(() => chayThiNghiem(ch as CauHinhBi)).toThrow();
  });
});

describe("thẻ số", () => {
  it("biến cố", () => {
    expect(cacSoThuanLoi(10, { kieu: "boi", k: 3 })).toEqual([3, 6, 9]);
    expect(cacSoThuanLoi(10, { kieu: "nguyen_to" })).toEqual([2, 3, 5, 7]);
    expect(cacSoThuanLoi(6, { kieu: "chan" })).toEqual([2, 4, 6]);
    expect(cacSoThuanLoi(10, { kieu: "lon_hon", k: 7 })).toEqual([8, 9, 10]);
    expect(thoaBienCo({ kieu: "le" }, 7)).toBe(true);
    expect(moTaBienCo({ kieu: "boi", k: 3 })).toBe("bội của 3");
  });

  it("rút 1 thẻ từ 10: biến cố bội của 3 có xác suất 3/10 (không phải 1/2)", () => {
    const khoa = cacKhoaVat(the({ che_do: "bien_co", bien_co: { kieu: "boi", k: 3 }, theo_doi: ["co"] }));
    expect(khoa.map((k) => `${k.khoa}:${k.xac_suat}`)).toEqual(["co:3/10", "khong:7/10"]);
  });

  it("tung_so: 10 thẻ đều 1/10", () => {
    const khoa = cacKhoaVat(the({ che_do: "tung_so", theo_doi: ["1", "7", "10"] }));
    expect(khoa).toHaveLength(10);
    for (const k of khoa) expect(k.xac_suat.toString()).toBe("1/10");
  });

  it("rút 2 thẻ từ 6, biến cố số chẵn: không hoàn lại P(2) = 1/5, có hoàn lại 1/4", () => {
    const p2 = (hoanLai: boolean) =>
      cacKhoaVat(the({ che_do: "hai_the", hoan_lai: hoanLai, bien_co: { kieu: "chan" }, theo_doi: ["2"] }, 6))[2]!.xac_suat.toString();
    expect(p2(false)).toBe("1/5");
    expect(p2(true)).toBe("1/4");
  });

  it("không hoàn lại: hai thẻ rút ra luôn khác nhau; có hoàn lại thì có thể trùng", () => {
    const rng = taoRng(2);
    const khong = the({ che_do: "hai_the", hoan_lai: false, bien_co: { kieu: "chan" }, theo_doi: ["2"] }, 4);
    for (let i = 0; i < 500; i++) {
      const l = motLuotVat(khong, rng);
      expect(l.mat[0]).not.toBe(l.mat[1]);
    }
    const co = the({ che_do: "hai_the", hoan_lai: true, bien_co: { kieu: "chan" }, theo_doi: ["2"] }, 2);
    let trung = false;
    for (let i = 0; i < 200; i++) {
      const l = motLuotVat(co, rng);
      if (l.mat[0] === l.mat[1]) trung = true;
    }
    expect(trung).toBe(true);
  });

  it("chạy theo lô 20.000 lượt: bội của 3 trong 10 thẻ gần 30%", () => {
    const kq = chayThiNghiem({ ...the({ che_do: "bien_co", bien_co: { kieu: "boi", k: 3 }, theo_doi: ["co"] }), so_lan_goi_y: 20_000 });
    expect(kq.ly_thuyet).toBe("3/10");
    expect(Math.abs(kq.tan_suat - 0.3)).toBeLessThan(0.015);
  });

  it("từ chối cấu hình sai", () => {
    const sai: object[] = [
      the({ che_do: "bien_co", bien_co: { kieu: "boi" }, theo_doi: ["co"] }),
      the({ che_do: "bien_co", bien_co: { kieu: "chan" }, theo_doi: ["co"] }, 100_001),
      the({ che_do: "hai_the", hoan_lai: true, bien_co: { kieu: "chan" }, theo_doi: ["3"] }),
      the({ che_do: "tung_so", theo_doi: ["abc"] }),
    ];
    for (const ch of sai) expect(() => chayThiNghiem(ch as CauHinhThe)).toThrow();
  });
});

describe("thẻ số: bộ thẻ lớn", () => {
  it("chạy được với 50 thẻ và 5.000 thẻ, lời giải liệt kê rút gọn", () => {
    for (const n of [50, 5000]) {
      const ch = the({ che_do: "bien_co", bien_co: { kieu: "nguyen_to" }, theo_doi: ["co"] }, n) as CauHinhThe;
      const r = chayThiNghiem(ch);
      expect(r.chi_tiet.so_luot).toBeGreaterThan(0);
    }
    const lg = loiGiai(the({ che_do: "bien_co", bien_co: { kieu: "chan" }, theo_doi: ["co"] }, 5000) as CauHinhVat, "co");
    const dong = lg.buoc.flatMap((b) => b.phep_tinh ?? []).join(" | ");
    expect(dong).toContain("tổng cộng 2500 số");
    expect(lg.xac_suat).toBe("1/2");
  });
});
