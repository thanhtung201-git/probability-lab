// Các dạng điều kiện biến cố theo "Tổng hợp các dạng điều kiện biến cố trong bài toán xác suất lớp 9" (nhóm A–H).
// Mọi đáp án dưới đây được tính tay bằng cách đếm kết quả có thứ tự.
import { describe, expect, it } from "vitest";
import { bienCoTuAI, dieuKienTuAI, thieuBienCo, loiGiaiHocSinh, moTaBienCoBaiToan, xacSuatBaiToan, xayBaiMo, type BienCoBaiToan, type FormMo, type LocVat, type NguonMo } from "../src";

const the678: NguonMo = { kieu: "ds_so", text: "6 7 8" };
const xucXac: NguonMo = { kieu: "danh_so", n: 6 };
const so1099: NguonMo = { kieu: "day_so", tu: 10, den: 99, buoc: 1, loc: [] };

const dung = (nguon: NguonMo, bien_co: BienCoBaiToan, soLan: number, hoanLai: boolean, tenVat = "vật", phuDinh = false) => {
  const f: FormMo = { nguon, ten_vat: tenVat, so_lan: soLan, hoan_lai: hoanLai, bien_co, phu_dinh: phuDinh };
  const kq = xayBaiMo(f);
  if ("loi" in kq) throw new Error(kq.loi);
  return { ...kq.cau_hinh, seed: 1 };
};
const p = (...a: Parameters<typeof dung>) => xacSuatBaiToan(dung(...a)).toString();
const loi = (...a: Parameters<typeof dung>) => {
  const kq = xayBaiMo({ nguon: a[0], ten_vat: a[4] ?? "vật", so_lan: a[2], hoan_lai: a[3], bien_co: a[1], phu_dinh: a[5] ?? false });
  return "loi" in kq ? kq.loi : null;
};

/** Hai xúc xắc: 2 lần lấy có hoàn lại từ 1..6 (36 kết quả có thứ tự). */
const haiXX = (bc: BienCoBaiToan) => p(xucXac, bc, 2, true, "mặt xúc xắc");
const so = (dai_luong: Extract<BienCoBaiToan, { kieu: "so" }>["dai_luong"], dieu_kien: Extract<BienCoBaiToan, { kieu: "so" }>["dieu_kien"]): BienCoBaiToan => ({ kieu: "so", dai_luong, dieu_kien });

describe("mục 12: thẻ 6, 7, 8, lấy lần lượt 3 thẻ không hoàn lại (ví dụ chuẩn của tài liệu)", () => {
  const lay = (bc: BienCoBaiToan, phuDinh = false) => p(the678, bc, 3, false, "thẻ", phuDinh);
  it("thẻ số 8 được lấy cuối cùng → 2/6 = 1/3, không phải “giá trị bằng 8”", () => {
    expect(lay({ kieu: "vi_tri", lan: "cuoi", loc: { so: 8 } })).toBe("1/3");
    expect(lay(so("tong", { loai: "bang", k: 8 }))).toBe("0");
  });
  it("đầu tiên, lượt thứ 2, lượt thứ 3 đều 1/3", () => {
    expect(lay({ kieu: "vi_tri", lan: 1, loc: { so: 8 } })).toBe("1/3");
    expect(lay({ kieu: "vi_tri", lan: 2, loc: { so: 8 } })).toBe("1/3");
    expect(lay({ kieu: "vi_tri", lan: 3, loc: { so: 8 } })).toBe("1/3");
  });
  it("không ở vị trí xác định: 8 không được lấy cuối → 2/3", () => {
    expect(lay({ kieu: "vi_tri", lan: "cuoi", loc: { so: 8 }, khong: true })).toBe("2/3");
    expect(lay({ kieu: "vi_tri", lan: "cuoi", loc: { so: 8 } }, true)).toBe("2/3");
  });
  it("thẻ 6 được lấy trước thẻ 8 → 1/2; thẻ 8 lấy sau thẻ 6 là cùng biến cố", () => {
    expect(lay({ kieu: "truoc_sau", truoc: { so: 6 }, sau: { so: 8 } })).toBe("1/2");
  });
  it("đúng thứ tự 6, 7, 8 → 1/6; tăng dần → 1/6; giảm dần → 1/6", () => {
    expect(lay({ kieu: "dung_thu_tu", day: [{ so: 6 }, { so: 7 }, { so: 8 }] })).toBe("1/6");
    expect(lay({ kieu: "quan_he", loai: "tang_dan" })).toBe("1/6");
    expect(lay({ kieu: "quan_he", loai: "giam_dan" })).toBe("1/6");
  });
  it("lời giải nêu đúng điều kiện vị trí và kết luận 1/3", () => {
    const ch = dung(the678, { kieu: "vi_tri", lan: "cuoi", loc: { so: 8 } }, 3, false, "thẻ");
    expect(moTaBienCoBaiToan(ch)).toBe("thẻ số 8 được lấy cuối cùng");
    const lg = loiGiaiHocSinh(ch);
    expect(lg.xac_suat).toBe("1/3");
    expect(lg.buoc[2]!.dong.join(" ")).toContain("(6, 7, 8)");
    expect(lg.buoc[2]!.dong.join(" ")).toContain("Vậy có 2 kết quả thuận lợi");
  });
});

