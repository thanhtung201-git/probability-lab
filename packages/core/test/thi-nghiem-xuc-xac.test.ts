import { describe, expect, it } from "vitest";
import ngoNhanRaw from "../../../data/ngo_nhan.json";
import tinhHuongRaw from "../../../data/tinh_huong.json";
import {
  bienDich,
  cacKhoa,
  chanDoanBangLuat,
  chayThiNghiem,
  kiemTraThuVien,
  motLuot,
  taoPhanHoi,
  taoRng,
  xacSuatDieuKienXucXac,
  type CauHinhXucXac,
} from "../src";

const { ngoNhan, tinhHuong } = kiemTraThuVien(ngoNhanRaw, tinhHuongRaw);
const th = (id: string) => tinhHuong.tinh_huong.find((t) => t.id === id)!;
const cauHinh = (id: string, seed = 1) =>
  bienDich(
    { ma_ngo_nhan: "KXD", gia_thuyet: { loai_thi_nghiem: "khong_co", dieu_kien: "", bien_co: "", du_doan_hs: "" } },
    th(id),
    ngoNhan,
    seed,
  ).cau_hinh as CauHinhXucXac;

describe("lý thuyết xúc xắc", () => {
  it("sau k lần không ra mặt 6, lần kế tiếp ra 6 vẫn là 1/6 (liệt kê 6^(k+1) kết quả)", () => {
    for (const k of [1, 3, 5]) expect(xacSuatDieuKienXucXac(k).toString()).toBe("1/6");
  });

  it("hai dãy 3 lần gieo đều có xác suất 1/216", () => {
    const khoa = cacKhoa(cauHinh("xx_day"));
    expect(khoa.map((k) => k.nhan)).toEqual(["6-6-6", "2-5-3"]);
    for (const k of khoa) expect(k.xac_suat.toString()).toBe("1/216");
  });

  it("tổng 7 là 1/6, tổng 12 là 1/36", () => {
    const khoa = cacKhoa(cauHinh("xx_tong_7_12"));
    expect(khoa.find((k) => k.khoa === "7")!.xac_suat.toString()).toBe("1/6");
    expect(khoa.find((k) => k.khoa === "12")!.xac_suat.toString()).toBe("1/36");
  });
});

describe("từng lượt gieo", () => {
  it("chế độ điều kiện: lượt bị loại khi gặp mặt 6 trước lần cuối", () => {
    const ch = cauHinh("xx_mat_6");
    const rng = taoRng(5);
    for (let i = 0; i < 2000; i++) {
      const l = motLuot(ch, rng);
      if (l.khoa === null) {
        expect(l.mat.at(-1)).toBe(6);
        expect(l.mat.length).toBeLessThanOrEqual(5);
      } else {
        expect(l.mat).toHaveLength(6);
        expect(l.mat.slice(0, 5)).not.toContain(6);
        expect(l.khoa).toBe(l.mat[5] === 6 ? "ra" : "khong");
      }
    }
  });

  it("chạy theo lô: tần suất gần lý thuyết", () => {
    const m6 = chayThiNghiem({ ...cauHinh("xx_mat_6"), so_lan_goi_y: 60_000 });
    expect(m6.ly_thuyet).toBe("1/6");
    expect(Math.abs(m6.tan_suat - 1 / 6)).toBeLessThan(0.015);

    const t7 = chayThiNghiem(cauHinh("xx_tong_7_12"));
    expect(t7.tan_so["7"]! > t7.tan_so["12"]!).toBe(true);
  });
});

describe("bộ luật theo từng bài toán xúc xắc", () => {
  const ca: [string, string, string][] = [
    ["xx_tong_7_12", "Tổng 7 và tổng 12 như nhau vì có 11 tổng", "M3"],
    ["xx_tong_7_12", "Tổng 7 dễ hơn vì có 6 cách, tổng 12 chỉ có 1 cách", "M0"],
    ["xx_tong_7_12", "Không như nhau, tổng 7 nhiều cách hơn", "M0"],
    ["xx_mat_6", "Em đồng ý vì lâu chưa ra nên sắp ra 6", "M1"],
    ["xx_mat_6", "Em không đồng ý, xúc xắc không nhớ nên vẫn là 1/6", "M0"],
    ["xx_lech", "Đồng ý, xúc xắc bị lệch về mặt 1", "M2"],
    ["xx_lech", "Không đồng ý vì 12 lần là quá ít", "M0"],
    ["xx_day", "Dãy 6-6-6 khó ra hơn vì lặp lại", "M4"],
    ["xx_day", "Hai dãy khả năng như nhau, đều 1/216", "M0"],
  ];
  for (const [id, cau, ma] of ca) {
    it(`${id}: "${cau}" → ${ma}`, () => {
      expect(chanDoanBangLuat(cau, ngoNhan, th(id)).ma_ngo_nhan).toBe(ma);
    });
  }

  it("cùng câu \"như nhau\" nhưng khác bài: M3 ở tổng 7/12, M0 ở hai dãy", () => {
    expect(chanDoanBangLuat("như nhau", ngoNhan, th("xx_tong_7_12")).ma_ngo_nhan).toBe("M3");
    expect(chanDoanBangLuat("như nhau", ngoNhan, th("xx_day")).ma_ngo_nhan).toBe("M0");
  });
});

describe("phản hồi theo số liệu xúc xắc", () => {
  it("điền đủ số liệu cho cả 4 bài", () => {
    for (const id of ["xx_tong_7_12", "xx_mat_6", "xx_lech", "xx_day"]) {
      const kq = chayThiNghiem(cauHinh(id));
      const ph = taoPhanHoi(kq, th(id), ngoNhan, "M0", "");
      expect(ph.theo_so_lieu).not.toMatch(/\{\w+\}/);
      expect(ph.theo_so_lieu).toMatch(/lượt gieo/);
    }
  });
});
