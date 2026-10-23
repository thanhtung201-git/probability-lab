// Lời giải từng bước phải cho đúng xác suất lý thuyết của thí nghiệm, với mọi vật, chế độ và kết quả.
import { describe, expect, it } from "vitest";
import { cacKhoaVat, loiGiai, type CauHinhVat } from "../src";

const g = { so_lan_goi_y: 10, seed: 1 };
const hop = [{ ten: "đỏ", so: 3 }, { ten: "xanh", so: 2 }, { ten: "vàng", so: 4 }];

const CA: [string, CauHinhVat][] = [
  ...[1, 2, 3, 4].map((n): [string, CauHinhVat] => [`${n} xúc xắc`, { loai: "xuc_xac", che_do: "phan_phoi", so_xuc_xac: n, theo_doi: [n], ...g }]),
  ["xúc xắc điều kiện", { loai: "xuc_xac", che_do: "dieu_kien", so_lan_truoc: 5, mat: 6, theo_doi: ["ra"], ...g }],
  ["xúc xắc dãy", { loai: "xuc_xac", che_do: "day", day_a: [6, 6, 6], day_b: [2, 5, 3], theo_doi: ["a", "b"], ...g }],
  ...[1, 2, 3, 6].map((n): [string, CauHinhVat] => [`${n} đồng xu`, { loai: "dong_xu", che_do: "phan_phoi", so_dong_xu: n, theo_doi: ["N"], ...g }]),
  ["đồng xu điều kiện", { loai: "dong_xu", che_do: "dieu_kien", so_lan_truoc: 4, mat: "N", theo_doi: ["S"], ...g }],
  ["đồng xu dãy", { loai: "dong_xu", che_do: "day", day_a: "NNNNNN", day_b: "NSNSSN", theo_doi: ["a", "b"], ...g }],
  ["bi 1 viên", { loai: "bi", hop, che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: "đỏ", theo_doi: ["đỏ"], ...g }],
  ...[true, false].flatMap((hl): [string, CauHinhVat][] =>
    [2, 3].map((n): [string, CauHinhVat] => [`bi ${n} viên ${hl ? "có" : "không"} hoàn lại`, { loai: "bi", hop, che_do: "phan_phoi", so_lay: n as 2 | 3, hoan_lai: hl, mau_muc_tieu: "xanh", theo_doi: ["1"], ...g }]),
  ),
  ["bi điều kiện", { loai: "bi", hop, che_do: "dieu_kien", so_lan_truoc: 3, mau_lap: "vàng", theo_doi: ["đỏ"], ...g }],
  ["thẻ từng số", { loai: "the", che_do: "tung_so", so_the: 10, theo_doi: ["1"], ...g }],
  ...(["chan", "nguyen_to"] as const).map((kieu): [string, CauHinhVat] => [`thẻ biến cố ${kieu}`, { loai: "the", che_do: "bien_co", so_the: 12, bien_co: { kieu }, theo_doi: ["co"], ...g }]),
  ["thẻ tự nhập", { loai: "the", che_do: "bien_co", so_the: 10, bien_co: { kieu: "tap_hop", so: [1, 2, 3, 8] }, theo_doi: ["co"], ...g }],
  ...[true, false].flatMap((hl): [string, CauHinhVat][] => [
    [`thẻ hai ${hl ? "có" : "không"} hoàn lại`, { loai: "the", che_do: "hai_the", hoan_lai: hl, so_the: 10, bien_co: { kieu: "boi", k: 3 }, theo_doi: ["2"], ...g }],
  ]),
];

describe("lời giải từng bước", () => {
  for (const [ten, ch] of CA) {
    it(`${ten}: mọi kết quả đều khớp xác suất lý thuyết`, () => {
      for (const k of cacKhoaVat(ch)) {
        const lg = loiGiai(ch, k.khoa);
        expect(lg.xac_suat, `${ten} / ${k.khoa}`).toBe(k.xac_suat.toString());
        expect(lg.buoc.length).toBeGreaterThanOrEqual(2);
        expect(lg.de_hieu.length).toBeGreaterThanOrEqual(1);
        expect(lg.de_hieu.join(" ")).not.toContain("undefined");
        expect(lg.cong_thuc.length).toBeGreaterThan(5);
        expect(lg.ket_qua).toContain(k.xac_suat.toString());
      }
    });
  }

  it("bài 2 bi đỏ không hoàn lại giải bằng tổ hợp và nhắc cách nhân dần", () => {
    const lg = loiGiai({ loai: "bi", hop: [{ ten: "đỏ", so: 3 }, { ten: "xanh", so: 2 }], che_do: "phan_phoi", so_lay: 2, hoan_lai: false, mau_muc_tieu: "đỏ", theo_doi: ["2"], ...g }, "2");
    expect(lg.xac_suat).toBe("3/10");
    expect(lg.cong_thuc).toContain("C(3, 2)");
    expect(lg.luu_y).toContain("3/5 × 2/4");
  });

  it("tổng 7 của hai xúc xắc liệt kê đủ 6 cặp", () => {
    const lg = loiGiai({ loai: "xuc_xac", che_do: "phan_phoi", so_xuc_xac: 2, theo_doi: [7], ...g }, "7");
    expect(lg.xac_suat).toBe("1/6");
    expect(lg.buoc[1]!.phep_tinh![0]).toContain("(1, 6)");
    expect(lg.buoc[1]!.phep_tinh![1]).toContain("= 6");
  });
});