describe("nhóm A: so sánh giá trị, hai xúc xắc (36 kết quả)", () => {
  it("bằng / khác 8", () => {
    expect(haiXX(so("tong", { loai: "bang", k: 8 }))).toBe("5/36");
    expect(haiXX(so("tong", { loai: "khac", k: 8 }))).toBe("31/36");
  });
  it("> 8, < 8, ≥ 8, ≤ 8 phân biệt đúng", () => {
    expect(haiXX(so("tong", { loai: "lon_hon", k: 8 }))).toBe("5/18");
    expect(haiXX(so("tong", { loai: "nho_hon", k: 8 }))).toBe("7/12");
    expect(haiXX(so("tong", { loai: "lon_hon_hoac_bang", k: 8 }))).toBe("5/12");
    expect(haiXX(so("tong", { loai: "nho_hon_hoac_bang", k: 8 }))).toBe("13/18");
  });
  it("nằm trong đoạn 5..9 và nằm ngoài đoạn", () => {
    expect(haiXX(so("tong", { loai: "trong_doan", k: 5, k2: 9 }))).toBe("2/3");
    expect(haiXX(so("tong", { loai: "ngoai_doan", k: 5, k2: 9 }))).toBe("1/3");
  });
  it("dấu của hiệu: dương, âm, bằng 0", () => {
    expect(haiXX(so("hieu", { loai: "duong" }))).toBe("5/12");
    expect(haiXX(so("hieu", { loai: "am" }))).toBe("5/12");
    expect(haiXX(so("hieu", { loai: "bang", k: 0 }))).toBe("1/6");
  });
});

describe("nhóm B: đại lượng của nhiều kết quả", () => {
  it("hiệu tuyệt đối bằng 2 → 8/36", () => expect(haiXX(so("hieu_tuyet_doi", { loai: "bang", k: 2 }))).toBe("2/9"));
  it("tổng bình phương bằng 25 → (3,4),(4,3); bình phương của tổng bằng 25 → tổng 5", () => {
    expect(haiXX(so("tong_binh_phuong", { loai: "bang", k: 25 }))).toBe("1/18");
    expect(haiXX(so("binh_phuong_tong", { loai: "bang", k: 25 }))).toBe("1/9");
  });
  it("thương bằng 2: (2,1), (4,2), (6,3) → 3/36", () => expect(haiXX(so("thuong", { loai: "bang", k: 2 }))).toBe("1/12"));
  it("hai số bằng nhau / khác nhau", () => {
    expect(haiXX({ kieu: "quan_he", loai: "bang_nhau" })).toBe("1/6");
    expect(haiXX({ kieu: "quan_he", loai: "khac_nhau" })).toBe("5/6");
  });
  it("tích dương với số lấy ra có số 0", () => {
    expect(p({ kieu: "ds_so", text: "0 1 2 3" }, so("tich", { loai: "duong" }), 2, false)).toBe("1/2");
  });
});

describe("nhóm C: tính chất số học", () => {
  it("hợp số, không chia hết cho 3, ước của 12", () => {
    expect(haiXX(so("tong", { loai: "hop_so" }))).toBe("7/12");
    expect(haiXX(so("tong", { loai: "khong_chia_het", k: 3 }))).toBe("2/3");
    expect(haiXX(so("tong", { loai: "uoc_cua", k: 12 }))).toBe("1/3");
  });
  it("nguyên tố cùng nhau (ƯCLN = 1) → 23/36; cùng chẵn lẻ → 1/2", () => {
    expect(haiXX({ kieu: "quan_he", loai: "nguyen_to_cung_nhau" })).toBe("23/36");
    expect(haiXX({ kieu: "quan_he", loai: "cung_chan_le" })).toBe("1/2");
  });
});

