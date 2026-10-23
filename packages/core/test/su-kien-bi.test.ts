// Biến cố trên nhiều bi: ít nhất 1 bi màu X, hai bi cùng màu, hai bi khác màu.
import { describe, expect, it } from "vitest";
import { cacKhoaVat, chayThiNghiem, loiGiai, type CauHinhBi } from "../src";

const hop = [{ ten: "xanh", so: 3 }, { ten: "vàng", so: 4 }];
const bi = (su_kien: "it_nhat" | "cung_mau" | "khac_mau", hoan_lai: boolean, so_lay: 2 | 3 = 2, h = hop): CauHinhBi => ({
  loai: "bi",
  hop: h,
  che_do: "phan_phoi",
  so_lay,
  hoan_lai,
  mau_muc_tieu: "vàng",
  su_kien,
  theo_doi: ["co"],
  so_lan_goi_y: 20_000,
  seed: 11,
});
const p = (ch: CauHinhBi, k = "co") => cacKhoaVat(ch).find((x) => x.khoa === k)!.xac_suat.toString();

describe("biến cố trên 2 bi (bài 3 nam 4 nữ chọn 2 người)", () => {
  it("ít nhất 1 bi vàng, không hoàn lại = 6/7", () => expect(p(bi("it_nhat", false))).toBe("6/7"));
  it("cùng màu = 3/7, khác màu = 4/7", () => {
    expect(p(bi("cung_mau", false))).toBe("3/7");
    expect(p(bi("khac_mau", false))).toBe("4/7");
    expect(p(bi("cung_mau", false), "khong")).toBe("4/7");
  });
  it("có hoàn lại: ít nhất 1 vàng = 40/49, cùng màu = 25/49", () => {
    expect(p(bi("it_nhat", true))).toBe("40/49");
    expect(p(bi("cung_mau", true))).toBe("25/49");
  });
  it("lấy 3 bi, ít nhất 1 vàng không hoàn lại = 1 − C(3,3)/C(7,3) = 34/35", () => expect(p(bi("it_nhat", false, 3))).toBe("34/35"));

  it("chạy thử gần lý thuyết", () => {
    const kq = chayThiNghiem(bi("it_nhat", false));
    expect(Math.abs(kq.tan_suat - 6 / 7)).toBeLessThan(0.01);
  });

  it("lời giải khớp xác suất ở mọi kết quả và nêu cách phần bù", () => {
    for (const su of ["it_nhat", "cung_mau", "khac_mau"] as const) {
      for (const hl of [true, false]) {
        const ch = bi(su, hl, 2, [{ ten: "xanh", so: 3 }, { ten: "vàng", so: 4 }, { ten: "đỏ", so: 2 }]);
        for (const k of cacKhoaVat(ch)) {
          const lg = loiGiai(ch, k.khoa);
          expect(lg.xac_suat, `${su}/${hl}/${k.khoa}`).toBe(k.xac_suat.toString());
          expect(lg.de_hieu.length).toBeGreaterThan(0);
        }
      }
    }
    expect(loiGiai(bi("it_nhat", false), "co").cong_thuc).toContain("1 −");
  });

  it("từ chối cùng màu khi lấy 3 bi", () => {
    expect(() => chayThiNghiem(bi("cung_mau", false, 3))).toThrow();
  });
});
