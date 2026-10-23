import { describe, expect, it } from "vitest";
import ngoNhanRaw from "../../../data/ngo_nhan.json";
import tinhHuongRaw from "../../../data/tinh_huong.json";
import { bienDich, chanDoanBangLuat, chayThiNghiem, kiemTraThuVien, taoPhanHoi } from "../src";

const { ngoNhan, tinhHuong } = kiemTraThuVien(ngoNhanRaw, tinhHuongRaw);
const th = (id: string) => tinhHuong.tinh_huong.find((t) => t.id === id)!;

describe("bộ luật cho bài hộp bi và thẻ số", () => {
  const ca: [string, string, string][] = [
    ["bi_mot", "Em đồng ý vì chỉ có 2 màu nên mỗi màu là 1/2", "M3"],
    ["bi_mot", "Không đồng ý, có 1 bi đỏ trên 10 bi nên xác suất là 1/10", "M0"],
    ["bi_hai_khong_hoan", "Em đồng ý, 3/5 nhân 3/5 bằng 9/25", "M6"],
    ["bi_hai_khong_hoan", "Em không đồng ý vì lấy một bi đỏ rồi thì còn 2 bi đỏ trong 4 bi, ra 3/5 x 2/4 = 3/10", "M0"],
    ["bi_lien_tiep", "Em đồng ý, xanh nhiều lần rồi nên đỏ sắp ra", "M1"],
    ["bi_lien_tiep", "Em không đồng ý, các lần độc lập vì có bỏ lại", "M0"],
    ["the_boi_3", "Em đồng ý vì có 2 khả năng nên là 1/2", "M3"],
    ["the_boi_3", "Em không đồng ý, có 3 thẻ là 3, 6, 9 trong 10 thẻ nên 3/10", "M0"],
    ["the_so_dac_biet", "Em đồng ý vì thẻ 10 và 7 đặc biệt nên khó rút hơn", "M4"],
    ["the_so_dac_biet", "Em không đồng ý, các thẻ giống hệt nhau nên khả năng như nhau, đều 1/10", "M0"],
    ["the_hai_khong_hoan", "Em đồng ý, 3/6 nhân 3/6 bằng 1/4", "M6"],
    ["the_hai_khong_hoan", "Em không đồng ý vì thẻ thứ hai chỉ còn 2 thẻ chẵn trong 5 thẻ, 3/6 x 2/5 = 1/5", "M0"],
  ];
  for (const [id, cau, ma] of ca) {
    it(`${id}: "${cau}" → ${ma}`, () => {
      expect(chanDoanBangLuat(cau, ngoNhan, th(id)).ma_ngo_nhan).toBe(ma);
    });
  }
});

describe("dựng thí nghiệm và phản hồi cho 6 bài mới", () => {
  for (const id of ["bi_mot", "bi_hai_khong_hoan", "bi_lien_tiep", "the_boi_3", "the_so_dac_biet", "the_hai_khong_hoan"]) {
    it(id, () => {
      const kq = bienDich(
        { ma_ngo_nhan: "KXD", gia_thuyet: { loai_thi_nghiem: "khong_co", dieu_kien: "", bien_co: "", du_doan_hs: "" } },
        th(id),
        ngoNhan,
        3,
      );
      const ketQua = chayThiNghiem(kq.cau_hinh);
      expect(ketQua.ly_thuyet_so).toBeGreaterThan(0);
      const ph = taoPhanHoi(ketQua, th(id), ngoNhan, "M0", "");
      expect(ph.theo_so_lieu).not.toMatch(/\{\w+\}/);
    });
  }

  it("lý thuyết của các bài tiêu biểu", () => {
    const lt = (id: string, seed = 1) =>
      chayThiNghiem(
        bienDich({ ma_ngo_nhan: "KXD", gia_thuyet: { loai_thi_nghiem: "khong_co", dieu_kien: "", bien_co: "", du_doan_hs: "" } }, th(id), ngoNhan, seed).cau_hinh,
      ).ly_thuyet;
    expect(lt("bi_mot")).toBe("1/10");
    expect(lt("bi_hai_khong_hoan")).toBe("3/10");
    expect(lt("the_boi_3")).toBe("3/10");
    expect(lt("the_hai_khong_hoan")).toBe("1/5");
  });
});