describe("nhóm D: chữ số của số tạo thành (số 10 đến 99, 90 số)", () => {
  const hai = (dk: Extract<BienCoBaiToan, { kieu: "so" }>["dieu_kien"]) => p(so1099, so("tong", dk), 1, false, "số");
  it("chữ số tận cùng bằng 5 → 1/10; hàng chục bằng 3 → 1/9", () => {
    expect(hai({ loai: "tan_cung", d: 5 })).toBe("1/10");
    expect(hai({ loai: "hang_chuc", d: 3 })).toBe("1/9");
  });
  it("hàng chục là số chẵn → 4/9; hàng chục là số lẻ → 5/9", () => {
    expect(hai({ loai: "hang_chuc_chan" })).toBe("4/9");
    expect(hai({ loai: "hang_chuc_le" })).toBe("5/9");
  });
  it("tổng chữ số bằng 9, số đối xứng, hai chữ số khác nhau", () => {
    expect(hai({ loai: "tong_chu_so", k: 9 })).toBe("1/10");
    expect(hai({ loai: "doi_xung" })).toBe("1/10");
    expect(hai({ loai: "chu_so_khac_nhau" })).toBe("9/10");
  });
});

describe("nhóm E: đếm số lượng (thẻ 1..5, lấy 3 không hoàn lại, 10 tập con)", () => {
  const the5: NguonMo = { kieu: "danh_so", n: 5 };
  const chan: LocVat = { dk: { loai: "chan" } };
  const dem = (so_sanh: "bang" | "it_nhat" | "nhieu_nhat" | "trong_doan" | "tat_ca", k: number, k2?: number, loc = chan) =>
    p(the5, { kieu: "dem", loc, so_sanh, k, ...(k2 !== undefined ? { k2 } : {}) }, 3, false, "thẻ");
  it("ít nhất 1 / đúng 1 / nhiều nhất 1 số chẵn: phân biệt", () => {
    expect(dem("it_nhat", 1)).toBe("9/10");
    expect(dem("bang", 1)).toBe("3/5");
    expect(dem("nhieu_nhat", 1)).toBe("7/10");
  });
  it("từ 1 đến 2 số chẵn; không có lần nào (đúng 0)", () => {
    expect(dem("trong_doan", 1, 2)).toBe("9/10");
    expect(dem("bang", 0)).toBe("1/10");
  });
  it("tất cả các thẻ đều lẻ → 1/10; tất cả đều chẵn → 0; không phải tất cả đều chẵn → 1", () => {
    expect(dem("tat_ca", 0, undefined, { dk: { loai: "le" } })).toBe("1/10");
    expect(dem("tat_ca", 0)).toBe("0");
    expect(p(the5, { kieu: "dem", loc: chan, so_sanh: "tat_ca", k: 0, khong: true }, 3, false, "thẻ")).toBe("1");
  });
  it("số bi đỏ bằng số bi xanh khi lấy 2 bi từ 2 đỏ 2 xanh → 2/3", () => {
    expect(p({ kieu: "theo_mau", nhom: "đỏ 2, xanh 2" }, { kieu: "dem_bang", a: { mau: "đỏ" }, b: { mau: "xanh" } }, 2, false, "bi")).toBe("2/3");
  });
});

describe("nhóm F: liên tiếp và thứ tự khi tung đồng xu", () => {
  const dongXu: NguonMo = { kieu: "theo_mau", nhom: "ngửa 1, sấp 1" };
  it("tung 3 lần có 2 lần liên tiếp ngửa → HHH, HHT, THH = 3/8", () => {
    expect(p(dongXu, { kieu: "lien_tiep", loc: { mau: "ngửa" }, k: 2 }, 3, true, "mặt đồng xu")).toBe("3/8");
  });
  it("lần đầu ngửa, lần cuối sấp → 1/4", () => {
    const bc: BienCoBaiToan = {
      kieu: "gop",
      phep: "va",
      cac: [
        { kieu: "vi_tri", lan: 1, loc: { mau: "ngửa" } },
        { kieu: "vi_tri", lan: "cuoi", loc: { mau: "sấp" } },
      ],
    };
    expect(p(dongXu, bc, 3, true, "mặt đồng xu")).toBe("1/4");
  });
});

