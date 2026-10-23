import { describe, expect, it } from "vitest";
import ngoNhanRaw from "../../../data/ngo_nhan.json";
import tinhHuongRaw from "../../../data/tinh_huong.json";
import {
  bienDich,
  cacKhoaVat,
  chanDoanBangLuat,
  chayThiNghiem,
  kiemTraThuVien,
  motLuotVat,
  soMatHienThiVat,
  taoPhanHoi,
  taoRng,
  type CauHinhDongXuTT,
} from "../src";

const { ngoNhan, tinhHuong } = kiemTraThuVien(ngoNhanRaw, tinhHuongRaw);
const th = (id: string) => tinhHuong.tinh_huong.find((t) => t.id === id)!;
const cauHinh = (id: string, seed = 1) =>
  bienDich(
    { ma_ngo_nhan: "KXD", gia_thuyet: { loai_thi_nghiem: "khong_co", dieu_kien: "", bien_co: "", du_doan_hs: "" } },
    th(id),
    ngoNhan,
    seed,
  ).cau_hinh as CauHinhDongXuTT;

describe("lý thuyết đồng xu", () => {
  it("1 đồng: ngửa và sấp đều 1/2", () => {
    const khoa = cacKhoaVat({ loai: "dong_xu", che_do: "phan_phoi", so_dong_xu: 1, theo_doi: ["N"], so_lan_goi_y: 1, seed: 1 });
    expect(khoa.map((k) => `${k.nhan}:${k.xac_suat}`)).toEqual(["Ngửa:1/2", "Sấp:1/2"]);
  });

  it("2 đồng: 0, 1, 2 mặt ngửa có xác suất 1/4, 1/2, 1/4 (không phải 1/3)", () => {
    const khoa = cacKhoaVat(cauHinh("dx_hai_dong"));
    expect(khoa.map((k) => `${k.nhan}:${k.xac_suat}`)).toEqual(["0 ngửa:1/4", "1 ngửa:1/2", "2 ngửa:1/4"]);
  });

  it("3 đồng: 1/8, 3/8, 3/8, 1/8", () => {
    const khoa = cacKhoaVat({ loai: "dong_xu", che_do: "phan_phoi", so_dong_xu: 3, theo_doi: ["1"], so_lan_goi_y: 1, seed: 1 });
    expect(khoa.map((k) => k.xac_suat.toString())).toEqual(["1/8", "3/8", "3/8", "1/8"]);
  });

  it("sau 5 lần ngửa, lần kế tiếp ngửa/sấp đều 1/2 (M1)", () => {
    const khoa = cacKhoaVat(cauHinh("dx_5_ngua"));
    for (const k of khoa) expect(k.xac_suat.toString()).toBe("1/2");
  });

  it("hai dãy 6 lần tung đều 1/64 (M4)", () => {
    const khoa = cacKhoaVat(cauHinh("dx_hai_day"));
    expect(khoa.map((k) => k.nhan)).toEqual(["NSNSSN", "NNNNNN"]);
    for (const k of khoa) expect(k.xac_suat.toString()).toBe("1/64");
  });
});

describe("từng lượt tung", () => {
  it("chế độ điều kiện: loại lượt khi gặp mặt khác, giữ lượt đủ k lần cùng mặt", () => {
    const ch = cauHinh("dx_5_ngua");
    const rng = taoRng(3);
    let giu = 0;
    for (let i = 0; i < 4000; i++) {
      const l = motLuotVat(ch, rng);
      if (l.khoa === null) {
        expect(l.mat.at(-1)).toBe(2); // gặp sấp trước khi đủ 5 lần ngửa
      } else {
        giu++;
        expect(l.mat).toHaveLength(6);
        expect(l.mat.slice(0, 5).every((m) => m === 1)).toBe(true);
        expect(l.khoa).toBe(l.mat[5] === 1 ? "N" : "S");
      }
    }
    expect(Math.abs(giu / 4000 - 1 / 32)).toBeLessThan(0.01);
  });

  it("2 đồng: khóa ghi nhận là số mặt ngửa", () => {
    const ch = cauHinh("dx_hai_dong");
    const rng = taoRng(8);
    for (let i = 0; i < 500; i++) {
      const l = motLuotVat(ch, rng);
      expect(l.mat).toHaveLength(2);
      expect(l.khoa).toBe(String(l.mat.filter((m) => m === 1).length));
    }
    expect(soMatHienThiVat(ch)).toBe(2);
  });
});

describe("chạy theo lô và phản hồi", () => {
  it("2 đồng, 20.000 lượt: tần suất 0/1/2 ngửa gần 1/4, 1/2, 1/4", () => {
    const kq = chayThiNghiem({ ...cauHinh("dx_hai_dong"), so_lan_goi_y: 20_000 });
    const tl = (k: string) => (kq.tan_so[k] ?? 0) / 20_000;
    expect(Math.abs(tl("0") - 0.25)).toBeLessThan(0.015);
    expect(Math.abs(tl("1") - 0.5)).toBeLessThan(0.015);
    expect(Math.abs(tl("2") - 0.25)).toBeLessThan(0.015);
  });

  it("cùng seed cho cùng kết quả", () => {
    expect(chayThiNghiem(cauHinh("dx_7_10", 5))).toEqual(chayThiNghiem(cauHinh("dx_7_10", 5)));
  });

  it("điền đủ số liệu phản hồi cho cả 4 bài", () => {
    for (const id of ["dx_5_ngua", "dx_7_10", "dx_hai_day", "dx_hai_dong"]) {
      const ph = taoPhanHoi(chayThiNghiem(cauHinh(id)), th(id), ngoNhan, "M0", "");
      expect(ph.theo_so_lieu).not.toMatch(/\{\w+\}/);
      expect(ph.theo_so_lieu).toMatch(/lượt tung/);
    }
  });

  it("từ chối cấu hình sai", () => {
    const sai: unknown[] = [
      { loai: "dong_xu", che_do: "day", day_a: "NSN", day_b: "NN", theo_doi: ["a"], so_lan_goi_y: 10, seed: 1 },
      { loai: "dong_xu", che_do: "day", day_a: "NXN", day_b: "NNN", theo_doi: ["a"], so_lan_goi_y: 10, seed: 1 },
      { loai: "dong_xu", che_do: "phan_phoi", so_dong_xu: 11, theo_doi: ["1"], so_lan_goi_y: 10, seed: 1 },
    ];
    for (const ch of sai) expect(() => chayThiNghiem(ch as CauHinhDongXuTT)).toThrow();
  });
});

describe("bộ luật cho bài hai đồng xu", () => {
  const ca: [string, string][] = [
    ["Em đồng ý vì có 3 trường hợp nên mỗi trường hợp 1/3", "M3"],
    ["Có 3 trường hợp nên như nhau", "M3"],
    ["Em không đồng ý, có 4 kết quả nên 1 ngửa chiếm 1/2", "M0"],
    ["Một ngửa có hai cách là ngửa-sấp và sấp-ngửa nên nhiều cách hơn", "M0"],
  ];
  for (const [cau, ma] of ca) {
    it(`"${cau}" → ${ma}`, () => {
      expect(chanDoanBangLuat(cau, ngoNhan, th("dx_hai_dong")).ma_ngo_nhan).toBe(ma);
    });
  }
});
