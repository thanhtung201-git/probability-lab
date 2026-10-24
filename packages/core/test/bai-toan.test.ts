// Bài toán tổng quát: lấy vật có màu/số, biến cố trên số hoặc trên màu; hai đề mẫu "túi 4 bi đánh số 1-4".
import { describe, expect, it } from "vitest";
import { cacKhoaVat, chayThiNghiem, docVatTongQuat, FORM_BAI_TOAN_MAC_DINH, loiGiai, xayBaiToan, type CauHinhBaiToan, type FormBaiToan } from "../src";

const dung = (f: Partial<FormBaiToan>): CauHinhBaiToan => {
  const kq = xayBaiToan({ ...FORM_BAI_TOAN_MAC_DINH, ...f });
  if ("loi" in kq) throw new Error(kq.loi);
  return { ...kq.cau_hinh, seed: 3 };
};
const p = (ch: CauHinhBaiToan, k = "co") => cacKhoaVat(ch).find((x) => x.khoa === k)!.xac_suat.toString();

describe("hai đề mẫu: túi 4 bi đánh số 1-4, lấy lần lượt 2 bi không hoàn lại", () => {
  it("câu 4: tổng chia 3 dư 1 → 1/3", () => expect(p(dung({ dieu_kien: "du", m: 3, r: 1 }))).toBe("1/3"));
  it("câu 25: tổng là số lẻ → 2/3", () => expect(p(dung({ dieu_kien: "le" }))).toBe("2/3"));
  it("chạy thử gần lý thuyết", () => {
    const kq = chayThiNghiem(dung({ dieu_kien: "le" }));
    expect(Math.abs(kq.tan_suat - 2 / 3)).toBeLessThan(0.02);
    expect(kq.ly_thuyet).toBe("2/3");
  });
  it("lời giải liệt kê đủ 12 kết quả và nêu 4 kết quả thỏa", () => {
    const lg = loiGiai(dung({ dieu_kien: "du", m: 3, r: 1 }), "co");
    expect(lg.buoc[1]!.phep_tinh![0]).toContain("4 × 3 = 12");
    expect(lg.buoc[2]!.phep_tinh![0]).toContain("(1, 3)");
    expect(lg.buoc[2]!.phep_tinh![1]).toContain("= 4");
    expect(lg.xac_suat).toBe("1/3");
  });
});

describe("đồng xu và xúc xắc quy về bài toán tổng quát (mỗi mặt là một vật, lấy có hoàn lại)", () => {
  const dongXu = { che_do_vat: "theo_mau" as const, nhom: "ngửa 1, sấp 1", ten_vat: "mặt đồng xu", so_lan: 2, hoan_lai: true, loai_bien_co: "mau" as const };
  it("gieo đồng xu 2 lần, ít nhất 1 lần sấp → 3 kết quả thuận lợi, P = 3/4", () => {
    const ch = dung({ ...dongXu, mau_loai: "it_nhat", mau: "sấp" });
    expect(p(ch)).toBe("3/4");
    const lg = loiGiai(ch, "co");
    expect(lg.buoc.flatMap((b) => b.phep_tinh ?? []).join(" | ")).toContain("= 3");
    expect(lg.xac_suat).toBe("3/4");
  });
  it("cả hai lần cùng mặt → 1/2; đúng 1 lần ngửa → 1/2", () => {
    expect(p(dung({ ...dongXu, mau_loai: "cung_mau" }))).toBe("1/2");
    expect(p(dung({ ...dongXu, mau_loai: "dung", mau: "ngửa", k_mau: 1 }))).toBe("1/2");
  });
  it("gieo 2 xúc xắc, tổng chia hết cho 3 → 1/3; tích là số chẵn → 3/4", () => {
    const xx = { che_do_vat: "danh_so" as const, n: 6, ten_vat: "mặt xúc xắc", so_lan: 2, hoan_lai: true, loai_bien_co: "so" as const };
    expect(p(dung({ ...xx, dai_luong: "tong", dieu_kien: "chia_het", k: 3 }))).toBe("1/3");
    expect(p(dung({ ...xx, dai_luong: "tich", dieu_kien: "chan" }))).toBe("3/4");
  });
  it("có ít nhất một mặt 6 khi gieo 2 xúc xắc → 11/36", () => {
    const ch = dung({ che_do_vat: "mau_va_so", nhom: "sáu: 6; khác: 1 2 3 4 5", ten_vat: "mặt xúc xắc", so_lan: 2, hoan_lai: true, loai_bien_co: "mau", mau_loai: "it_nhat", mau: "sáu" });
    expect(p(ch)).toBe("11/36");
  });
});