describe("nhóm H: kết hợp logic (một xúc xắc)", () => {
  const chiaHet = (k: number): BienCoBaiToan => so("tong", { loai: "chia_het", k });
  const mot = (bc: BienCoBaiToan) => p(xucXac, bc, 1, false, "mặt xúc xắc");
  it("XOR: chia hết cho 2 hoặc 3 nhưng không đồng thời → {2, 3, 4} = 1/2", () => {
    expect(mot({ kieu: "gop", phep: "xor", cac: [chiaHet(2), chiaHet(3)] })).toBe("1/2");
  });
  it("AND NOT: chia hết cho 2 nhưng không chia hết cho 3 → {2, 4} = 1/3", () => {
    expect(mot({ kieu: "gop", phep: "va", cac: [chiaHet(2), { ...chiaHet(3), khong: true } as BienCoBaiToan] })).toBe("1/3");
  });
  it("NOT(A AND B) khác (NOT A AND NOT B): 5/6 và 1/3", () => {
    expect(mot({ kieu: "gop", phep: "va", cac: [chiaHet(2), chiaHet(3)], khong: true })).toBe("5/6");
    expect(mot({ kieu: "gop", phep: "va", cac: [{ ...chiaHet(2), khong: true } as BienCoBaiToan, { ...chiaHet(3), khong: true } as BienCoBaiToan] })).toBe("1/3");
  });
  it("nhóm lồng nhau (A AND B) OR C: ((chia hết 2 và 3) hoặc bằng 1) → {6, 1} = 1/3", () => {
    const trong: BienCoBaiToan = { kieu: "gop", phep: "va", cac: [chiaHet(2), chiaHet(3)] };
    expect(mot({ kieu: "gop", phep: "hoac", cac: [trong, so("tong", { loai: "bang", k: 1 })] })).toBe("1/3");
  });
});

describe("mục 14: các cặp dễ nhầm phải cho kết quả khác nhau", () => {
  const motXX = (dk: Extract<BienCoBaiToan, { kieu: "so" }>["dieu_kien"]) => p(xucXac, so("tong", dk), 1, false, "mặt xúc xắc");
  it("không quá 3 (≤ 3) khác nhỏ hơn 3", () => {
    expect(motXX({ loai: "nho_hon_hoac_bang", k: 3 })).toBe("1/2");
    expect(motXX({ loai: "nho_hon", k: 3 })).toBe("1/3");
  });
  it("tổng bằng 8 khác có một thẻ số 8 (thẻ 6, 7, 8 lấy 2 thẻ)", () => {
    expect(p(the678, so("tong", { loai: "bang", k: 8 }), 2, false, "thẻ")).toBe("0");
    expect(p(the678, { kieu: "dem", loc: { so: 8 }, so_sanh: "it_nhat", k: 1 }, 2, false, "thẻ")).toBe("2/3");
  });
  it("hai số khác nhau khác hiệu tuyệt đối bằng 1", () => {
    expect(haiXX({ kieu: "quan_he", loai: "khac_nhau" })).toBe("5/6");
    expect(haiXX(so("hieu_tuyet_doi", { loai: "bang", k: 1 }))).toBe("5/18");
  });
});

describe("kiểm tra hợp lệ trước khi tính (mục 13, bước 3)", () => {
  it("lần lấy vượt số lần lấy", () => expect(loi(the678, { kieu: "vi_tri", lan: 4, loc: { so: 8 } }, 3, false)).toContain("lần thứ 4"));
  it("hiệu chỉ dùng khi lấy 2 vật", () => expect(loi(xucXac, so("hieu", { loai: "duong" }), 3, true)).toContain("Hiệu và thương"));
  it("dãy thứ tự phải đủ số lần lấy", () => expect(loi(the678, { kieu: "dung_thu_tu", day: [{ so: 6 }, { so: 7 }] }, 3, false)).toContain("đúng 3 phần tử"));
  it("số không có trong tập vật", () => expect(loi(the678, { kieu: "vi_tri", lan: 1, loc: { so: 9 } }, 3, false)).toContain("Không có vật nào ghi số 9"));
  it("đoạn bị ngược", () => expect(loi(xucXac, so("tong", { loai: "trong_doan", k: 9, k2: 5 }), 2, true)).toContain("bị ngược"));
  it("bộ lọc rỗng", () => expect(loi(the678, { kieu: "vi_tri", lan: 1, loc: {} }, 3, false)).toContain("chỉ rõ loại vật"));
});