describe("các dạng biến cố khác", () => {
  it("ít nhất 1 bạn nữ trong nhóm 3 nam 4 nữ, chọn 2 → 6/7", () => {
    expect(p(dung({ che_do_vat: "theo_mau", nhom: "nam 3, nữ 4", loai_bien_co: "mau", mau_loai: "it_nhat", mau: "nữ", ten_vat: "học sinh" }))).toBe("6/7");
  });
  it("hai bi cùng màu = 3/7, đúng 1 bi nữ = 4/7", () => {
    expect(p(dung({ che_do_vat: "theo_mau", nhom: "nam 3, nữ 4", loai_bien_co: "mau", mau_loai: "cung_mau" }))).toBe("3/7");
    expect(p(dung({ che_do_vat: "theo_mau", nhom: "nam 3, nữ 4", loai_bien_co: "mau", mau_loai: "dung", mau: "nữ", k_mau: 1 }))).toBe("4/7");
  });
  it("lập số 2 chữ số từ thẻ 1-5 (không hoàn lại), số chẵn → 2/5", () => {
    expect(p(dung({ n: 5, dai_luong: "ghep", dieu_kien: "chan" }))).toBe("2/5");
  });
  it("tích chẵn khi lấy có hoàn lại 2 lần trong 4 thẻ → 3/4; phủ định cho tích lẻ", () => {
    expect(p(dung({ hoan_lai: true, dai_luong: "tich", dieu_kien: "chan" }))).toBe("3/4");
    expect(p(dung({ hoan_lai: true, dai_luong: "tich", dieu_kien: "chan", phu_dinh: true }))).toBe("1/4");
  });
  it("số lớn nhất bằng 4 khi lấy 2 trong 4 (không hoàn lại) → 1/2", () => {
    expect(p(dung({ dai_luong: "lon_nhat", dieu_kien: "bang", k: 4 }))).toBe("1/2");
  });
  it("bi màu và số: tổng chẵn", () => {
    const ch = dung({ che_do_vat: "mau_va_so", nhom: "đỏ: 1 2 3; xanh: 4 5", n: 5, dieu_kien: "chan" });
    expect(ch.vat).toHaveLength(5);
    // cặp cùng tính chẵn lẻ: lẻ{1,3}→2 cặp, chẵn{2,4}→... số 1 2 3 4 5: lẻ 1,3,5 (3 số) chẵn 2,4 (2 số): 3×2+2×1=8 cặp có thứ tự trên 20
    expect(p(ch)).toBe("2/5");
  });
  it("có hoàn lại lấy 3 vật tính tổng, số cách 64 vẫn đếm đúng", () => {
    const ch = dung({ hoan_lai: true, so_lan: 3, dieu_kien: "bang", k: 3 });
    expect(p(ch)).toBe("1/64");
  });
});

describe("lời giải khớp xác suất ở mọi cấu hình", () => {
  const luoi: Partial<FormBaiToan>[] = [
    { dieu_kien: "du", m: 3, r: 1 },
    { dai_luong: "tich", dieu_kien: "chia_het", k: 4 },
    { n: 12, so_lan: 3, dai_luong: "tong", dieu_kien: "lon_hon", k: 20 },
    { n: 10, hoan_lai: true, so_lan: 3, dai_luong: "tong", dieu_kien: "chan" },
    { che_do_vat: "theo_mau", nhom: "đỏ 2, xanh 3, vàng 4", loai_bien_co: "mau", mau_loai: "it_nhat", mau: "vàng", so_lan: 3 },
    { che_do_vat: "theo_mau", nhom: "đỏ 2, xanh 3", loai_bien_co: "mau", mau_loai: "khac_mau", hoan_lai: true },
    { dieu_kien: "nguyen_to", phu_dinh: true },
  ];
  luoi.forEach((f, i) => {
    it(`cấu hình ${i + 1}`, () => {
      const ch = dung(f);
      for (const k of cacKhoaVat(ch)) {
        const lg = loiGiai(ch, k.khoa);
        expect(lg.xac_suat).toBe(k.xac_suat.toString());
        expect(lg.buoc.length).toBeGreaterThanOrEqual(3);
        expect(lg.de_hieu.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("kiểm tra đầu vào", () => {
  it("báo lỗi tiếng Việt khi nhập sai", () => {
    expect(docVatTongQuat({ che_do_vat: "theo_mau", n: 0, nhom: "đỏ ba" })).toEqual({ loi: "Không hiểu “đỏ ba”. Viết dạng: đỏ 3, xanh 2" });
    expect("loi" in docVatTongQuat({ che_do_vat: "mau_va_so", n: 0, nhom: "đỏ 1 2" })).toBe(true);
    expect(xayBaiToan({ ...FORM_BAI_TOAN_MAC_DINH, n: 5000 })).toEqual({ loi: "Số vật phải từ 2 đến 1000" });
    expect("loi" in xayBaiToan({ ...FORM_BAI_TOAN_MAC_DINH, so_lan: 5 })).toBe(true);
    expect("loi" in xayBaiToan({ ...FORM_BAI_TOAN_MAC_DINH, n: 30, so_lan: 4, hoan_lai: true })).toBe(true);
    expect("loi" in xayBaiToan({ ...FORM_BAI_TOAN_MAC_DINH, loai_bien_co: "mau", che_do_vat: "danh_so" })).toBe(true);
    expect("loi" in xayBaiToan({ ...FORM_BAI_TOAN_MAC_DINH, dieu_kien: "du", m: 3, r: 5 })).toBe(true);
  });
});