describe("chuyển kết quả AI (các trường phẳng) thành biến cố", () => {
  const trong = { mau: null, so: null, dk: null };
  const goc = { dai_luong: null, dk: null, mau_loai: null, mau: null, k_mau: null, quan_he: null, loc: null, loc2: null, day: [], so_sanh: null, k_dem: null, k_dem2: null, lan: null, khong: false };
  it("“thẻ số 8 được lấy cuối cùng” → vi_tri, lan = 0 là lần cuối, P = 1/3", () => {
    const bc = bienCoTuAI({ ...goc, kieu: "vi_tri", lan: 0, loc: { ...trong, so: 8 } });
    expect(bc).toEqual({ kieu: "vi_tri", lan: "cuoi", loc: { so: 8 } });
    expect(p(the678, bc, 3, false, "thẻ")).toBe("1/3");
  });
  it("“ít nhất 2 số chẵn” → dem it_nhat; “từ 1 đến 2” có k2", () => {
    const chan = { ...trong, dk: { loai: "chan" as const, k: null, k2: null, m: null, r: null, d: null, khong: false } };
    expect(bienCoTuAI({ ...goc, kieu: "dem", so_sanh: "it_nhat", k_dem: 2, loc: chan })).toEqual({ kieu: "dem", loc: { dk: { loai: "chan" } }, so_sanh: "it_nhat", k: 2 });
    expect(bienCoTuAI({ ...goc, kieu: "dem", so_sanh: "trong_doan", k_dem: 1, k_dem2: 2, loc: chan })).toMatchObject({ k: 1, k2: 2 });
  });
  it("điều kiện thiếu tham số vẫn ra giá trị hợp lệ; trong đoạn lấy k2 = k khi AI quên", () => {
    expect(dieuKienTuAI({ loai: "chia_het", k: null, k2: null, m: null, r: null, d: null, khong: false })).toEqual({ loai: "chia_het", k: 1 });
    expect(dieuKienTuAI({ loai: "trong_doan", k: 5, k2: null, m: null, r: null, d: null, khong: false })).toEqual({ loai: "trong_doan", k: 5, k2: 5 });
  });
  it("kiểu “mau” lấy màu đầu tiên khi AI quên điền màu; dãy thứ tự giữ nguyên", () => {
    expect(bienCoTuAI({ ...goc, kieu: "mau", mau_loai: "it_nhat" }, "nữ")).toEqual({ kieu: "mau", loai: "it_nhat", mau: "nữ" });
    const day = [6, 7, 8].map((so) => ({ ...trong, so }));
    expect(p(the678, bienCoTuAI({ ...goc, kieu: "dung_thu_tu", day }), 3, false, "thẻ")).toBe("1/6");
  });
});

describe("phát hiện AI điền thiếu (không tự đoán)", () => {
  const trong = { mau: null, so: null, dk: null };
  const goc = { dai_luong: null, dk: null, mau_loai: null, mau: null, k_mau: null, quan_he: null, loc: null, loc2: null, day: [], so_sanh: null, k_dem: null, k_dem2: null, lan: null, khong: false };
  it("kiểu “so” mà không có điều kiện (AI đặt nhầm vào chỗ khác) → báo thiếu", () => {
    expect(thieuBienCo({ ...goc, kieu: "so", dai_luong: "tong", day: [{ ...trong, dk: { loai: "hang_chuc_chan", k: null, k2: null, m: null, r: null, d: null, khong: false } }] })).toContain("thiếu điều kiện");
  });
  it("vi_tri thiếu loại vật hoặc lần lấy → báo thiếu; đủ thì null", () => {
    expect(thieuBienCo({ ...goc, kieu: "vi_tri", lan: 0, loc: trong })).toContain("thiếu");
    expect(thieuBienCo({ ...goc, kieu: "vi_tri", loc: { ...trong, so: 8 } })).toContain("thiếu");
    expect(thieuBienCo({ ...goc, kieu: "vi_tri", lan: 0, loc: { ...trong, so: 8 } })).toBeNull();
  });
  it("dung_thu_tu có phần tử rỗng → báo thiếu", () => {
    expect(thieuBienCo({ ...goc, kieu: "dung_thu_tu", day: [{ ...trong, so: 6 }, trong] })).toContain("chưa đầy đủ");
  });
});
